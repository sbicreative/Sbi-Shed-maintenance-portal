-- Prevent one staff member from being assigned to multiple works on the same
-- assign_work_header.assign_date. This migration does not delete any data.
--
-- Preview existing conflicts using each work header's authoritative date.

SELECT
    md.staff_id,
    h.assign_date,
    COUNT(*) AS assignment_count
FROM manpower_distribution md
JOIN assign_work_details d
  ON d.id = md.assign_work_detail_id
JOIN assign_work_header h
  ON h.id = d.assign_header_id
GROUP BY md.staff_id, h.assign_date
HAVING COUNT(*) > 1;

-- Stop without changing data if existing records would conflict after their
-- dates are aligned with the work headers.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM manpower_distribution md
        JOIN assign_work_details d
          ON d.id = md.assign_work_detail_id
        JOIN assign_work_header h
          ON h.id = d.assign_header_id
        GROUP BY md.staff_id, h.assign_date
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Existing same-day staff conflicts found; review the preview query before applying this migration.';
    END IF;
END;
$$;

-- Repair only the derived date field on existing distribution rows.
UPDATE manpower_distribution md
SET assigned_date = h.assign_date
FROM assign_work_details d
JOIN assign_work_header h
  ON h.id = d.assign_header_id
WHERE d.id = md.assign_work_detail_id
  AND md.assigned_date IS DISTINCT FROM h.assign_date;

-- Always derive assigned_date from the selected work. This prevents clients
-- from bypassing the date rule by submitting another date.
CREATE OR REPLACE FUNCTION set_manpower_assigned_date_from_work()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    work_assign_date DATE;
BEGIN
    SELECT h.assign_date
    INTO work_assign_date
    FROM assign_work_details d
    JOIN assign_work_header h
      ON h.id = d.assign_header_id
    WHERE d.id = NEW.assign_work_detail_id;

    IF work_assign_date IS NULL THEN
        RAISE EXCEPTION
            'No assign date found for work detail %',
            NEW.assign_work_detail_id;
    END IF;

    NEW.assigned_date := work_assign_date;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
    trg_manpower_assigned_date_from_work
    ON manpower_distribution;

CREATE TRIGGER trg_manpower_assigned_date_from_work
BEFORE INSERT OR UPDATE OF assign_work_detail_id, assigned_date
ON manpower_distribution
FOR EACH ROW
EXECUTE FUNCTION set_manpower_assigned_date_from_work();

CREATE UNIQUE INDEX IF NOT EXISTS
    uq_manpower_staff_assigned_date
ON manpower_distribution (staff_id, assigned_date);
