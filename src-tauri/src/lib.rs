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
        Migration {
            version: 3,
            description: "dealers_and_ledger_notes",
            // Every existing note becomes a dealer and its entries move into
            // that dealer's first ledger note (IN-00001). Ledger note codes
            // use one global sequence; new codes are allocated by the app as
            // max(existing suffix) + 1.
            sql: "CREATE TABLE dealers (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      name TEXT NOT NULL,
                      phone TEXT NOT NULL DEFAULT '',
                      email TEXT NOT NULL DEFAULT '',
                      emoji TEXT NOT NULL DEFAULT '💬',
                      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
                   );
                   CREATE TABLE ledger_notes (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      dealer_id INTEGER NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
                      code TEXT NOT NULL UNIQUE,
                      label TEXT,
                      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
                   );
                   CREATE TABLE entries_new (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      ledger_note_id INTEGER NOT NULL REFERENCES ledger_notes(id) ON DELETE CASCADE,
                      kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
                      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
                      description TEXT NOT NULL,
                      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
                   );
                   INSERT INTO dealers (id, name, emoji, created_at, updated_at)
                      SELECT id, title, emoji, created_at, updated_at FROM notes ORDER BY id;
                   INSERT INTO ledger_notes (dealer_id, code, created_at, updated_at)
                      SELECT id,
                             'IN-' || printf('%05d', (SELECT COUNT(*) FROM dealers d2 WHERE d2.id <= dealers.id)),
                             created_at, updated_at
                      FROM dealers ORDER BY id;
                   INSERT INTO entries_new (id, ledger_note_id, kind, amount_cents, description, created_at)
                      SELECT e.id, ln.id, e.kind, e.amount_cents, e.description, e.created_at
                      FROM entries e JOIN ledger_notes ln ON ln.dealer_id = e.note_id;
                   DROP TABLE entries;
                   ALTER TABLE entries_new RENAME TO entries;
                   DROP TABLE notes;
                   CREATE INDEX IF NOT EXISTS ledger_notes_dealer_id_idx ON ledger_notes(dealer_id);
                   CREATE INDEX IF NOT EXISTS entries_ledger_note_id_idx ON entries(ledger_note_id);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "amounts_in_fils",
            // BHD has 3 decimals: 1 BD = 1000 fils. Earlier versions stored
            // 2-decimal cents, so scale every stored amount (including any
            // signed legacy values) by 10.
            sql: "UPDATE entries SET amount_cents = amount_cents * 10;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "list_query_indexes",
            // Cover the ORDER BY on each hot list query so SQLite can scan the
            // index instead of sorting a temp table as the data grows.
            sql: "CREATE INDEX IF NOT EXISTS entries_note_created_idx ON entries(ledger_note_id, created_at DESC, id DESC);
                  CREATE INDEX IF NOT EXISTS ledger_notes_dealer_updated_idx ON ledger_notes(dealer_id, updated_at DESC);
                  CREATE INDEX IF NOT EXISTS dealers_updated_idx ON dealers(updated_at DESC, id DESC);",
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
