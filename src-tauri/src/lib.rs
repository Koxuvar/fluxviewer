// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{Emitter, Manager};
mod protocols;
mod osc_listener;
mod sacn_listener;
mod osc_message_data;
mod serial_listener;

struct AppState {
    osc_cmd_tx: std::sync::mpsc::Sender<protocols::OscCommand>,
    sacn_cmd_tx: std::sync::mpsc::Sender<protocols::SacnCommand>,
    serial_cmd_tx: std::sync::mpsc::Sender<protocols::SerialCommand>,
}

#[tauri::command]
fn osc_start_listener(ip: String, port: u16, state: tauri::State<'_, AppState>) -> Result<(), String>{
    state.osc_cmd_tx
        .send(protocols::OscCommand::Start { ip, port })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn osc_stop_listener(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.osc_cmd_tx
        .send(protocols::OscCommand::Stop)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn sacn_start_listener(ip: String, state: tauri::State<'_, AppState>) -> Result<(), String>{
    state.sacn_cmd_tx
        .send(protocols::SacnCommand::Start { ip })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn sacn_stop_listener(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.sacn_cmd_tx
        .send(protocols::SacnCommand::Stop)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn sacn_subscribe_universe(universe: u16, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.sacn_cmd_tx
        .send(protocols::SacnCommand::SubscribeUniverse(universe))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn sacn_unsubscribe_universe(universe: u16, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.sacn_cmd_tx
        .send(protocols::SacnCommand::UnsubscribeUniverse(universe))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn serial_start_listener(port: String, baud_rate: u32, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.serial_cmd_tx
        .send(protocols::SerialCommand::Start { port, baud_rate })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn serial_stop_listener(state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.serial_cmd_tx
        .send(protocols::SerialCommand::Stop)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn serial_list_ports() -> Vec<protocols::SerialPortInfo> {
    serial_listener::list_ports()
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let (osc_tx, osc_rx) = std::sync::mpsc::channel::<protocols::OscData>();
            let (sacn_tx, sacn_rx) = std::sync::mpsc::channel::<protocols::DmxData>();

            let (osc_cmd_tx, osc_cmd_rx) = std::sync::mpsc::channel::<protocols::OscCommand>();
            let (sacn_cmd_tx, sacn_cmd_rx) = std::sync::mpsc::channel::<protocols::SacnCommand>();

            let (serial_tx, serial_rx) = std::sync::mpsc::channel::<protocols::SerialData>();
            let (serial_cmd_tx, serial_cmd_rx) = std::sync::mpsc::channel::<protocols::SerialCommand>();

            std::thread::spawn(move || {
                osc_listener::start(osc_tx, osc_cmd_rx);
            });
            std::thread::spawn(move || {
               sacn_listener::start(sacn_tx, sacn_cmd_rx);
            });

            std::thread::spawn(move || {
               serial_listener::start(serial_tx, serial_cmd_rx);
            });

            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                while let Ok(osc_data) = osc_rx.recv() {
                    let _ = app_handle.emit("osc-message", &osc_data);
                }
            });

            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                while let Ok(dmx_data) = sacn_rx.recv() {
                    let _ = app_handle.emit("dmx-universe-data", &dmx_data);
                }
            });

            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                while let Ok(serial_data) = serial_rx.recv() {
                    let _ = app_handle.emit("serial-data", &serial_data);
                }
            });

            app.manage(AppState {
                osc_cmd_tx,
                sacn_cmd_tx,
                serial_cmd_tx,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sacn_subscribe_universe,
            sacn_unsubscribe_universe,
            sacn_start_listener,
            sacn_stop_listener,
            osc_start_listener,
            osc_stop_listener,
            serial_start_listener,
            serial_stop_listener,
            serial_list_ports,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}