-- ===================================
-- MASTER MIGRATION SCRIPT
-- ===================================
-- Consolidates all prior migration_* SQL scripts into a single file.
-- Safe to run against an existing database: every DDL uses IF NOT EXISTS
-- or column-existence checks to remain idempotent.
-- Sections:
--   1) Social / Friends features
--   2) Cardio + Workout routines schema
--   3) Routine import enhancements
--   4) Tracked exercises table & seed data
-- ===================================

USE fitness_tracker;

-- ===================================
-- 1. SOCIAL / FRIENDS FEATURE MIGRATION
-- ===================================

ALTER TABLE Users 
ADD COLUMN IF NOT EXISTS profile_visibility ENUM('public', 'friends_only', 'private') DEFAULT 'public',
ADD COLUMN IF NOT EXISTS show_stats_to_friends BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_workouts_to_friends BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_routines_to_public BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(255);

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
    UNIQUE KEY unique_friend_request (sender_id, receiver_id),
    INDEX idx_sender (sender_id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS Friends (
    friendship_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_friendship (user_id, friend_id),
    INDEX idx_user (user_id),
    INDEX idx_friend (friend_id)
);

ALTER TABLE WorkoutRoutines
ADD COLUMN IF NOT EXISTS visibility ENUM('public', 'friends_only', 'private') DEFAULT 'private';

CREATE OR REPLACE VIEW UserWorkoutStats AS
SELECT 
    u.user_id,
    u.username,
    u.first_name,
    u.last_name,
    COUNT(DISTINCT w.workout_id) AS total_workouts,
    COUNT(DISTINCT w.date) AS total_workout_days,
    COUNT(DISTINCT e.exercise_id) AS total_exercises_logged,
    COALESCE(SUM(e.sets), 0) AS total_sets,
    COALESCE(SUM(e.sets * e.reps * e.weight), 0) AS total_volume_lbs,
    MIN(w.date) AS first_workout_date,
    MAX(w.date) AS last_workout_date,
    COUNT(DISTINCT wr.routine_id) AS total_routines_created
FROM Users u
LEFT JOIN Workouts w ON u.user_id = w.user_id
LEFT JOIN Exercises e ON w.workout_id = e.workout_id AND e.exercise_type = 'strength'
LEFT JOIN WorkoutRoutines wr ON u.user_id = wr.user_id AND wr.is_imported = FALSE
GROUP BY u.user_id, u.username, u.first_name, u.last_name;

CREATE OR REPLACE VIEW WorkoutActivityFeed AS
SELECT 
    w.workout_id,
    w.user_id,
    u.username,
    u.first_name,
    u.last_name,
    w.date AS workout_date,
    w.notes AS workout_notes,
    COUNT(DISTINCT e.exercise_id) AS exercises_count,
    COUNT(DISTINCT e.body_part_id) AS body_parts_count,
    COALESCE(SUM(CASE WHEN e.exercise_type = 'strength' THEN e.sets ELSE 0 END), 0) AS total_sets,
    COALESCE(SUM(CASE WHEN e.exercise_type = 'strength' THEN e.sets * e.reps * e.weight ELSE 0 END), 0) AS total_volume
FROM Workouts w
JOIN Users u ON w.user_id = u.user_id
LEFT JOIN Exercises e ON w.workout_id = e.workout_id
GROUP BY w.workout_id, w.user_id, u.username, u.first_name, u.last_name, w.date, w.notes
ORDER BY w.date DESC;

CREATE INDEX IF NOT EXISTS idx_users_username ON Users(username);
CREATE INDEX IF NOT EXISTS idx_users_profile_visibility ON Users(profile_visibility);
CREATE INDEX IF NOT EXISTS idx_routines_visibility ON WorkoutRoutines(visibility);

-- ===================================
-- 2. CARDIO + WORKOUT ROUTINES SCHEMA
-- ===================================

SET @dbname = DATABASE();
SET @tablename = 'Exercises';

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'duration_minutes';
SET @query = IF(@col_exists = 0, 'ALTER TABLE Exercises ADD COLUMN duration_minutes FLOAT NULL COMMENT "Duration in minutes for cardio exercises"', 'SELECT "Column duration_minutes already exists" AS message');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'distance_miles';
SET @query = IF(@col_exists = 0, 'ALTER TABLE Exercises ADD COLUMN distance_miles FLOAT NULL COMMENT "Distance in miles for cardio exercises"', 'SELECT "Column distance_miles already exists" AS message');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'distance_km';
SET @query = IF(@col_exists = 0, 'ALTER TABLE Exercises ADD COLUMN distance_km FLOAT NULL COMMENT "Distance in kilometers for cardio exercises"', 'SELECT "Column distance_km already exists" AS message');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'intensity';
SET @query = IF(@col_exists = 0, 'ALTER TABLE Exercises ADD COLUMN intensity VARCHAR(20) NULL COMMENT "Intensity level: Low, Moderate, High"', 'SELECT "Column intensity already exists" AS message');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'calories_burned';
SET @query = IF(@col_exists = 0, 'ALTER TABLE Exercises ADD COLUMN calories_burned INT NULL COMMENT "Estimated calories burned"', 'SELECT "Column calories_burned already exists" AS message');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'exercise_type';
SET @query = IF(@col_exists = 0, 'ALTER TABLE Exercises ADD COLUMN exercise_type ENUM("strength", "cardio") DEFAULT "strength" COMMENT "Type of exercise"', 'SELECT "Column exercise_type already exists" AS message');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE Exercises 
MODIFY COLUMN sets INT NULL COMMENT 'Number of sets (NULL for cardio)',
MODIFY COLUMN reps INT NULL COMMENT 'Number of reps (NULL for cardio)',
MODIFY COLUMN weight FLOAT NULL COMMENT 'Weight lifted (NULL for cardio)';

UPDATE Exercises SET exercise_type = 'strength' WHERE exercise_type IS NULL;

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

SET @tablename = 'WorkoutRoutines';

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'share_token';
SET @query = IF(@col_exists = 0, 'ALTER TABLE WorkoutRoutines ADD COLUMN share_token VARCHAR(32) NULL UNIQUE, ADD INDEX idx_share_token (share_token)', 'SELECT "Column share_token already exists" AS message');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'is_imported';
SET @query = IF(@col_exists = 0, 'ALTER TABLE WorkoutRoutines ADD COLUMN is_imported BOOLEAN DEFAULT FALSE', 'SELECT "Column is_imported already exists" AS message');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'imported_from_user_id';
SET @query = IF(@col_exists = 0, 'ALTER TABLE WorkoutRoutines ADD COLUMN imported_from_user_id INT NULL, ADD INDEX idx_imported_from_user (imported_from_user_id), ADD FOREIGN KEY (imported_from_user_id) REFERENCES Users(user_id) ON DELETE SET NULL', 'SELECT "Column imported_from_user_id already exists" AS message');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===================================
-- 3. ROUTINE IMPORT ENHANCEMENTS
-- ===================================

ALTER TABLE WorkoutRoutines 
ADD COLUMN IF NOT EXISTS name VARCHAR(100) AFTER user_id,
ADD COLUMN IF NOT EXISTS original_routine_id INT AFTER is_imported,
ADD COLUMN IF NOT EXISTS original_user_id INT AFTER original_routine_id;

ALTER TABLE WorkoutRoutines 
ADD CONSTRAINT IF NOT EXISTS fk_original_routine 
    FOREIGN KEY (original_routine_id) REFERENCES WorkoutRoutines(routine_id) ON DELETE SET NULL;

ALTER TABLE WorkoutRoutines 
ADD CONSTRAINT IF NOT EXISTS fk_original_user 
    FOREIGN KEY (original_user_id) REFERENCES Users(user_id) ON DELETE SET NULL;

UPDATE WorkoutRoutines SET name = routine_name WHERE name IS NULL;

ALTER TABLE WorkoutRoutines MODIFY COLUMN name VARCHAR(100) NOT NULL;

CREATE INDEX IF NOT EXISTS idx_routines_original_routine ON WorkoutRoutines(original_routine_id);
CREATE INDEX IF NOT EXISTS idx_routines_original_user ON WorkoutRoutines(original_user_id);
CREATE INDEX IF NOT EXISTS idx_routines_is_imported ON WorkoutRoutines(is_imported);

-- ===================================
-- 4. TRACKED EXERCISES TABLE
-- ===================================

CREATE TABLE IF NOT EXISTS TrackedExercises (
    tracked_exercise_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    exercise_name VARCHAR(100) NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tracked_exercise_user
        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT unique_user_exercise 
        UNIQUE (user_id, exercise_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_user_tracked_exercises ON TrackedExercises(user_id, display_order);

INSERT IGNORE INTO TrackedExercises (user_id, exercise_name, display_order)
SELECT DISTINCT 
    e.user_id,
    'Bench Press' AS exercise_name,
    1 AS display_order
FROM Exercises e
INNER JOIN StandardExercises se ON e.standard_exercise_id = se.standard_exercise_id
WHERE se.exercise_name = 'Bench Press';

INSERT IGNORE INTO TrackedExercises (user_id, exercise_name, display_order)
SELECT DISTINCT 
    e.user_id,
    'Squats' AS exercise_name,
    2 AS display_order
FROM Exercises e
INNER JOIN StandardExercises se ON e.standard_exercise_id = se.standard_exercise_id
WHERE se.exercise_name = 'Squats';

INSERT IGNORE INTO TrackedExercises (user_id, exercise_name, display_order)
SELECT DISTINCT 
    e.user_id,
    'Deadlift' AS exercise_name,
    3 AS display_order
FROM Exercises e
INNER JOIN StandardExercises se ON e.standard_exercise_id = se.standard_exercise_id
WHERE se.exercise_name = 'Deadlift';

-- ===================================
-- 5. WORKOUT DATE UNIQUENESS SAFEGUARD
-- ===================================

DELETE w1 FROM Workouts w1
JOIN Workouts w2 ON w1.user_id = w2.user_id
  AND w1.date = w2.date
  AND w1.workout_id > w2.workout_id;

SET @dbname = DATABASE();

SET @index_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'Workouts'
      AND INDEX_NAME = 'idx_user_date'
);
SET @query = IF(@index_exists > 0,
    'ALTER TABLE Workouts DROP INDEX idx_user_date',
    'SELECT "Index idx_user_date missing" AS message'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @unique_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'Workouts'
      AND INDEX_NAME = 'uq_workouts_user_date'
);
SET @query = IF(@unique_exists = 0,
    'ALTER TABLE Workouts ADD UNIQUE INDEX uq_workouts_user_date (user_id, date)',
    'SELECT "Unique index uq_workouts_user_date already exists" AS message'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

DELETE ce1 FROM CustomExercises ce1
JOIN CustomExercises ce2 ON ce1.user_id = ce2.user_id
  AND ce1.exercise_name = ce2.exercise_name
  AND ce1.custom_exercise_id > ce2.custom_exercise_id;

SET @unique_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'CustomExercises'
      AND INDEX_NAME = 'uq_custom_exercise_user_name'
);
SET @query = IF(@unique_exists = 0,
    'ALTER TABLE CustomExercises ADD UNIQUE INDEX uq_custom_exercise_user_name (user_id, exercise_name)',
    'SELECT "Unique index uq_custom_exercise_user_name already exists" AS message'
);
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ===================================
-- MIGRATION COMPLETE
-- ===================================
SELECT 'Combined migrations executed successfully!' AS status;


