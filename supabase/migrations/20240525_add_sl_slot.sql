
INSERT INTO time_slots (name, start_time, end_time) VALUES
('S-L', '09:00', '21:00')
ON CONFLICT (name) DO NOTHING;
