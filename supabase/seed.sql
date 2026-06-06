-- Insert Skills
INSERT INTO skills (name) VALUES
('3レジ'),
('4レジ'),
('1レジ'),
('2レジ'),
('日配')
ON CONFLICT (name) DO NOTHING;

-- Insert Time Slots
INSERT INTO time_slots (name, start_time, end_time) VALUES
('S-13', '09:00', '13:00'),
('S-17', '09:00', '17:00'),
('13-17', '13:00', '17:00'),
('13-L', '13:00', '21:00'),
('16-L', '16:00', '21:00'),
('17-L', '17:00', '21:00')
ON CONFLICT DO NOTHING;
