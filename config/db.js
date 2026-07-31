const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Database Path
const dbPath = path.join(__dirname, "../railway_loco_db/sbi.db");

// Database Connect
const db = new sqlite3.Database(dbPath, (err) => {

    if (err) {

        console.log("❌ Database Connection Failed");
        console.log(err.message);

    } else {

        console.log("======================================");
        console.log("✅ SBI LOCO DATABASE CONNECTED");
        console.log("======================================");

        db.serialize(() => {

            // ======================================
            // Employee Master
            // ======================================

            db.run(`

            CREATE TABLE IF NOT EXISTS employees(

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                name TEXT NOT NULL,

                mobile TEXT UNIQUE NOT NULL,

                pf_no TEXT UNIQUE NOT NULL,

                department TEXT NOT NULL,

                section TEXT NOT NULL,

                designation TEXT NOT NULL,

                role TEXT DEFAULT 'Staff',

                status TEXT DEFAULT 'Active',

                created_at DATETIME DEFAULT CURRENT_TIMESTAMP

            )

            `);



            // ======================================
            // Department Master
            // ======================================

            db.run(`

            CREATE TABLE IF NOT EXISTS department_master(

                id INTEGER PRIMARY KEY,

                department_name TEXT UNIQUE

            )

            `);



            // ======================================
            // Section Master
            // ======================================

            db.run(`

            CREATE TABLE IF NOT EXISTS section_master(

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                department_id INTEGER,

                section_name TEXT,

                FOREIGN KEY(department_id)

                REFERENCES department_master(id)

            )

            `);



            // ======================================
            // Department Data
            // ======================================

            db.run(`

            INSERT OR IGNORE INTO department_master

            VALUES

            (1,'Mechanical'),

            (2,'Electrical')

            `);



            // ======================================
            // Mechanical Section
            // ======================================

            db.run(`

            INSERT OR IGNORE INTO section_master

            (department_id,section_name)

            VALUES

            (1,'ML'),

            (1,'MH'),

            (1,'MA'),

            (1,'UF'),

            (1,'Panto'),

            (1,'General')

            `);



            // ======================================
            // Electrical Section
            // ======================================

            db.run(`

            INSERT OR IGNORE INTO section_master

            (department_id,section_name)

            VALUES

            (2,'EL'),

            (2,'EH'),

            (2,'EA'),

            (2,'TM'),

            (2,'Battery'),

            (2,'Instrument Room'),

            (2,'Switchgear Room')

            `);
            // ==========================================
// Work Master
// ==========================================

db.run(`

CREATE TABLE IF NOT EXISTS work_master(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    department_id INTEGER NOT NULL,

    section_id INTEGER NOT NULL,

    work_name TEXT NOT NULL,

    work_description TEXT,

    status TEXT DEFAULT 'Active',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(department_id)
    REFERENCES department_master(id),

    FOREIGN KEY(section_id)
    REFERENCES section_master(id)

)

`);

console.log("✅ Work Master Ready");           

            console.log("✅ Employee Master Ready");

            console.log("✅ Department Master Ready");

            console.log("✅ Section Master Ready");

        });

    }

});


module.exports = db;