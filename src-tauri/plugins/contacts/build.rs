fn main() {
    // The iOS build script patches the generated Info.plist with the usage
    // description required by CNContactStore. It is a no-op on other hosts.
    #[cfg(target_os = "macos")]
    tauri_plugin::mobile::update_info_plist(|plist| {
        plist.insert(
            "NSContactsUsageDescription".into(),
            "Ledger Notes uses your contacts to fill in dealer names and phone numbers."
                .into(),
        );
    })
    .expect("failed to add NSContactsUsageDescription to Info.plist");

    tauri_plugin::Builder::new(&["load_native_contacts"])
        .android_path("android")
        .ios_path("ios")
        .build();
}
