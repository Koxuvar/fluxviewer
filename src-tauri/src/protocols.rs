use rosc::OscMessage;
use std::net::SocketAddr;

pub struct DmxData {
    pub universe: u16,
    pub channels: Vec<u8>,
    pub _timestamp: String,
}

pub struct OscData {
    pub message: OscMessage,
    pub timestamp: String,
    pub sender: SocketAddr,
}

pub enum SacnUniverserCommand {
    SubscribeUniverse(u16),
    UnsubscribeUniverse(u16),
}