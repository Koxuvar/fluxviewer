
use std::sync::mpsc;
use rosc;
use std::net::UdpSocket;
use chrono::Local;

use crate::protocols::OscData;

pub fn start(tx: mpsc::Sender<OscData>) {
    let socket = UdpSocket::bind("0.0.0.0:8000").expect("Could not bind to UDP socket on port 8000");
    println!("OSC Listener started on port 8000");

    let mut buf = [0u8; 1024];

    loop {
        match socket.recv_from(&mut buf) {
            Ok((num_byts, source_addr)) => {

                match rosc::decoder::decode_udp(&buf[..num_byts]) {
                    Ok((_, packet)) => {

                        let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

                        match packet {
                            rosc::OscPacket::Message(msg)  => {
                                tx.send(OscData {
                                    message: msg,
                                    timestamp,
                                    sender: source_addr,
                                }).unwrap();
                            },
                            rosc::OscPacket::Bundle(bundle) => {
                                for message in bundle.content {
                                    match message {
                                        rosc::OscPacket::Message(msg) => {
                                            tx.send(OscData {
                                                message:msg,
                                                timestamp: timestamp.clone(),
                                                sender: source_addr,
                                            }).unwrap();
                                        },
                                        rosc::OscPacket::Bundle(_nested_bundle) => {
                                            // Nested bundles are not handled  
                                        }
                                    }
                                }
                            }
                        }
                    },
                    Err(e) => {
                        eprintln!("Error decoding OSC packet: {}", e);
                    }
                }
            },
            Err(e) => {
                eprintln!("Error receiving from UDP socket: {}", e);
            }
        }
    }
}