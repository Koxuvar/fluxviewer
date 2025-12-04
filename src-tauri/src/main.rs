// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{sync::mpsc, thread};

mod osc_listener;
mod sacn_listener;
mod protocols;
fn main() {
  
    let (osc_tx, _osc_rxc) = mpsc::channel();
    let (sacn_tx, _sacn_rx) = mpsc::channel();
    let (_cmd_tx, cmd_rx) = mpsc::channel();

    thread::spawn(move || {
        osc_listener::start(osc_tx);
    });
    thread::spawn(move || {
        sacn_listener::start(sacn_tx, cmd_rx);
    });

    fluxviewer_lib::run();
}
