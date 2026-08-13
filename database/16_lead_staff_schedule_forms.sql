-- One active Lead Staff per assigned work. Team members remain view-only.
BEGIN;

ALTER TABLE manpower_distribution
    ADD COLUMN IF NOT EXISTS is_lead BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE schedule_form_details
    ADD COLUMN IF NOT EXISTS assign_work_detail_id BIGINT;

UPDATE schedule_form_details form
SET assign_work_detail_id = md.assign_work_detail_id
FROM manpower_distribution md
WHERE md.id = COALESCE(form.original_manpower_distribution_id, form.manpower_distribution_id)
  AND form.assign_work_detail_id IS NULL;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_schedule_form_work_detail') THEN
        ALTER TABLE schedule_form_details ADD CONSTRAINT fk_schedule_form_work_detail
        FOREIGN KEY(assign_work_detail_id) REFERENCES assign_work_details(id) ON DELETE RESTRICT;
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedule_form_work_detail
    ON schedule_form_details(assign_work_detail_id)
    WHERE assign_work_detail_id IS NOT NULL AND repair_loco_key IS NULL;

-- Preserve existing single/multiple assignments by choosing the earliest row.
WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (
        PARTITION BY assign_work_detail_id
        ORDER BY assigned_date, id
    ) AS position
    FROM manpower_distribution
    WHERE status <> 'Completed'
)
UPDATE manpower_distribution md
SET is_lead = (ranked.position = 1)
FROM ranked
WHERE ranked.id = md.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_manpower_active_lead_per_work
    ON manpower_distribution(assign_work_detail_id)
    WHERE is_lead = TRUE AND status <> 'Completed';

CREATE INDEX IF NOT EXISTS idx_manpower_work_team
    ON manpower_distribution(assign_work_detail_id, is_lead, status);

COMMIT;
