-- Add opens_at control columns to program_days
-- Mrs. Sykes sets these from the Exit Tickets tab to control
-- exactly when check-in and exit tickets become available.

ALTER TABLE public.program_days
ADD COLUMN IF NOT EXISTS checkin_opens_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS exit_ticket_opens_at timestamptz DEFAULT NULL;
