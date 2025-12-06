use std::sync::mpsc::{Receiver, Sender};
use std::time::Duration;
use std::io::Read;
use chrono::Local;
use serialport;

use crate::protocols::{SerialData, SerialCommand};

pub fn start(tx: Sender<SerialData>, command_rx: Receiver<SerialCommand>) {
    let mut port: Option<Box<dyn serialport::SerialPort>> = None;
    let mut buf: [u8; 256] = [0u8; 256];

    loop {
        // Check for commands
        match command_rx.try_recv() {
            Ok(SerialCommand::Start { port: port_name, baud_rate }) => {
                match serialport::new(&port_name, baud_rate)
                    .timeout(Duration::from_millis(100))
                    .open()
                {
                    Ok(p) => {
                        port = Some(p);
                        println!("Serial port opened: {} @ {} baud", port_name, baud_rate);
                    }
                    Err(e) => {
                        eprintln!("Failed to open serial port {}: {}", port_name, e);
                        port = None;
                    }
                }
            }
            Ok(SerialCommand::Stop) => {
                port = None;
                println!("Serial port closed");
            }
            Err(_) => {}
        }

        // Read from port if open
        if let Some(ref mut p) = port {
            match p.read(&mut buf) {
                Ok(bytes_read) if bytes_read > 0 => {
                    let data = &buf[..bytes_read];
                    let timestamp = Local::now().format("%H:%M:%S%.3f").to_string();
                    
                    let hex = data.iter()
                        .map(|b| format!("{:02X}", b))
                        .collect::<Vec<_>>()
                        .join(" ");
                    
                    let ascii = data.iter()
                        .map(|&b| {
                            if b >= 0x20 && b <= 0x7E {
                                b as char
                            } else {
                                '.'
                            }
                        })
                        .collect::<String>();

                    tx.send(SerialData {
                        timestamp,
                        bytes: data.to_vec(),
                        hex,
                        ascii,
                    }).ok();
                }
                Ok(_) => {} // No data
                Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => {}
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {}
                Err(e) => {
                    eprintln!("Serial read error: {}", e);
                }
            }
        } else {
            std::thread::sleep(Duration::from_millis(100));
        }
    }
}

pub fn list_ports() -> Vec<String> {
    serialport::available_ports()
        .unwrap_or_default()
        .iter()
        .map(|p| p.port_name.clone())
        .collect()
}