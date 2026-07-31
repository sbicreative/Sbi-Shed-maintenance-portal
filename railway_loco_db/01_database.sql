-- ==========================================
-- SBI SHED LOCO MANAGEMENT SYSTEM
-- DATABASE VERSION 3.0
-- ==========================================


DROP TABLE IF EXISTS assigned_work_details;
DROP TABLE IF EXISTS assigned_work;
DROP TABLE IF EXISTS work_master;
DROP TABLE IF EXISTS schedule_master;
DROP TABLE IF EXISTS loco_history;



-- ==========================================
-- Schedule Master
-- ==========================================

CREATE TABLE schedule_master(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    department TEXT NOT NULL,

    schedule_code TEXT NOT NULL,

    schedule_name TEXT NOT NULL,

    active INTEGER DEFAULT 1

);



-- ==========================================
-- Work Master
-- ==========================================

CREATE TABLE work_master(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    department TEXT NOT NULL,

    work_name TEXT NOT NULL,

    display_order INTEGER,

    active INTEGER DEFAULT 1

);



-- ==========================================
-- Assigned Work
-- ==========================================

CREATE TABLE assigned_work(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    work_id TEXT UNIQUE,

    assign_date TEXT,

    department TEXT,

    section TEXT,

    supervisor_id INTEGER,

    loco_type TEXT,

    loco_no TEXT,

    schedule_id INTEGER,

    remarks TEXT,

    created_by INTEGER,

    created_date TEXT,

    status TEXT DEFAULT 'Assigned'

);



-- ==========================================
-- Assigned Work Details
-- ==========================================

CREATE TABLE assigned_work_details(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    assigned_work_id INTEGER,

    work_master_id INTEGER

);



-- ==========================================
-- Loco History
-- ==========================================

CREATE TABLE loco_history(

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    loco_no TEXT,

    work_id TEXT,

    action TEXT,

    user_name TEXT,

    remarks TEXT,

    action_date TEXT

);
INSERT INTO schedule_master
(department,schedule_code,schedule_name)
VALUES

('Mechanical','O1','O1 Schedule'),
('Mechanical','O2','O2 Schedule'),
('Mechanical','O3','O3 Schedule'),
('Mechanical','IOH','IOH'),

('Electrical','O1','O1 Schedule'),
('Electrical','O2','O2 Schedule'),
('Electrical','O3','O3 Schedule'),
('Electrical','IOH','IOH');