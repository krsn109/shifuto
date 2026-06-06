-- Add employee_id column to profiles table
ALTER TABLE profiles ADD COLUMN employee_id text;

-- Create a unique index on employee_id to ensure uniqueness
CREATE UNIQUE INDEX idx_profiles_employee_id ON profiles(employee_id);

-- Update existing profiles to have employee_id from email (if possible, otherwise manual update needed)
-- This is a bit tricky with pure SQL if we can't access auth.users easily here.
-- For now, we just add the column. The application logic will handle the migration or we can run a script.
