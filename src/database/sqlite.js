import sqlite3InitModule from "@sqlite.org/sqlite-wasm";

let db = null;
let sqlite3 = null;

export async function initDatabase() {
    if (db) return db;

    sqlite3 = await sqlite3InitModule({
        print: () => {},
        printErr: console.error,
    });

    // Temporary in-memory database.
    // Later we'll replace this with persistent storage.
    db = new sqlite3.oo1.DB(":memory:");

    // Starter database for learning.
    db.exec(`
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            age INTEGER,
            city TEXT
        );

        INSERT INTO users (name, email, age, city) VALUES
        ('Saifu', 'saifu@example.com', 18, 'Patna'),
        ('Rahul', 'rahul@example.com', 21, 'Delhi'),
        ('Aman', 'aman@example.com', 20, 'Mumbai'),
        ('Priya', 'priya@example.com', 22, 'Kolkata'),
        ('Arjun', 'arjun@example.com', 19, 'Bangalore');
    `);

    return db;
}

export function executeSQL(sql) {
    if (!db) {
        throw new Error("Database is not initialized");
    }

    return db.exec({
        sql,
        rowMode: "object",
        returnValue: "resultRows",
    });
}

export function getDatabase() {
    return db;
}