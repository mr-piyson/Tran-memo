use serde::{Deserialize, Serialize};
use tauri::{
    Runtime,
    plugin::{Builder, TauriPlugin},
};
#[cfg(mobile)]
use tauri::{Manager, plugin::PluginHandle};

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_contacts);

/// A contact read from the device address book.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeContact {
    pub name: String,
    pub phone: String,
    pub email: String,
}

#[cfg(mobile)]
struct Contacts<R: Runtime>(PluginHandle<R>);

#[tauri::command]
fn load_native_contacts<R: Runtime>(app: tauri::AppHandle<R>) -> Result<Vec<NativeContact>, String> {
    #[cfg(mobile)]
    {
        let handle = app
            .try_state::<Contacts<R>>()
            .ok_or_else(|| "contacts plugin is not initialized".to_string())?;
        handle
            .0
            .run_mobile_plugin("loadNativeContacts", ())
            .map_err(|error| error.to_string())
    }

    #[cfg(desktop)]
    {
        let _ = app;
        // Desktop address books are platform-specific; the frontend offers a
        // vCard import instead, which works on macOS, Windows and Linux.
        Ok(Vec::new())
    }
}

/// Initializes the contacts plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("contacts")
        .setup(|_app, _api| {
            #[cfg(mobile)]
            {
                let (app, api) = (_app, _api);
                #[cfg(target_os = "android")]
                let handle = api.register_android_plugin("app.tauri.contacts", "ContactsPlugin")?;
                #[cfg(target_os = "ios")]
                let handle = api.register_ios_plugin(init_plugin_contacts)?;

                app.manage(Contacts(handle));
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![load_native_contacts])
        .build()
}
