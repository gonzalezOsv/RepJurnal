-- ===================================
-- SIMPLE PRODUCTION MIGRATION SCRIPT
-- ===================================
-- This is a simplified version that adds new features
-- Run this if the main migration script has issues
-- Some statements may error if columns exist - this is OK
-- ===================================

-- STEP 1: Add cardio support columns to Exercises table
ALTER TABLE Exercises ADD COLUMN duration_minutes FLOAT NULL COMMENT 'Duration in minutes for cardio exercises';
ALTER TABLE Exercises ADD COLUMN distance_miles FLOAT NULL COMMENT 'Distance in miles for cardio exercises';
ALTER TABLE Exercises ADD COLUMN distance_km FLOAT NULL COMMENT 'Distance in kilometers for cardio exercises';
ALTER TABLE Exercises ADD COLUMN intensity VARCHAR(20) NULL COMMENT 'Intensity level: Low, Moderate, High';
ALTER TABLE Exercises ADD COLUMN calories_burned INT NULL COMMENT 'Estimated calories burned';
ALTER TABLE Exercises ADD COLUMN exercise_type ENUM('strength', 'cardio') DEFAULT 'strength' COMMENT 'Type of exercise';

-- Make strength fields nullable
ALTER TABLE Exercises 
MODIFY COLUMN sets INT NULL COMMENT 'Number of sets (NULL for cardio)',
MODIFY COLUMN reps INT NULL COMMENT 'Number of reps (NULL for cardio)',
MODIFY COLUMN weight FLOAT NULL COMMENT 'Weight lifted (NULL for cardio)';

-- Update existing exercises
UPDATE Exercises SET exercise_type = 'strength' WHERE exercise_type IS NULL;

-- STEP 2: Create WorkoutRoutines table
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

-- STEP 3: Create RoutineExercises table
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
-- MIGRATION COMPLETE
-- ===================================
-- NOTE: Some ALTER TABLE statements may show errors if columns already exist
-- This is NORMAL and SAFE - your data is protected
-- ===================================

