-- Map each schedule to the section that performs it.
-- Existing schedule IDs are retained so work/assignment references remain valid.

ALTER TABLE schedule_master
    ADD COLUMN IF NOT EXISTS section_id BIGINT;

ALTER TABLE schedule_master
    DROP CONSTRAINT IF EXISTS uq_schedule;

-- Some earlier installations used an auto-generated name for the old
-- department + schedule unique constraint. Remove that shape as well.
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        WHERE c.conrelid = 'schedule_master'::regclass
          AND c.contype = 'u'
          AND pg_get_constraintdef(c.oid) =
              'UNIQUE (department_id, schedule_name)'
    LOOP
        EXECUTE format(
            'ALTER TABLE schedule_master DROP CONSTRAINT %I',
            constraint_name
        );
    END LOOP;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_schedule_section'
    ) THEN
        ALTER TABLE schedule_master
            ADD CONSTRAINT fk_schedule_section
            FOREIGN KEY (section_id)
            REFERENCES section_master(id);
    END IF;
END $$;

-- Preserve the schedule IDs already used by EL work-master rows.
UPDATE schedule_master sm
SET section_id = s.id
FROM section_master s
JOIN department_master d ON d.id = s.department_id
WHERE sm.department_id = d.id
  AND d.department_name = 'Electrical'
  AND s.section_name = 'EL'
  AND sm.schedule_name IN ('IA', 'IB', 'IC', 'OUT OF COURSE');

-- Preserve the schedule IDs already used by ML work-master rows.
UPDATE schedule_master sm
SET section_id = s.id
FROM section_master s
JOIN department_master d ON d.id = s.department_id
WHERE sm.department_id = d.id
  AND d.department_name = 'Mechanical'
  AND s.section_name = 'ML'
  AND sm.schedule_name IN ('IA', 'IB', 'IC', 'TI', 'OUT OF COURSE');

UPDATE schedule_master
SET schedule_name = 'TI-3 PHASE'
WHERE schedule_name = 'TI'
  AND section_id = (
      SELECT s.id
      FROM section_master s
      JOIN department_master d ON d.id = s.department_id
      WHERE d.department_name = 'Mechanical'
        AND s.section_name = 'ML'
  );

-- Existing overhaul schedules belong to the heavy-maintenance sections.
UPDATE schedule_master sm
SET section_id = s.id
FROM section_master s
JOIN department_master d ON d.id = s.department_id
WHERE sm.department_id = d.id
  AND d.department_name = 'Electrical'
  AND s.section_name = 'EH'
  AND sm.schedule_name IN ('IOH', 'TOH');

UPDATE schedule_master sm
SET section_id = s.id
FROM section_master s
JOIN department_master d ON d.id = s.department_id
WHERE sm.department_id = d.id
  AND d.department_name = 'Mechanical'
  AND s.section_name = 'MH'
  AND sm.schedule_name IN ('IOH', 'TOH');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_schedule_section'
    ) THEN
        ALTER TABLE schedule_master
            ADD CONSTRAINT uq_schedule_section
            UNIQUE (department_id, section_id, schedule_name);
    END IF;
END $$;

-- Complete EL and ML demo schedules without replacing referenced records.
INSERT INTO schedule_master (department_id, section_id, schedule_name)
SELECT d.id, s.id, schedule_name
FROM department_master d
JOIN section_master s ON s.department_id = d.id
CROSS JOIN (VALUES
    ('TI-3 PHASE'),
    ('TI CONVENTIONAL')
) AS requested(schedule_name)
WHERE d.department_name = 'Electrical'
  AND s.section_name = 'EL'
ON CONFLICT (department_id, section_id, schedule_name) DO NOTHING;

INSERT INTO schedule_master (department_id, section_id, schedule_name)
SELECT d.id, s.id, schedule_name
FROM department_master d
JOIN section_master s ON s.department_id = d.id
CROSS JOIN (VALUES
    ('IA'), ('IB'), ('IC'),
    ('TI-3 PHASE'), ('TI CONVENTIONAL'),
    ('OUT OF COURSE')
) AS requested(schedule_name)
WHERE d.department_name = 'Mechanical'
  AND s.section_name = 'ML'
ON CONFLICT (department_id, section_id, schedule_name) DO NOTHING;

-- Map the available heavy-maintenance sections.
INSERT INTO schedule_master (department_id, section_id, schedule_name)
SELECT d.id, s.id, schedule_name
FROM department_master d
JOIN section_master s ON s.department_id = d.id
CROSS JOIN (VALUES ('IOH'), ('TOH'), ('OUT OF COURSE')) AS requested(schedule_name)
WHERE (d.department_name = 'Electrical' AND s.section_name = 'EH')
   OR (d.department_name = 'Mechanical' AND s.section_name IN ('MH', 'UF'))
ON CONFLICT (department_id, section_id, schedule_name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_schedule_master_section
    ON schedule_master(section_id);
