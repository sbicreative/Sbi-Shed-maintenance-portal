CREATE DATABASE railway_loco_db;

USE railway_loco_db;

CREATE TABLE users(

id INT AUTO_INCREMENT PRIMARY KEY,

name VARCHAR(100) NOT NULL,

mobile VARCHAR(15) UNIQUE NOT NULL,

pf_no VARCHAR(20) UNIQUE NOT NULL,

designation_id INT,

department_id INT,

section_id INT,

role ENUM('USER','SSE','ADMIN') DEFAULT 'USER',

is_active BOOLEAN DEFAULT TRUE,

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);
CREATE TABLE departments(

id INT AUTO_INCREMENT PRIMARY KEY,

department_name VARCHAR(50)

);

INSERT INTO departments(department_name)

VALUES

('Mechanical'),

('Electrical');
CREATE TABLE sections(

id INT AUTO_INCREMENT PRIMARY KEY,

department_id INT,

section_name VARCHAR(100)

);
INSERT INTO sections(department_id,section_name)

VALUES

(1,'Bogie'),

(1,'Air Brake'),

(1,'Machine Shop'),

(1,'Wheel Shop'),

(2,'Traction Motor'),

(2,'Compressor'),

(2,'Test Room'),

(2,'Power Cable');
CREATE TABLE designations(

id INT AUTO_INCREMENT PRIMARY KEY,

designation_name VARCHAR(100)

);
INSERT INTO designations(designation_name)

VALUES

('Technician'),

('Senior Technician'),

('JE'),

('SSE'),

('AWM'),

('WM');
CREATE TABLE locomotives(

id INT AUTO_INCREMENT PRIMARY KEY,

loco_no VARCHAR(10) UNIQUE,

loco_type VARCHAR(20),

loco_series VARCHAR(20),

base_shed VARCHAR(50),

status VARCHAR(20)

);
INSERT INTO locomotives

(loco_no,loco_type,loco_series,base_shed,status)

VALUES

('37568','Electric','WAP7','SBI','Active'),

('43568','Electric','WAG9','SBI','Active');