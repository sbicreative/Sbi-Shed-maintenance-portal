-- A staff member may handle multiple works on one date, but all those works
-- must be assigned by the same supervisor for that date.

DROP INDEX IF EXISTS uq_manpower_staff_assigned_date;

CREATE UNIQUE INDEX IF NOT EXISTS
    uq_manpower_staff_work_date
ON manpower_distribution (
    staff_id,
    assign_work_detail_id,
    assigned_date
);

CREATE OR REPLACE FUNCTION enforce_daily_staff_supervisor_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    existing_supervisor BIGINT;
BEGIN
    SELECT assigned_by
    INTO existing_supervisor
    FROM manpower_distribution
    WHERE staff_id = NEW.staff_id
      AND assigned_date = NEW.assigned_date
      AND id IS DISTINCT FROM NEW.id
    LIMIT 1;

    IF existing_supervisor IS NOT NULL
       AND existing_supervisor <> NEW.assigned_by THEN
        RAISE EXCEPTION
            'Staff % is locked to supervisor % for %',
            NEW.staff_id,
            existing_supervisor,
            NEW.assigned_date
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
    trg_daily_staff_supervisor_owner
    ON manpower_distribution;

CREATE TRIGGER trg_daily_staff_supervisor_owner
BEFORE INSERT OR UPDATE OF
    staff_id, assigned_by, assigned_date
ON manpower_distribution
FOR EACH ROW
EXECUTE FUNCTION enforce_daily_staff_supervisor_owner();

