-- PF-number-based identity mapping for employee/supervisor/user masters.
-- Safe to re-run. Existing linked users backfill their PF into the master row.

ALTER TABLE employee_master
    ADD COLUMN IF NOT EXISTS pf_no VARCHAR(30);

ALTER TABLE supervisor_master
    ADD COLUMN IF NOT EXISTS pf_no VARCHAR(30);

UPDATE employee_master employee
SET pf_no = UPPER(REGEXP_REPLACE(user_row.pf_no, '[^A-Za-z0-9]', '', 'g'))
FROM user_master user_row
WHERE user_row.employee_master_id = employee.id
  AND NULLIF(TRIM(user_row.pf_no), '') IS NOT NULL
  AND employee.pf_no IS NULL;

UPDATE supervisor_master supervisor
SET pf_no = UPPER(REGEXP_REPLACE(user_row.pf_no, '[^A-Za-z0-9]', '', 'g'))
FROM user_master user_row
WHERE user_row.supervisor_master_id = supervisor.id
  AND NULLIF(TRIM(user_row.pf_no), '') IS NOT NULL
  AND supervisor.pf_no IS NULL;

UPDATE user_master
SET pf_no = UPPER(REGEXP_REPLACE(pf_no, '[^A-Za-z0-9]', '', 'g'))
WHERE pf_no IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_master_pf_no
    ON employee_master (pf_no)
    WHERE pf_no IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_supervisor_master_pf_no
    ON supervisor_master (pf_no)
    WHERE pf_no IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_master_pf_no_normalized
    ON user_master ((UPPER(REGEXP_REPLACE(pf_no, '[^A-Za-z0-9]', '', 'g'))))
    WHERE pf_no IS NOT NULL;

CREATE OR REPLACE FUNCTION map_user_master_by_pf()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    normalized_pf TEXT;
    normalized_role TEXT;
BEGIN
    normalized_pf := UPPER(REGEXP_REPLACE(COALESCE(NEW.pf_no, ''), '[^A-Za-z0-9]', '', 'g'));
    normalized_role := LOWER(TRIM(COALESCE(NEW.role, '')));
    NEW.pf_no := normalized_pf;
    NEW.employee_master_id := NULL;
    NEW.supervisor_master_id := NULL;

    IF normalized_role = 'staff' THEN
        SELECT id INTO NEW.employee_master_id
        FROM employee_master
        WHERE pf_no = normalized_pf;
    ELSIF normalized_role IN ('supervisor', 'incharge') THEN
        SELECT id INTO NEW.supervisor_master_id
        FROM supervisor_master
        WHERE pf_no = normalized_pf;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_master_map_by_pf ON user_master;

CREATE TRIGGER trg_user_master_map_by_pf
BEFORE INSERT OR UPDATE OF pf_no, role ON user_master
FOR EACH ROW
EXECUTE FUNCTION map_user_master_by_pf();
