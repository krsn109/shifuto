-- Add is_emergency column to shift_assignments table
ALTER TABLE shift_assignments ADD COLUMN is_emergency BOOLEAN DEFAULT FALSE;
