use std::{sync::mpsc, time::Duration};
use chrono::Local;
use sacn::receive::SacnReceiver;
use crate::protocols;

pub fn start(tx: mpsc::Sender<protocols::DmxData>, command_rx: mpsc::Receiver<protocols::SacnCommand>) {

    let mut receiver: Option<SacnReceiver> = None;

    loop {
        match command_rx.try_recv() {
            Ok(protocols::SacnCommand::Start {ip}) => {
                let addr = format!("{}:5568", ip);
                match SacnReceiver::with_ip(
                    addr.parse().expect("Invalid IP address"),
                    None,
                ) {
                    Ok(r) => {
                        receiver = Some(r);
                        println!("sACN Listener started on {}", addr);
                    }
                    Err(e) => {
                        eprintln!("Failed to start sACN Listener on {}: {}", addr, e);
                        receiver = None;
                    }
                }
            }
            Ok(protocols::SacnCommand::Stop) => {
                receiver = None;
                println!("sACN Listener stopped");
            }
            Ok(protocols::SacnCommand::SubscribeUniverse(u)) => {
                if let Some(ref mut r) = receiver {
                    match r.listen_universes(&[u]) {
                        Ok(_) => println!("Subscribed to universe {}", u),
                        Err(e) => eprintln!("Failed to subscribe to universe {}: {}", u, e),
                    }
                }
            }
            Ok(protocols::SacnCommand::UnsubscribeUniverse(u)) => {
                if let Some(ref mut r) = receiver {
                    match r.mute_universe(u) {
                        Ok(_) => println!("Unsubscribed from universe {}", u),
                        Err(e) => eprintln!("Failed to unsubscribe from universe {}: {}", u, e),
                    }
                }
            }
            Err(_) => {}
        }

        if let Some(ref mut r)  = receiver {
            match r.recv(Some(Duration::from_millis(100))) {
                Ok(packets) => {
                    let _timestamp = Local::now().format("%H:%M:%S%.3f").to_string();
                    
                    for packet in packets {
                        tx.send(protocols::DmxData {
                            universe: packet.universe,
                            channels: packet.values[1..].to_vec(),
                        }).unwrap();
                    }
                }
                Err(e) => {
                    let error_str = e.to_string();
                    if !error_str.contains("timeout") && !error_str.contains("No data") {
                        eprintln!("Error receiving SACN packet: {}", e);
                    }
               }
            }
        } else {
            std::thread::sleep(Duration::from_millis(100));
        }
    }
}