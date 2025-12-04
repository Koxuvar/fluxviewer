// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{Emitter, Manager};
mod protocols;
mod osc_listener;
mod sacn_listener;
mod osc_message_data;

#[tauri::command]
fn sacn_subscribe_universe(
    universe: u16,
    cmd_tx: tauri::State<'_, std::sync::mpsc::Sender<crate::protocols::SacnUniverserCommand>>
) {
    cmd_tx.send(crate::protocols::SacnUniverserCommand::SubscribeUniverse(universe)).unwrap();
}

#[tauri::command]
fn sacn_unsubscribe_universe(
    universe: u16,
    cmd_tx: tauri::State<'_, std::sync::mpsc::Sender<protocols::SacnUniverserCommand>>
) {
    cmd_tx.send(protocols::SacnUniverserCommand::UnsubscribeUniverse(universe)).unwrap();
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let (osc_tx, osc_rx) = std::sync::mpsc::channel();
            let (sacn_tx, sacn_rx) = std::sync::mpsc::channel();
            let (cmd_tx, cmd_rx) = std::sync::mpsc::channel();

            std::thread::spawn(move || {
                crate::osc_listener::start(osc_tx);
            });
            std::thread::spawn(move || {
                crate::sacn_listener::start(sacn_tx, cmd_rx);
            });

            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                while let Ok(osc_data) = osc_rx.recv() {
                    app_handle.emit("osc_data", &osc_data).unwrap();
                }
            });

            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                while let Ok(dmx_data) = sacn_rx.recv() {
                    app_handle.emit("dmx-universe-data", &dmx_data).unwrap();
                }
            });

            app.manage(cmd_tx);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![sacn_subscribe_universe, sacn_unsubscribe_universe])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}