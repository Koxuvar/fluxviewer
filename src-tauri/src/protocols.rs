use serde::Serialize;
use crate::osc_message_data::OscMessageData;


#[derive(Serialize, Clone)]
pub struct DmxData {
    pub universe: u16,
    pub channels: Vec<u8>,
}

#[derive(Serialize, Clone)]
pub struct OscData {
    pub message: OscMessageData,
    pub timestamp: String,
    pub sender: String,
}

#[derive(Serialize, Clone)]
pub struct SerialData {
    pub timestamp: String,
    pub bytes: Vec<u8>,
    pub hex: String,
    pub ascii: String,
}

#[derive(Serialize, Clone)]
pub struct SerialPortInfo {
    pub name: String,
    pub description: String,
}

pub enum SerialCommand {
    Start { port: String, baud_rate: u32 },
    Stop,
}

pub enum SacnCommand{
    Start {ip: String},
    Stop,
    SubscribeUniverse(u16),
    UnsubscribeUniverse(u16),
}

pub enum OscCommand {
    Start { ip: String, port: u16 },
    Stop,
}

pub enum ArtnetCommand {
    Start { ip: String },
    Stop,
    SubscribeUniverse(u16),
    UnsubscribeUniverse(u16),
}