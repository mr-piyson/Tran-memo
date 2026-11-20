use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_entries_table",
            sql: "CREATE TABLE IF NOT EXISTS entries (
                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                     kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
                     amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
                     description TEXT NOT NULL,
                     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
                  );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_notes_and_link_entries",
            sql: "CREATE TABLE IF NOT EXISTS notes (
                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                     title TEXT NOT NULL,
                     emoji TEXT NOT NULL DEFAULT '💬',
                     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                     updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
                  );
                  INSERT INTO notes (title, emoji) VALUES ('General', '💬');
                  CREATE TABLE entries_new (
                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                     note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
                     kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
                     amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
                     description TEXT NOT NULL,
                     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
                  );
                  INSERT INTO entries_new (id, note_id, kind, amount_cents, description, created_at)
                     SELECT id, 1, kind, amount_cents, description, created_at FROM entries;
                  DROP TABLE entries;
                  ALTER TABLE entries_new RENAME TO entries;
                  CREATE INDEX IF NOT EXISTS entries_note_id_idx ON entries(note_id);",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:ledger.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
