use serde::Serialize;
use crate::osc_message_data::OscMessageData;


#[derive(Serialize, Clone)]
pub struct DmxData {
    pub universe: u16,
    pub channels: Vec<u8>,
    pub _timestamp: String,
}

#[derive(Serialize, Clone)]
pub struct OscData {
    pub message: OscMessageData,
    pub timestamp: String,
    pub sender: String,
}

pub enum SacnUniverserCommand {
    SubscribeUniverse(u16),
    UnsubscribeUniverse(u16),
}