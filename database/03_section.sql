-- ==========================================
-- ELECTRICAL
-- ==========================================

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

-- ==========================================
-- MECHANICAL
-- ==========================================

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

-- ==========================================
-- ADMINISTRATION
-- ==========================================

INSERT INTO section_master (department_id, section_name)

SELECT d.id,'ADMIN'

FROM department_master d

WHERE d.department_name='Administration'

ON CONFLICT DO NOTHING;