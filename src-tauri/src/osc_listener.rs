
use std::sync::mpsc;
use rosc;
use std::net::UdpSocket;
use chrono::Local;
use std::time::Duration;
use crate::protocols::{OscData, OscCommand};
use crate::osc_message_data::{OscMessageData, OscArgData};

pub fn start(tx: mpsc::Sender<OscData>, command_rx: mpsc::Receiver<OscCommand>) {
    let mut socket: Option<UdpSocket> = None;
    let mut buf: [u8; 1024] = [0u8; 1024];
    loop{
        match command_rx.try_recv() {
            Ok(OscCommand::Start { ip, port}) => {
                let addr = format!("{}:{}", ip, port);
                match UdpSocket::bind(&addr) {
                    Ok(s) => {
                        s.set_read_timeout(Some(Duration::from_millis(100))).ok();
                        socket = Some(s);
                        println!("OSC Listener started on {}", addr);
                    },
                    Err(e) => {
                        eprintln!("Failed to bind OSC Listener to {}: {}", addr, e);
                        socket = None;
                    }
                }
            },
            Ok(OscCommand::Stop) => {
                socket = None;
                println!("OSC Listener stopped");
            },
            Err(_) => {}
        }

        if let Some(ref s) = socket {
            match s.recv_from(&mut buf) {
                Ok((num_bytes, source_addr)) => {
                    match rosc::decoder::decode_udp(&buf[..num_bytes]) {
                        Ok((_, packet)) => {
                            let timestamp = Local::now().format("%H:%M:%S%.3f").to_string();
                            process_packet(packet, &tx, &timestamp, source_addr.to_string());
                        }
                        Err(e) => {
                            eprintln!("Error decoding OSC packet: {}", e);
                        }
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    // Timeout reached, continue to next iteration
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut=> {
                    // Interrupted, continue to next iteration
                }
                Err(e) => {
                    eprintln!("Error receiving from UDP socket: {}", e);
                }   
            }
        } else {
            std::thread::sleep(Duration::from_millis(100));
        }
    }
}

fn process_packet(packet: rosc::OscPacket, tx: &mpsc::Sender<OscData>, timestamp: &str, sender: String) {
    match packet {
        rosc::OscPacket::Message(msg) => {
            send_message(&msg, tx, timestamp, sender);
        }
        rosc::OscPacket::Bundle(bundle) => {
            for content in bundle.content {
                match content {
                    rosc::OscPacket::Message(msg) => {
                        send_message(&msg, tx, timestamp, sender.clone());
                    }
                    rosc::OscPacket::Bundle(_) => {
                        // Nested bundles not handled
                    }
                }
            }
        }
    }
}

fn send_message(msg: &rosc::OscMessage, tx: &mpsc::Sender<OscData>, timestamp: &str, sender: String) {
    let args: Vec<OscArgData> = msg.args.iter().map(|arg| {
        match arg {
            rosc::OscType::Int(v) => OscArgData::Int(*v),
            rosc::OscType::Float(v) => OscArgData::Float(*v),
            rosc::OscType::String(v) => OscArgData::String(v.clone()),
            rosc::OscType::Bool(v) => OscArgData::Bool(*v),
            rosc::OscType::Nil => OscArgData::Nil,
            other => OscArgData::String(format!("{:?}", other)),
        }
    }).collect();

    tx.send(OscData {
        message: OscMessageData {
            address: msg.addr.clone(),
            args,
        },
        timestamp: timestamp.to_string(),
        sender,
    }).unwrap();
}