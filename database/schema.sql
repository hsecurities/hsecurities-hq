-- ==============================================================================
-- hSECURITIES HQ — PostgreSQL Database Schema
-- Domain: office.hsecurities.in
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES TABLE (Hierarchical RBAC)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    priority INT NOT NULL DEFAULT 1, -- 1=Guest, 7=Super Admin
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    title VARCHAR(100) DEFAULT 'Student / Member',
    bio TEXT DEFAULT '',
    avatar_config JSONB NOT NULL DEFAULT '{
        "skin": "cyber_blue",
        "hair": "sleek_black",
        "outfit": "security_suit",
        "accessory": "headset"
    }',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. VIRTUAL CAMPUS ROOMS
CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    capacity INT NOT NULL DEFAULT 50,
    is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    min_role_priority INT NOT NULL DEFAULT 1, -- Minimum role priority required to enter
    spawn_x INT NOT NULL DEFAULT 1600,
    spawn_y INT NOT NULL DEFAULT 2016,
    features JSONB NOT NULL DEFAULT '{
        "has_screen": false,
        "has_whiteboard": false,
        "has_megaphone": false,
        "is_silent": false,
        "webrtc_enabled": true
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. ACTIVE CAMPUS SESSIONS & PRESENCE
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id VARCHAR(50) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    socket_id VARCHAR(100),
    x_pos INT DEFAULT 0,
    y_pos INT DEFAULT 0,
    is_mic_on BOOLEAN DEFAULT FALSE,
    is_cam_on BOOLEAN DEFAULT FALSE,
    is_screen_sharing BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INT DEFAULT 0,
    ip_address VARCHAR(45)
);

-- 5. ATTENDANCE TRACKING (Education Module)
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id VARCHAR(50) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP WITH TIME ZONE,
    total_minutes INT DEFAULT 0,
    verified_by_trainer BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, room_id, session_date)
);

-- 6. SCHEDULED EVENTS & WEBINARS
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    room_id VARCHAR(50) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    max_attendees INT DEFAULT 100,
    presentation_url VARCHAR(500),
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. CTF ARENA CHALLENGES & CYBER RANGE
CREATE TABLE IF NOT EXISTS ctf_challenges (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Web Exploitation', 'Network Security', 'Cryptography', 'Reverse Engineering', 'Forensics', 'Privilege Escalation')),
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('Beginner', 'Easy', 'Medium', 'Hard', 'Insane')),
    points INT NOT NULL DEFAULT 100,
    description TEXT NOT NULL,
    flag_hash VARCHAR(255) NOT NULL, -- SHA-256 of flag e.g. hSec{...}
    hint TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. CTF SUBMISSIONS & TEAMS
CREATE TABLE IF NOT EXISTS ctf_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INT NOT NULL REFERENCES ctf_challenges(id) ON DELETE CASCADE,
    team_name VARCHAR(50) DEFAULT 'Independent',
    submitted_flag VARCHAR(255) NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    awarded_points INT DEFAULT 0,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. CAMPUS ANNOUNCEMENTS & BROADCASTS
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. REAL-TIME ANALYTICS SNAPSHOTS
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active_users INT NOT NULL DEFAULT 0,
    active_sessions INT NOT NULL DEFAULT 0,
    active_video_streams INT NOT NULL DEFAULT 0,
    room_distribution JSONB NOT NULL DEFAULT '{}'
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_room ON sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_ctf_submissions_user ON ctf_submissions(user_id);
