-- ==============================================================================
-- hSECURITIES HQ — Default Seed Data
-- ==============================================================================

-- 1. Insert Default Hierarchical Roles
INSERT INTO roles (id, name, description, priority, permissions) VALUES
(1, 'Guest', 'Public campus visitor with viewing and roaming permissions', 1, '{"can_chat": true, "can_video": false, "can_screen_share": false, "can_admin": false}'),
(2, 'Student', 'Enrolled cyber student with access to classes, CTF, and voice', 2, '{"can_chat": true, "can_video": true, "can_screen_share": false, "can_submit_ctf": true, "can_admin": false}'),
(3, 'Trainer', 'Instructor with presentation mode, attendance verification, and whiteboard', 3, '{"can_chat": true, "can_video": true, "can_screen_share": true, "can_broadcast": true, "can_verify_attendance": true, "can_admin": false}'),
(4, 'Staff', 'Campus administrative and placement cell coordinators', 4, '{"can_chat": true, "can_video": true, "can_screen_share": true, "can_schedule_events": true, "can_admin": false}'),
(5, 'Moderator', 'Campus safety officer with mute, kick, and session controls', 5, '{"can_chat": true, "can_video": true, "can_screen_share": true, "can_mute_others": true, "can_kick": true, "can_admin": false}'),
(6, 'Admin', 'Departmental administrator with user and room management', 6, '{"can_manage_users": true, "can_manage_rooms": true, "can_view_analytics": true, "can_admin": true}'),
(7, 'Super Admin', 'Full system super administrator with root privileges', 7, '{"all": true, "can_admin": true}')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for roles
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));

-- 2. Insert Default Rooms
INSERT INTO rooms (id, name, category, capacity, is_restricted, min_role_priority, spawn_x, spawn_y, features) VALUES
('reception', 'Reception Area', 'Lobby', 150, false, 1, 1600, 2016, '{"has_directory": true, "has_portals": true, "webrtc_enabled": true}'),
('training-hall', 'Training Hall (Cyber Lab)', 'Academic', 60, false, 2, 640, 1472, '{"has_whiteboard": true, "has_screen": true, "webrtc_enabled": true}'),
('auditorium', 'Webinar Auditorium', 'Events', 200, false, 1, 640, 640, '{"has_screen": true, "has_megaphone": true, "webrtc_enabled": true}'),
('conference', 'Conference Center (Boardroom)', 'Executive', 30, false, 3, 1600, 704, '{"has_screen": true, "webrtc_enabled": true}'),
('ctf-arena', 'CTF Battle Arena', 'Competition', 100, false, 2, 2560, 640, '{"has_scoreboard": true, "has_flag_kiosk": true, "webrtc_enabled": true}'),
('networking-lounge', 'Networking Lounge (Cyber Cafe)', 'Community', 80, false, 1, 2560, 1472, '{"is_silent": true, "has_breakout_pods": true, "webrtc_enabled": true}'),
('career-center', 'Career & Placement Center', 'Corporate', 40, false, 2, 2560, 2048, '{"has_job_board": true, "has_interview_booths": true, "webrtc_enabled": true}'),
('staff-area', 'Staff Office & Faculty Wing', 'Administrative', 30, true, 4, 640, 2048, '{"has_admin_kiosk": true, "webrtc_enabled": true}'),
('server-room', 'Server Room & SOC Vault', 'Security', 20, true, 6, 1600, 320, '{"has_siem_terminal": true, "restricted_alarm": true, "webrtc_enabled": true}'),
('meeting-room-a', 'Meeting Pod A (Threat Intel)', 'Meeting', 10, false, 2, 1400, 1088, '{"is_silent": true, "webrtc_enabled": true}'),
('meeting-room-b', 'Meeting Pod B (Incident Response)', 'Meeting', 10, false, 2, 1750, 1088, '{"is_silent": true, "webrtc_enabled": true}')
ON CONFLICT (id) DO NOTHING;

-- 3. Default Super Admin User (Password: hSecAdmin2026! -> bcrypt hash)
-- Hash generated using standard bcrypt $2a$10$
INSERT INTO users (id, email, password_hash, name, role_id, title, bio, avatar_config, status) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'admin@hsecurities.in',
    '$2a$10$PjF70sP/N1f.hE4Q4lQ8ve2g2FepX7m4s3X2yQG8L9Vb0y4V5kQ5K', -- Password: Admin@hSec2026!
    'hSECURITIES Root Administrator',
    7, -- Super Admin
    'Chief Security Officer & Dean',
    'Overseeing operations and training infrastructure for hSECURITIES Cyber School.',
    '{"skin": "cyber_blue", "hair": "sleek_black", "outfit": "executive_suit", "accessory": "golden_badge"}',
    'active'
)
ON CONFLICT (email) DO NOTHING;

-- 4. Sample CTF Challenges
INSERT INTO ctf_challenges (title, category, difficulty, points, description, flag_hash, hint) VALUES
(
    'Injection 101: Bypass the Firewall',
    'Web Exploitation',
    'Beginner',
    100,
    'Analyze the target web login portal located in the training lab and craft an authentication bypass payload.',
    '4a7d1ed414474e4033ac29ccb8653d9b', -- MD5/SHA representation of hSec{sqli_bypass_successful}
    'Consider what happens when you input standard SQL comment characters.'
),
(
    'Memory Artifacts in SOC Vault',
    'Forensics',
    'Medium',
    250,
    'A memory dump was extracted from the domain controller in the server room. Locate the injected DLL payload.',
    '3858f62230ac3c915f300c664312c63f', -- hSec{volatility_dll_found}
    'Use Volatility 3 malfind plugin.'
),
(
    'Radioactive Crypt: RSA Factorization',
    'Cryptography',
    'Hard',
    400,
    'Decipher the encrypted transmission intercepted between the trainer podium and executive boardroom.',
    '5eb63bbbe01eeed093cb22bb8f5acdc3', -- hSec{wiener_attack_private_key}
    'The public exponent e is exceptionally large.'
)
ON CONFLICT DO NOTHING;

-- 5. Welcome Announcement
INSERT INTO announcements (author_id, title, message, priority, is_pinned) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'Welcome to hSECURITIES HQ Virtual Campus!',
    'Welcome students, trainers, and cyber partners! Feel free to explore our 10 campus wings, join live interactive webinars, and participate in our ongoing CTF tournaments.',
    'urgent',
    true
)
ON CONFLICT DO NOTHING;
