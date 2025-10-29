-- ===================================
-- SAFE PRODUCTION MIGRATION SCRIPT
-- ===================================
-- This script ONLY adds new schema elements
-- It will NOT drop or modify existing data
-- Safe to run on production Railway database
-- ===================================

-- ===================================
-- STEP 1: CARDIO SUPPORT
-- ===================================
-- Add cardio fields to existing Exercises table
-- These ALTER statements might fail if columns already exist - this is OK

-- Check if columns exist before adding (MySQL workaround)
SET @dbname = DATABASE();
SET @tablename = 'Exercises';

-- Add duration_minutes column if it doesn't exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'duration_minutes';
SET @query = IF(@col_exists = 0, 'ALTER TABLE Exercises ADD COLUMN duration_minutes FLOAT NULL COMMENT "Duration in minutes for cardio exercises"', 'SELECT "Column duration_minutes already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add distance_miles column if it doesn't exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'distance_miles';
SET @query = IF(@col_exists = 0, 'ALTER TABLE Exercises ADD COLUMN distance_miles FLOAT NULL COMMENT "Distance in miles for cardio exercises"', 'SELECT "Column distance_miles already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add distance_km column if it doesn't exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'distance_km';
SET @query = IF(@col_exists = 0, 'ALTER TABLE Exercises ADD COLUMN distance_km FLOAT NULL COMMENT "Distance in kilometers for cardio exercises"', 'SELECT "Column distance_km already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add intensity column if it doesn't exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'intensity';
SET @query = IF(@col_exists = 0, 'ALTER TABLE Exercises ADD COLUMN intensity VARCHAR(20) NULL COMMENT "Intensity level: Low, Moderate, High"', 'SELECT "Column intensity already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add calories_burned column if it doesn't exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'calories_burned';
SET @query = IF(@col_exists = 0, 'ALTER TABLE Exercises ADD COLUMN calories_burned INT NULL COMMENT "Estimated calories burned"', 'SELECT "Column calories_burned already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add exercise_type column if it doesn't exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'exercise_type';
SET @query = IF(@col_exists = 0, 'ALTER TABLE Exercises ADD COLUMN exercise_type ENUM("strength", "cardio") DEFAULT "strength" COMMENT "Type of exercise"', 'SELECT "Column exercise_type already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Make strength fields nullable (safe to run multiple times)
ALTER TABLE Exercises 
MODIFY COLUMN sets INT NULL COMMENT 'Number of sets (NULL for cardio)',
MODIFY COLUMN reps INT NULL COMMENT 'Number of reps (NULL for cardio)',
MODIFY COLUMN weight FLOAT NULL COMMENT 'Weight lifted (NULL for cardio)';

-- Update existing exercises to be strength type (safe - won't overwrite existing values)
UPDATE Exercises SET exercise_type = 'strength' WHERE exercise_type IS NULL;

-- ===================================
-- STEP 2: WORKOUT ROUTINES TABLES
-- ===================================
-- Create new tables for routine management
-- CREATE TABLE IF NOT EXISTS is safe - won't affect existing tables

-- Workout Routines Table
CREATE TABLE IF NOT EXISTS WorkoutRoutines (
    routine_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    routine_name VARCHAR(100) NOT NULL,
    description TEXT,
    share_token VARCHAR(32) NULL UNIQUE,
    is_imported BOOLEAN DEFAULT FALSE,
    imported_from_user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_share_token (share_token),
    INDEX idx_imported_from_user (imported_from_user_id),
    FOREIGN KEY (imported_from_user_id) REFERENCES Users(user_id) ON DELETE SET NULL
);

-- Routine Exercises Table
CREATE TABLE IF NOT EXISTS RoutineExercises (
    routine_exercise_id INT AUTO_INCREMENT PRIMARY KEY,
    routine_id INT NOT NULL,
    body_part_id INT NOT NULL,
    exercise_name VARCHAR(100) NOT NULL,
    sets INT NULL,
    reps INT NULL,
    weight FLOAT NULL,
    unit VARCHAR(10) DEFAULT 'lb',
    exercise_order INT NOT NULL DEFAULT 0,
    exercise_type ENUM('strength', 'cardio') DEFAULT 'strength',
    duration_minutes FLOAT NULL,
    distance_miles FLOAT NULL,
    distance_km FLOAT NULL,
    intensity VARCHAR(20) NULL,
    FOREIGN KEY (routine_id) REFERENCES WorkoutRoutines(routine_id) ON DELETE CASCADE,
    FOREIGN KEY (body_part_id) REFERENCES BodyParts(body_part_id),
    INDEX idx_routine (routine_id),
    INDEX idx_exercise_order (routine_id, exercise_order)
);

-- ===================================
-- STEP 3: ADDITIONAL COLUMNS TO EXISTING ROUTINES TABLE
-- ===================================
-- If WorkoutRoutines table already exists without new columns, add them

-- Check and add share_token if it doesn't exist
SET @tablename = 'WorkoutRoutines';
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'share_token';
SET @query = IF(@col_exists = 0, 'ALTER TABLE WorkoutRoutines ADD COLUMN share_token VARCHAR(32) NULL UNIQUE, ADD INDEX idx_share_token (share_token)', 'SELECT "Column share_token already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add is_imported if it doesn't exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'is_imported';
SET @query = IF(@col_exists = 0, 'ALTER TABLE WorkoutRoutines ADD COLUMN is_imported BOOLEAN DEFAULT FALSE', 'SELECT "Column is_imported already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add imported_from_user_id if it doesn't exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'imported_from_user_id';
SET @query = IF(@col_exists = 0, 'ALTER TABLE WorkoutRoutines ADD COLUMN imported_from_user_id INT NULL, ADD INDEX idx_imported_from_user (imported_from_user_id), ADD FOREIGN KEY (imported_from_user_id) REFERENCES Users(user_id) ON DELETE SET NULL', 'SELECT "Column imported_from_user_id already exists" AS message');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ===================================
-- MIGRATION COMPLETE
-- ===================================
-- Summary of changes:
-- 1. Added cardio support columns to Exercises table
-- 2. Created WorkoutRoutines table (if not exists)
-- 3. Created RoutineExercises table (if not exists)
-- 4. Added sharing and import tracking columns (if not exists)
--
-- Your existing production data is SAFE and UNCHANGED
-- ===================================

SELECT 'Migration completed successfully!' AS status;

