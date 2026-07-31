-- ==========================================================
-- SBI SHED LOCO MANAGEMENT SYSTEM
-- MASTER DATA V1
-- ==========================================================

-- ==========================================================
-- DEPARTMENT MASTER
-- ==========================================================

INSERT INTO department_master (department_name)
VALUES
('Mechanical'),
('Electrical'),
('Administration')
ON CONFLICT (department_name) DO NOTHING;

-- ==========================================================
-- SECTION MASTER - ELECTRICAL
-- ==========================================================

INSERT INTO section_master (department_id, section_name)
SELECT d.id,'EL'
FROM department_master d
WHERE d.department_name='Electrical'
ON CONFLICT DO NOTHING;

INSERT INTO section_master (department_id, section_name)
SELECT d.id,'EH'
FROM department_master d
WHERE d.department_name='Electrical'
ON CONFLICT DO NOTHING;

INSERT INTO section_master (department_id, section_name)
SELECT d.id,'EA'
FROM department_master d
WHERE d.department_name='Electrical'
ON CONFLICT DO NOTHING;

INSERT INTO section_master (department_id, section_name)
SELECT d.id,'TM'
FROM department_master d
WHERE d.department_name='Electrical'
ON CONFLICT DO NOTHING;

INSERT INTO section_master (department_id, section_name)
SELECT d.id,'Battery'
FROM department_master d
WHERE d.department_name='Electrical'
ON CONFLICT DO NOTHING;

INSERT INTO section_master (department_id, section_name)
SELECT d.id,'Instrument Room'
FROM department_master d
WHERE d.department_name='Electrical'
ON CONFLICT DO NOTHING;

INSERT INTO section_master (department_id, section_name)
SELECT d.id,'Switchgear Room'
FROM department_master d
WHERE d.department_name='Electrical'
ON CONFLICT DO NOTHING;

-- ==========================================================
-- SECTION MASTER - MECHANICAL
-- ==========================================================

INSERT INTO section_master (department_id, section_name)
SELECT d.id,'ML'
FROM department_master d
WHERE d.department_name='Mechanical'
ON CONFLICT DO NOTHING;

INSERT INTO section_master (department_id, section_name)
SELECT d.id,'MH'
FROM department_master d
WHERE d.department_name='Mechanical'
ON CONFLICT DO NOTHING;

INSERT INTO section_master (department_id, section_name)
SELECT d.id,'MA'
FROM department_master d
WHERE d.department_name='Mechanical'
ON CONFLICT DO NOTHING;

INSERT INTO section_master (department_id, section_name)
SELECT d.id,'Governer'
FROM department_master d
WHERE d.department_name='Mechanical'
ON CONFLICT DO NOTHING;

INSERT INTO section_master (department_id, section_name)
SELECT d.id,'Panto'
FROM department_master d
WHERE d.department_name='Mechanical'
ON CONFLICT DO NOTHING;

INSERT INTO section_master (department_id, section_name)
SELECT d.id,'UF'
FROM department_master d
WHERE d.department_name='Mechanical'
ON CONFLICT DO NOTHING;

INSERT INTO section_master (department_id, section_name)
SELECT d.id,'General'
FROM department_master d
WHERE d.department_name='Mechanical'
ON CONFLICT DO NOTHING;

INSERT INTO section_master (department_id, section_name)
SELECT d.id,'Cab Fitting'
FROM department_master d
WHERE d.department_name='Mechanical'
ON CONFLICT DO NOTHING;

-- ==========================================================
-- SECTION MASTER - ADMINISTRATION
-- ==========================================================

INSERT INTO section_master (department_id, section_name)
SELECT d.id,'ADMIN'
FROM department_master d
WHERE d.department_name='Administration'
ON CONFLICT DO NOTHING;

-- ==========================================================
-- DESIGNATION MASTER - ELECTRICAL
-- ==========================================================

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'SSE' FROM department_master WHERE department_name='Electrical'
ON CONFLICT DO NOTHING;

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'JE' FROM department_master WHERE department_name='Electrical'
ON CONFLICT DO NOTHING;

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'MCF' FROM department_master WHERE department_name='Electrical'
ON CONFLICT DO NOTHING;

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'ELF-I' FROM department_master WHERE department_name='Electrical'
ON CONFLICT DO NOTHING;

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'ELF-II' FROM department_master WHERE department_name='Electrical'
ON CONFLICT DO NOTHING;

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'ELF-III' FROM department_master WHERE department_name='Electrical'
ON CONFLICT DO NOTHING;

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'Khalasi' FROM department_master WHERE department_name='Electrical'
ON CONFLICT DO NOTHING;

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'Apprentice' FROM department_master WHERE department_name='Electrical'
ON CONFLICT DO NOTHING;

-- ==========================================================
-- DESIGNATION MASTER - MECHANICAL
-- ==========================================================

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'SSE' FROM department_master WHERE department_name='Mechanical'
ON CONFLICT DO NOTHING;

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'JE' FROM department_master WHERE department_name='Mechanical'
ON CONFLICT DO NOTHING;

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'MCF' FROM department_master WHERE department_name='Mechanical'
ON CONFLICT DO NOTHING;

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'DM-I' FROM department_master WHERE department_name='Mechanical'
ON CONFLICT DO NOTHING;

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'DM-II' FROM department_master WHERE department_name='Mechanical'
ON CONFLICT DO NOTHING;

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'DM-III' FROM department_master WHERE department_name='Mechanical'
ON CONFLICT DO NOTHING;

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'Khalasi' FROM department_master WHERE department_name='Mechanical'
ON CONFLICT DO NOTHING;

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'Apprentice' FROM department_master WHERE department_name='Mechanical'
ON CONFLICT DO NOTHING;

-- ==========================================================
-- DESIGNATION MASTER - ADMINISTRATION
-- ==========================================================

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'Sr.DME' FROM department_master WHERE department_name='Administration'
ON CONFLICT DO NOTHING;

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'DME' FROM department_master WHERE department_name='Administration'
ON CONFLICT DO NOTHING;

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'AME' FROM department_master WHERE department_name='Administration'
ON CONFLICT DO NOTHING;

INSERT INTO designation_master (department_id,designation_name)
SELECT id,'CMT' FROM department_master WHERE department_name='Administration'
ON CONFLICT DO NOTHING;

-- ==========================================================
-- SCHEDULE MASTER
-- ==========================================================

INSERT INTO schedule_master (department_id,schedule_name)
SELECT id,'IA' FROM department_master WHERE department_name='Mechanical'
ON CONFLICT DO NOTHING;

INSERT INTO schedule_master (department_id,schedule_name)
SELECT id,'IB' FROM department_master WHERE department_name='Mechanical'
ON CONFLICT DO NOTHING;

INSERT INTO schedule_master (department_id,schedule_name)
SELECT id,'IC' FROM department_master WHERE department_name='Mechanical'
ON CONFLICT DO NOTHING;

INSERT INTO schedule_master (department_id,schedule_name)
SELECT id,'TI' FROM department_master WHERE department_name='Mechanical'
ON CONFLICT DO NOTHING;

-- ==========================================================
-- LOCO TYPE MASTER
-- ==========================================================

INSERT INTO loco_type_master (loco_type)
VALUES
('WDG4'),
('WDG4G'),
('WDP4'),
('WDP4D')
ON CONFLICT DO NOTHING;