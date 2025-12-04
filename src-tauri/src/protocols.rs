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