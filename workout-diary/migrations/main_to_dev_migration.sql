-- ===================================
-- MIGRATION: MAIN TO DEV BRANCH
-- ===================================
-- This migration updates the database schema from main branch to dev branch
-- Based on git diff between main and dev branches
-- Run this after init_db.sql when deploying dev branch
-- ===================================

SET @dbname = DATABASE();

-- ===================================
-- 1. USERS TABLE - ADD PRIVACY & SOCIAL FIELDS
-- ===================================

-- Add profile_visibility ENUM
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'profile_visibility';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE Users ADD COLUMN profile_visibility ENUM(''public'', ''friends_only'', ''private'') DEFAULT ''public'' COMMENT ''Profile visibility setting''', 
    'SELECT "Column profile_visibility already exists" AS message');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add show_stats_to_friends BOOLEAN
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'show_stats_to_friends';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE Users ADD COLUMN show_stats_to_friends BOOLEAN DEFAULT TRUE COMMENT ''Allow friends to see workout stats''', 
    'SELECT "Column show_stats_to_friends already exists" AS message');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add show_workouts_to_friends BOOLEAN
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'show_workouts_to_friends';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE Users ADD COLUMN show_workouts_to_friends BOOLEAN DEFAULT TRUE COMMENT ''Allow friends to see workouts''', 
    'SELECT "Column show_workouts_to_friends already exists" AS message');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add show_routines_to_public BOOLEAN
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'show_routines_to_public';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE Users ADD COLUMN show_routines_to_public BOOLEAN DEFAULT TRUE COMMENT ''Allow public to see routines''', 
    'SELECT "Column show_routines_to_public already exists" AS message');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add bio TEXT
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'bio';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE Users ADD COLUMN bio TEXT COMMENT ''User bio/profile description''', 
    'SELECT "Column bio already exists" AS message');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add profile_picture_url VARCHAR(255)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'profile_picture_url';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE Users ADD COLUMN profile_picture_url VARCHAR(255) COMMENT ''URL to user profile picture''', 
    'SELECT "Column profile_picture_url already exists" AS message');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===================================
-- 2. WORKOUTROUTINES TABLE - ADD VISIBILITY & SOFT DELETE
-- ===================================

-- Add visibility ENUM
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'WorkoutRoutines' AND COLUMN_NAME = 'visibility';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE WorkoutRoutines ADD COLUMN visibility ENUM(''public'', ''friends_only'', ''private'') DEFAULT ''private'' COMMENT ''Routine visibility setting''', 
    'SELECT "Column visibility already exists" AS message');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add is_deleted BOOLEAN with index
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'WorkoutRoutines' AND COLUMN_NAME = 'is_deleted';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE WorkoutRoutines ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE NOT NULL COMMENT ''Soft delete flag for imported routines'', ADD INDEX idx_is_deleted (is_deleted)', 
    'SELECT "Column is_deleted already exists" AS message');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add deleted_at TIMESTAMP
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'WorkoutRoutines' AND COLUMN_NAME = 'deleted_at';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE WorkoutRoutines ADD COLUMN deleted_at TIMESTAMP NULL COMMENT ''Timestamp when routine was soft-deleted''', 
    'SELECT "Column deleted_at already exists" AS message');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===================================
-- 3. CREATE ROUTINESESSIONS TABLE
-- ===================================

CREATE TABLE IF NOT EXISTS RoutineSessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    routine_id INT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NULL,
    total_exercises INT NOT NULL,
    completed_exercises INT DEFAULT 0,
    is_fully_completed BOOLEAN DEFAULT FALSE,
    completion_percentage FLOAT DEFAULT 0.0,
    workout_date DATE NOT NULL,
    duration_minutes FLOAT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (routine_id) REFERENCES WorkoutRoutines(routine_id) ON DELETE CASCADE,
    INDEX idx_user_routine (user_id, routine_id),
    INDEX idx_workout_date (workout_date),
    INDEX idx_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- 4. CREATE ROUTINESTATS TABLE
-- ===================================

CREATE TABLE IF NOT EXISTS RoutineStats (
    stat_id INT AUTO_INCREMENT PRIMARY KEY,
    routine_id INT NOT NULL UNIQUE,
    times_copied INT NOT NULL DEFAULT 0,
    total_completions_all_users INT NOT NULL DEFAULT 0,
    active_users_count INT NOT NULL DEFAULT 0,
    popularity_score FLOAT NOT NULL DEFAULT 0.0,
    total_volume_all_users FLOAT NOT NULL DEFAULT 0.0,
    average_completion_time FLOAT NULL,
    last_used_by_anyone TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (routine_id) REFERENCES WorkoutRoutines(routine_id) ON DELETE CASCADE,
    INDEX idx_routine (routine_id),
    INDEX idx_popularity (popularity_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- 5. CREATE USERRoutinestats TABLE
-- ===================================

CREATE TABLE IF NOT EXISTS UserRoutineStats (
    user_routine_stat_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    routine_id INT NOT NULL,
    times_completed INT NOT NULL DEFAULT 0,
    last_used TIMESTAMP NULL,
    first_used TIMESTAMP NULL,
    total_volume_lifted FLOAT NOT NULL DEFAULT 0.0,
    total_exercises_completed INT NOT NULL DEFAULT 0,
    average_duration FLOAT NULL,
    full_completions INT NOT NULL DEFAULT 0,
    partial_completions INT NOT NULL DEFAULT 0,
    best_completion_time FLOAT NULL,
    personal_record_volume FLOAT NULL,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (routine_id) REFERENCES WorkoutRoutines(routine_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_routine_stats (user_id, routine_id),
    INDEX idx_user (user_id),
    INDEX idx_routine (routine_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- 6. CREATE FRIENDREQUESTS TABLE
-- ===================================

CREATE TABLE IF NOT EXISTS FriendRequests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    INDEX idx_sender (sender_id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- 7. CREATE FRIENDS TABLE
-- ===================================

CREATE TABLE IF NOT EXISTS Friends (
    friendship_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_friend (friend_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- 8. CREATE BLOCKS TABLE
-- ===================================

CREATE TABLE IF NOT EXISTS Blocks (
    block_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    blocked_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_block (user_id, blocked_user_id),
    INDEX idx_user (user_id),
    INDEX idx_blocked_user (blocked_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- 9. CREATE TRACKEDEXERCISES TABLE (if not exists from previous migrations)
-- ===================================

CREATE TABLE IF NOT EXISTS TrackedExercises (
    tracked_exercise_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    exercise_name VARCHAR(100) NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_exercise (user_id, exercise_name),
    INDEX idx_user_display_order (user_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- MIGRATION COMPLETE
-- ===================================

SELECT 'Migration from main to dev branch completed successfully!' AS status;

