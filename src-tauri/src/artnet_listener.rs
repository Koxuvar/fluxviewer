use std::sync::mpsc;
use std::net::UdpSocket;
use std::time::Duration;
use std::collections::HashSet;
use artnet_protocol::ArtCommand;

use crate::protocols;

pub fn start(tx: mpsc::Sender<protocols::DmxData>, command_rx: mpsc::Receiver<protocols::ArtnetCommand>) {
    let mut socket: Option<UdpSocket> = None;
    let mut subscribed_universes: HashSet<u16> = HashSet::new();
    let mut buf = [0u8; 1024];

    loop{
        match command_rx.try_recv() {
            Ok(protocols::ArtnetCommand::Start { ip }) => {
                let addr = format!("{}:6454", ip);
                match UdpSocket::bind(addr) {
                    Ok(s) => {
                        s.set_read_timeout(Some(Duration::from_millis(100))).unwrap();
                        socket = Some(s);
                    },
                    Err(e) => {
                        eprintln!("Failed to bind to Art-Net socket: {}", e);
                        socket = None;
                    }
                }
            }
            Ok(protocols::ArtnetCommand::Stop) => {
                socket = None;
                subscribed_universes.clear();
                println!("Art-Net listener stopped.");
            }
            Ok(protocols::ArtnetCommand::SubscribeUniverse(universe)) => {
                subscribed_universes.insert(universe);
                println!("Subscribed to Art-Net universe {}", universe);
            }
            Ok(protocols::ArtnetCommand::UnsubscribeUniverse(universe)) => {
                subscribed_universes.remove(&universe);
                println!("Unsubscribed from Art-Net universe {}", universe);
            }
            Err(_) => {}
        }


        if let Some(ref s) = socket {
            match s.recv_from(&mut buf) {
                Ok((length, _src)) => {
                    if let Ok(command) = ArtCommand::from_buffer(&buf[..length]) {
                        if let ArtCommand::Output(output) = command {
                            let universe= output.port_address.into();

                            if subscribed_universes.contains(&universe) {
                                let mut channels = vec![0u8; 512];
                                let data_len = output.data.as_ref().len().min(512);
                                channels[..data_len].copy_from_slice(&output.data.as_ref()[..data_len]);

                                tx.send(protocols::DmxData {
                                    universe,
                                    channels,
                                }).ok();
                            }
                        }
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    // Timeout reached, no data received
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => {
                    // Timeout reached, no data received
                }
                Err(e) => {
                    eprintln!("Error receiving Art-Net data: {}", e);
                }
            }
        } else {
                std::thread::sleep(Duration::from_millis(100));
        }
    }
}