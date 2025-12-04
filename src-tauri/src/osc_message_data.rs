use serde::Serialize;
use rosc;

#[derive(Serialize, Clone, Debug)]
pub struct OscMessageData {
    pub address: String,
    pub args: Vec<OscArgData>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(tag = "type", content = "value")]
pub enum OscArgData {
    Int(i32),
    Float(f32),
    String(String),
    Blob(Vec<u8>),
    Bool(bool),
    Nil,
    Inf,
}

impl From<&rosc::OscMessage> for OscMessageData {
    fn from(msg: &rosc::OscMessage) -> Self {
        OscMessageData {
            address: msg.addr.clone(),
            args: msg.args.iter().map(|arg| arg.into()).collect(),
        }
    }
}

impl From<&rosc::OscType> for OscArgData {
    fn from(arg: &rosc::OscType) -> Self {
        match arg {
            rosc::OscType::Int(i) => OscArgData::Int(*i),
            rosc::OscType::Float(f) => OscArgData::Float(*f),
            rosc::OscType::String(s) => OscArgData::String(s.clone()),
            rosc::OscType::Blob(b) => OscArgData::Blob(b.clone()),
            rosc::OscType::Bool(b) => OscArgData::Bool(*b),
            rosc::OscType::Nil => OscArgData::Nil,
            rosc::OscType::Inf => OscArgData::Inf,
            _ => unimplemented!("OSC type not supported"),
        }
    }
}