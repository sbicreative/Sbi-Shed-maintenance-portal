-- ======================================================
-- SCHEDULE FORM REVIEW WORKFLOW
--
-- Staff -> Supervisor -> Incharge -> Approved
-- Returned forms move back one stage for correction.
-- Existing submissions are preserved and mapped to the
-- supervisor who distributed the manpower.
-- ======================================================

ALTER TABLE schedule_form_details
    ADD COLUMN IF NOT EXISTS submitted_to_supervisor_id BIGINT,
    ADD COLUMN IF NOT EXISTS supervisor_reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS supervisor_remarks TEXT,
    ADD COLUMN IF NOT EXISTS forwarded_to_incharge_id BIGINT,
    ADD COLUMN IF NOT EXISTS forwarded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS incharge_reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS incharge_remarks TEXT,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;

-- Map already-submitted forms to the supervisor who assigned the staff.
UPDATE schedule_form_details form
SET submitted_to_supervisor_id = distribution.assigned_by
FROM manpower_distribution distribution
WHERE distribution.id = form.manpower_distribution_id
  AND form.submitted_to_supervisor_id IS NULL;

-- Replace the earlier status constraint with the complete workflow.
ALTER TABLE schedule_form_details
    DROP CONSTRAINT IF EXISTS
        chk_schedule_form_details_status;

ALTER TABLE schedule_form_details
    ADD CONSTRAINT chk_schedule_form_details_status
    CHECK (
        status IN (
            'Draft',
            'Submitted',
            'Supervisor Review',
            'Returned to Staff',
            'Forwarded to Incharge',
            'Returned to Supervisor',
            'Approved'
        )
    );

-- Add routing foreign keys only when they do not already exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
            'fk_schedule_form_submitted_supervisor'
    ) THEN
        ALTER TABLE schedule_form_details
            ADD CONSTRAINT
                fk_schedule_form_submitted_supervisor
            FOREIGN KEY (submitted_to_supervisor_id)
            REFERENCES supervisor_master(id)
            ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
            'fk_schedule_form_forwarded_incharge'
    ) THEN
        ALTER TABLE schedule_form_details
            ADD CONSTRAINT
                fk_schedule_form_forwarded_incharge
            FOREIGN KEY (forwarded_to_incharge_id)
            REFERENCES supervisor_master(id)
            ON DELETE SET NULL;
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS
    idx_schedule_form_supervisor_queue
ON schedule_form_details (
    submitted_to_supervisor_id,
    status,
    submitted_at
);

CREATE INDEX IF NOT EXISTS
    idx_schedule_form_incharge_queue
ON schedule_form_details (
    forwarded_to_incharge_id,
    status,
    forwarded_at
);
