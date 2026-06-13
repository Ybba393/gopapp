-- Add opens_at column to standalone_forms
-- NULL = not yet opened (locked). Set a date to unlock the form for students.

ALTER TABLE public.standalone_forms
ADD COLUMN IF NOT EXISTS opens_at timestamptz DEFAULT NULL;
