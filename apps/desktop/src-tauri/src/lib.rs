#[cfg(feature = "desktop-runtime")]
pub mod app_state;
#[cfg(feature = "desktop-runtime")]
pub mod bootstrap;
#[cfg(feature = "desktop-runtime")]
pub mod command_support;
#[cfg(feature = "desktop-runtime")]
pub mod commands;
pub mod error;
pub mod security;
pub mod services;

#[cfg(feature = "desktop-runtime")]
pub use command_support::QueryRecommendation;
pub use error::AppError;

#[cfg(feature = "desktop-runtime")]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    bootstrap::build_application()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
