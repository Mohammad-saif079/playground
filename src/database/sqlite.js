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

        db = new sqlite3.oo1.JsStorageDb("local");


        // ----------------------------------------------------
        // CHECK WHETHER THIS IS A NEW DATABASE
        // ----------------------------------------------------

        const tables = db.exec({
            sql: `
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                AND name = 'scouts';
            `,
            rowMode: "object",
            returnValue: "resultRows",
        });


        // ----------------------------------------------------
        // CREATE AOT STARTER DATABASE
        // ----------------------------------------------------

        if (tables.length === 0) {

            db.exec(`
                CREATE TABLE scouts (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    rank TEXT NOT NULL,
                    division TEXT NOT NULL,
                    titan_kills INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'Active'
                );

                INSERT INTO scouts
                    (name, rank, division, titan_kills, status)
                VALUES
                    (
                        'Eren Yeager',
                        'Soldier',
                        'Survey Corps',
                        3,
                        'Active'
                    ),
                    (
                        'Mikasa Ackerman',
                        'Captain',
                        'Survey Corps',
                        18,
                        'Active'
                    ),
                    (
                        'Armin Arlert',
                        'Commander',
                        'Survey Corps',
                        2,
                        'Active'
                    ),
                    (
                        'Levi Ackerman',
                        'Captain',
                        'Special Operations',
                        58,
                        'Active'
                    ),
                    (
                        'Erwin Smith',
                        'Commander',
                        'Survey Corps',
                        0,
                        'Deceased'
                    );
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


    // Remove persistent database
    db.clearStorage();

    // Close current database
    db.close();

    // Reopen fresh database
    db = new sqlite3.oo1.JsStorageDb("local");


    // Recreate AOT starter database
    db.exec(`
        CREATE TABLE scouts (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            rank TEXT NOT NULL,
            division TEXT NOT NULL,
            titan_kills INTEGER DEFAULT 0,
            status TEXT DEFAULT 'Active'
        );

        INSERT INTO scouts
            (name, rank, division, titan_kills, status)
        VALUES
            (
                'Eren Yeager',
                'Soldier',
                'Survey Corps',
                3,
                'Active'
            ),
            (
                'Mikasa Ackerman',
                'Captain',
                'Survey Corps',
                18,
                'Active'
            ),
            (
                'Armin Arlert',
                'Commander',
                'Survey Corps',
                2,
                'Active'
            ),
            (
                'Levi Ackerman',
                'Captain',
                'Special Operations',
                58,
                'Active'
            ),
            (
                'Erwin Smith',
                'Commander',
                'Survey Corps',
                0,
                'Deceased'
            );
    `);


    return db;
}