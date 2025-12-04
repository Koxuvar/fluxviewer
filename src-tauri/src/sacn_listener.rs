use std::{sync::mpsc, time::Duration};
use chrono::Local;
use sacn::receive::SacnReceiver;

use crate::protocols::{DmxData, SacnUniverserCommand};

pub fn start(tx: mpsc::Sender<DmxData>, command_rx: mpsc::Receiver<SacnUniverserCommand>) {

    let mut receiver = SacnReceiver::with_ip(
        "0.0.0.0:5568".parse().unwrap(),
        None
        ).expect("Failed to create SACN Receiver");

    loop{
        while let Ok(cmd) = command_rx.try_recv() {
            match cmd {
                SacnUniverserCommand::SubscribeUniverse(u) => {
                    receiver.listen_universes(&[u]).expect("Failed to subscribe to universe");
                    println!("Subscribed to universe {}", u);
                },
                SacnUniverserCommand::UnsubscribeUniverse(u) => {
                    receiver.mute_universe(u).expect("Failed to unsubscribe from universe");
                    println!("Unsubscribed from universe {}", u);
                }
            }
        }

        match receiver.recv( Some(Duration::from_millis(100))) {
            Ok(packets) => {
                let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

                for packet in packets {
                    tx.send(DmxData {
                        universe: packet.universe,
                        channels: packet.values[1..].to_vec(),
                        _timestamp: timestamp.clone(),
                    }).unwrap();
                }
            },
            Err(e) => {
                let error_str = e.to_string();
                if !error_str.contains("timeout") && !error_str.contains("No data") {
                    eprintln!("Error receiving SACN packet: {}", e);
                }
            }
        }
    }
}