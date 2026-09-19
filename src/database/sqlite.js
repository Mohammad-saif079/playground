import sqlite3InitModule from "@sqlite.org/sqlite-wasm";

let db = null;
let sqlite3 = null;
let initializing = null;


// ============================================================
// INITIALIZE DATABASE
// ============================================================

export async function initDatabase() {

    // Already initialized
    if (db) {
        return db;
    }

    // Prevent multiple simultaneous initialization calls
    if (initializing) {
        return initializing;
    }

    initializing = (async () => {

        // ----------------------------------------------------
        // INITIALIZE SQLITE WASM
        // ----------------------------------------------------

        sqlite3 = await sqlite3InitModule({
            print: () => {},
            printErr: console.error,
        });


        // ----------------------------------------------------
        // OPEN PERSISTENT SQLITE DATABASE
        // ----------------------------------------------------
        //
        // "local" means:
        //
        // SQLite database
        //       ↓
        // kvvfs
        //       ↓
        // browser localStorage
        //
        // It survives page refresh and browser restart.
        //
        // No service worker.
        // No OPFS.
        // No Worker required.
        // ----------------------------------------------------

        db = new sqlite3.oo1.JsStorageDb("local");


        // ----------------------------------------------------
        // CHECK WHETHER THIS IS A NEW DATABASE
        // ----------------------------------------------------

        const tables = db.exec({
            sql: `
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                AND name = 'users';
            `,
            rowMode: "object",
            returnValue: "resultRows",
        });


        // ----------------------------------------------------
        // CREATE STARTER DATABASE ONLY ON FIRST RUN
        // ----------------------------------------------------
        //
        // IMPORTANT:
        //
        // We DO NOT run this every time.
        //
        // Otherwise user data would be overwritten/recreated
        // after every refresh.
        // ----------------------------------------------------

        if (tables.length === 0) {

            db.exec(`
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE,
                    age INTEGER,
                    city TEXT
                );

                INSERT INTO users
                    (name, email, age, city)
                VALUES
                    ('Saifu', 'saifu@example.com', 18, 'Patna'),
                    ('Rahul', 'rahul@example.com', 21, 'Delhi'),
                    ('Aman', 'aman@example.com', 20, 'Mumbai'),
                    ('Priya', 'priya@example.com', 22, 'Kolkata'),
                    ('Arjun', 'arjun@example.com', 19, 'Bangalore');
            `);
        }


        return db;

    })();


    try {

        return await initializing;

    } finally {

        initializing = null;

    }
}


// ============================================================
// EXECUTE SQL
// ============================================================

export function executeSQL(sql) {

    if (!db) {
        throw new Error(
            "Database is not initialized"
        );
    }

    return db.exec({
        sql,
        rowMode: "object",
        returnValue: "resultRows",
    });
}


// ============================================================
// GET DATABASE
// ============================================================

export function getDatabase() {
    return db;
}


// ============================================================
// GET STORAGE SIZE
// ============================================================

export function getDatabaseStorageSize() {

    if (!db) {
        return 0;
    }

    return db.storageSize();
}


// ============================================================
// RESET DATABASE
// ============================================================

export function resetDatabase() {

    if (!db) {
        throw new Error(
            "Database is not initialized"
        );
    }


    // Completely remove the persistent database
    db.clearStorage();


    // Reopen a fresh database
    db.close();

    db = new sqlite3.oo1.JsStorageDb("local");


    // Create starter database again
    db.exec(`
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            age INTEGER,
            city TEXT
        );

        INSERT INTO users
            (name, email, age, city)
        VALUES
            ('Saifu', 'saifu@example.com', 18, 'Patna'),
            ('Rahul', 'rahul@example.com', 21, 'Delhi'),
            ('Aman', 'aman@example.com', 20, 'Mumbai'),
            ('Priya', 'priya@example.com', 22, 'Kolkata'),
            ('Arjun', 'arjun@example.com', 19, 'Bangalore');
    `);

    return db;
}