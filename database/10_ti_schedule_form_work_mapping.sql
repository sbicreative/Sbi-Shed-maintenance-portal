-- Generic work rows used to launch the new EL/ML TI form templates.

INSERT INTO work_master (
    department_id, section_id, schedule_id, work_name, status
)
SELECT sm.department_id, sm.section_id, sm.id, requested.work_name, 'true'
FROM schedule_master sm
JOIN (VALUES
    ('EL', 'TI-3 PHASE', 'TI SCHEDULE'),
    ('EL', 'TI CONVENTIONAL', 'TI CONVENTIONAL SCHEDULE'),
    ('ML', 'TI-3 PHASE', 'TI SCHEDULE'),
    ('ML', 'TI CONVENTIONAL', 'TI CONVENTIONAL SCHEDULE')
) AS requested(section_name, schedule_name, work_name)
  ON requested.schedule_name = sm.schedule_name
JOIN section_master section
  ON section.id = sm.section_id
 AND section.section_name = requested.section_name
WHERE NOT EXISTS (
    SELECT 1
    FROM work_master existing
    WHERE existing.section_id = sm.section_id
      AND existing.schedule_id = sm.id
      AND UPPER(TRIM(existing.work_name)) = UPPER(requested.work_name)
);

