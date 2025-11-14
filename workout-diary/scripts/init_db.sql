-- ===================================
-- FITNESS TRACKER - PRODUCTION SCHEMA
-- ===================================
-- This file contains ONLY the database schema and essential reference data
-- For test data, see test_data.sql
-- ===================================

-- NOTE: In production (Railway), the database already exists with a provider-specific name
-- The initialization script connects to the existing database automatically
-- For local development, uncomment these lines and update the database name:
-- CREATE DATABASE IF NOT EXISTS fitness_tracker;
-- USE fitness_tracker;

-- ===================================
-- DROP EXISTING TABLES (For clean setup)
-- ===================================
-- Drop in reverse dependency order to avoid foreign key constraints
-- IMPORTANT: Drop stats tables BEFORE routines (foreign key dependency)
DROP TABLE IF EXISTS UserRoutineStats;
DROP TABLE IF EXISTS RoutineStats;
DROP TABLE IF EXISTS RoutineSessions;
DROP TABLE IF EXISTS RoutineExercises;
DROP TABLE IF EXISTS WorkoutRoutines;
DROP TABLE IF EXISTS TrackedExercises;
DROP TABLE IF EXISTS FriendRequests;
DROP TABLE IF EXISTS Friends;
DROP TABLE IF EXISTS Exercises;
DROP TABLE IF EXISTS CustomExercises;
DROP TABLE IF EXISTS Workouts;
DROP TABLE IF EXISTS StandardExercises;
DROP TABLE IF EXISTS BodyPartCategories;  -- Drop before BodyParts (foreign key dependency)
DROP TABLE IF EXISTS BodyParts;
DROP TABLE IF EXISTS user_legal_acceptance;
DROP TABLE IF EXISTS legal_documents;
DROP TABLE IF EXISTS PhysicalStats;
DROP TABLE IF EXISTS MotivationalQuote;
DROP TABLE IF EXISTS Users;

-- Drop stored procedures (if they exist)
DROP PROCEDURE IF EXISTS RecordRoutineCompletion;
DROP PROCEDURE IF EXISTS IncrementRoutineCopyCount;
DROP PROCEDURE IF EXISTS UpdateRoutinePopularity;

-- ===================================
-- CREATE TABLES - SCHEMA ONLY
-- ===================================

-- Users Table (includes all fields from the start)
CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    date_of_birth DATE,
    gender ENUM('Male', 'Female', 'Other'),
    phone_number VARCHAR(20),
    address VARCHAR(255),
    height_cm FLOAT,
    weight_kg FLOAT,
    body_fat_percentage FLOAT,
    fitness_goal ENUM('Weight Loss', 'Muscle Gain', 'Maintenance', 'Improved Endurance'),
    activity_level ENUM('Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Super Active'),
    dietary_preferences VARCHAR(255),
    medical_conditions TEXT,
    allergies TEXT,
    injuries TEXT,
    target_weight_kg FLOAT,
    target_body_fat_percentage FLOAT,
    weekly_weight_loss_goal FLOAT,
    smoking_status ENUM('Non-Smoker', 'Occasional Smoker', 'Regular Smoker'),
    alcohol_consumption ENUM('None', 'Occasional', 'Moderate', 'Heavy'),
    motivation_level ENUM('Low', 'Moderate', 'High'),
    preferred_workout_time TIME,
    signup_source VARCHAR(100),
    
    -- Privacy & Social Fields
    profile_visibility ENUM('public', 'friends_only', 'private') DEFAULT 'public',
    show_stats_to_friends BOOLEAN DEFAULT TRUE,
    show_workouts_to_friends BOOLEAN DEFAULT TRUE,
    show_routines_to_public BOOLEAN DEFAULT TRUE,
    bio TEXT,
    profile_picture_url VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- Physical Stats Table
CREATE TABLE IF NOT EXISTS PhysicalStats (
    body_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    height FLOAT,
    weight FLOAT,
    body_fat_percentage FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, created_at)
);

-- Workouts Table
CREATE TABLE IF NOT EXISTS Workouts (
    workout_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    workout_name VARCHAR(50),
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    UNIQUE KEY uq_workouts_user_date (user_id, date)
);

-- Body Parts Table (Reference Data)
CREATE TABLE IF NOT EXISTS BodyParts (
    body_part_id INT AUTO_INCREMENT PRIMARY KEY,
    body_part_name VARCHAR(50) UNIQUE NOT NULL,
    INDEX idx_name (body_part_name)
);

-- Body Part Categories for Analytics
CREATE TABLE IF NOT EXISTS BodyPartCategories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    body_part_id INT NOT NULL,
    anatomical_category ENUM(
        'Chest',
        'Shoulders', 
        'Back',
        'Arms',
        'Core',
        'Legs',
        'Full Body',
        'Cardio'
    ) NOT NULL,
    muscle_group_type ENUM(
        'Push',
        'Pull',
        'Legs',
        'Core',
        'Full Body',
        'Cardio'
    ) NOT NULL,
    is_primary BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (body_part_id) REFERENCES BodyParts(body_part_id) ON DELETE CASCADE,
    INDEX idx_body_part (body_part_id),
    INDEX idx_category (anatomical_category),
    INDEX idx_muscle_type (muscle_group_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Standard Exercises Table (Reference Data)
CREATE TABLE IF NOT EXISTS StandardExercises (
    standard_exercise_id INT AUTO_INCREMENT PRIMARY KEY,
    body_part_id INT NOT NULL,
    exercise_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_compound BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (body_part_id) REFERENCES BodyParts(body_part_id),
    UNIQUE KEY unique_exercise (exercise_name, body_part_id),
    INDEX idx_body_part (body_part_id)
);

-- Custom Exercises Table
CREATE TABLE IF NOT EXISTS CustomExercises (
    custom_exercise_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    body_part_id INT NOT NULL,
    exercise_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (body_part_id) REFERENCES BodyParts(body_part_id),
    UNIQUE KEY uq_custom_exercise_user_name (user_id, exercise_name),
    INDEX idx_user (user_id)
);

-- Exercises Table (includes strength and cardio fields)
CREATE TABLE IF NOT EXISTS Exercises (
    exercise_id INT AUTO_INCREMENT PRIMARY KEY,
    workout_id INT NOT NULL,
    user_id INT NOT NULL,
    body_part_id INT,
    exercise_name VARCHAR(50),
    standard_exercise_id INT NULL,
    custom_exercise_id INT NULL,
    
    -- Exercise type
    exercise_type ENUM('strength', 'cardio') DEFAULT 'strength',
    
    -- Strength fields (nullable for cardio)
    sets INT NULL,
    reps INT NULL,
    weight FLOAT NULL,
    
    -- Cardio fields (nullable for strength)
    duration_minutes FLOAT NULL,
    distance_miles FLOAT NULL,
    distance_km FLOAT NULL,
    intensity VARCHAR(20) NULL,
    calories_burned INT NULL,
    
    date DATE NOT NULL,
    
    FOREIGN KEY (workout_id) REFERENCES Workouts(workout_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (body_part_id) REFERENCES BodyParts(body_part_id),
    FOREIGN KEY (standard_exercise_id) REFERENCES StandardExercises(standard_exercise_id),
    FOREIGN KEY (custom_exercise_id) REFERENCES CustomExercises(custom_exercise_id),
    INDEX idx_workout (workout_id),
    INDEX idx_user_date (user_id, date),
    INDEX idx_exercise_type (exercise_type)
);

-- Legal Documents Table (Reference Data)
CREATE TABLE IF NOT EXISTS legal_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_type VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    effective_date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    INDEX idx_type_active (document_type, active)
);

-- User Legal Acceptance Table
CREATE TABLE IF NOT EXISTS user_legal_acceptance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    document_id INT NOT NULL,
    accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES legal_documents(id) ON DELETE RESTRICT,
    INDEX idx_user_doc (user_id, document_id)
);

-- ===================================
-- ESSENTIAL REFERENCE DATA
-- ===================================

-- Body Parts (Required for app to function)
INSERT IGNORE INTO BodyParts (body_part_name) VALUES 
    ('Chest'),
    ('Back'),
    ('Legs'),
    ('Shoulders'),
    ('Biceps'),
    ('Triceps'),
    ('Forearms'),
    ('Abs'),
    ('Glutes'),
    ('Calves'),
    ('Neck'),
    ('Traps'),
    ('Lats'),
    ('Quads'),
    ('Hamstrings'),
    ('Deltoids'),
    ('Obliques'),
    ('Lower Back'),
    ('Upper Back'),
    ('Inner Thighs'),
    ('Outer Thighs'),
    ('Serratus Anterior'),
    ('Erector Spinae'),
    ('Rotator Cuff'),
    ('Adductors'),
    ('Abductors'),
    ('Full Body'),
    ('Core'),
    ('Cardio'),
    ('Flexibility'),
    ('Mobility'),
    ('Compound'),
    ('Rear Delts'),
    ('Pecs');

-- Standard Exercises (Required for app to function)
INSERT INTO StandardExercises (body_part_id, exercise_name, description, is_compound) VALUES
-- Chest
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 'Barbell bench press for chest development', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Incline Bench Press', 'Incline barbell press for upper chest', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Dumbbell Flyes', 'Dumbbell flyes for chest isolation', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Push-Ups', 'Bodyweight chest exercise', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Chest Dips', 'Bodyweight dip exercise for chest and triceps', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Cable Chest Press', 'Cable machine chest press for constant tension', FALSE),

-- Back
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 'Compound back exercise with barbell', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Pull-Ups', 'Bodyweight back exercise', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Bent Over Rows', 'Barbell rows for back development', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Lat Pulldown', 'Cable machine back exercise', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'T-Bar Rows', 'T-bar machine rows for back thickness', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Single-Arm Dumbbell Rows', 'Unilateral back exercise', FALSE),

-- Legs (General)
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 'Barbell squats for leg development', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Leg Press', 'Machine leg press', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Lunges', 'Unilateral leg exercise', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Bulgarian Split Squats', 'Single-leg squat variation', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Hack Squats', 'Machine squat variation', TRUE),

-- Quads
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Quads'), 'Leg Extensions', 'Machine exercise for quad isolation', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Quads'), 'Front Squats', 'Barbell front squats for quad emphasis', TRUE),

-- Hamstrings
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Hamstrings'), 'Romanian Deadlift', 'Hamstring focused deadlift variation', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Hamstrings'), 'Leg Curls', 'Machine exercise for hamstring isolation', FALSE),

-- Calves
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Calves'), 'Calf Raises', 'Standing calf raise exercise', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Calves'), 'Seated Calf Raises', 'Seated calf machine exercise', FALSE),

-- Shoulders
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Overhead Press', 'Barbell overhead press', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Lateral Raises', 'Dumbbell lateral raises', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Face Pulls', 'Cable face pulls for rear delts', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Front Raises', 'Dumbbell front raises', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Arnold Press', 'Dumbbell shoulder press with rotation', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Reverse Flyes', 'Rear delt isolation exercise', FALSE),

-- Biceps
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Biceps'), 'Bicep Curls', 'Standing bicep curls with dumbbells', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Biceps'), 'Hammer Curls', 'Neutral grip bicep curls', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Biceps'), 'Preacher Curls', 'Isolation bicep exercise', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Biceps'), 'Concentration Curls', 'Single-arm bicep isolation', FALSE),

-- Triceps
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Triceps'), 'Tricep Extensions', 'Overhead tricep extensions', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Triceps'), 'Diamond Push-Ups', 'Tricep focused push-ups', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Triceps'), 'Close-Grip Bench Press', 'Tricep-focused bench press variation', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Triceps'), 'Tricep Dips', 'Bodyweight dip exercise for triceps', TRUE),

-- Forearms
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Forearms'), 'Wrist Curls', 'Forearm flexion exercise', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Forearms'), 'Reverse Wrist Curls', 'Forearm extension exercise', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Forearms'), 'Farmers Walk', 'Grip and forearm strengthening exercise', TRUE),

-- Abs
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Abs'), 'Crunches', 'Basic ab exercise', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Abs'), 'Planks', 'Core stability exercise', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Abs'), 'Russian Twists', 'Rotational ab exercise', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Abs'), 'Leg Raises', 'Lower ab focused exercise', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Abs'), 'Hanging Knee Raises', 'Advanced ab exercise', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Abs'), 'Cable Woodchoppers', 'Rotational core exercise', FALSE),

-- Glutes
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Glutes'), 'Hip Thrusts', 'Barbell hip thrusts for glute development', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Glutes'), 'Glute Bridges', 'Bodyweight glute exercise', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Glutes'), 'Step-Ups', 'Unilateral glute and leg exercise', TRUE),

-- Full Body
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Full Body'), 'Burpees', 'Full body conditioning exercise', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Full Body'), 'Turkish Get-Up', 'Complex full body movement', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Full Body'), 'Clean and Press', 'Olympic lifting movement', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Full Body'), 'Thrusters', 'Squat and press combination', TRUE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Full Body'), 'Kettlebell Swings', 'Hip hinge and explosive movement', TRUE),

-- Core
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Core'), 'Mountain Climbers', 'Dynamic core exercise', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Core'), 'Side Planks', 'Lateral core stability exercise', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Core'), 'Ab Wheel Rollouts', 'Advanced core exercise', FALSE),

-- Cardio
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Cardio'), 'Running', 'Standard running for cardiovascular health', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Cardio'), 'Cycling', 'Indoor or outdoor cycling', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Cardio'), 'Rowing', 'Full body cardio exercise', TRUE),

-- Flexibility/Mobility
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Flexibility'), 'Yoga', 'Improves flexibility and mobility', FALSE),
((SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Flexibility'), 'Dynamic Stretching', 'Warm-up stretches for mobility', FALSE)
ON DUPLICATE KEY UPDATE 
    description = VALUES(description),
    is_compound = VALUES(is_compound);

-- Legal Documents (Required for compliance)
INSERT INTO legal_documents (document_type, version, content, active, effective_date, created_by) VALUES
-- Privacy Policy
('privacy', '1.0', '<h1>Privacy Policy</h1>
<p><strong>Last Updated:</strong> [Date]</p>
<h2>1. Information We Collect</h2>
<h3>1.1 Personal Information</h3>
<ul><li>Name and email address</li><li>Age and gender</li><li>Height and weight</li><li>Fitness goals</li></ul>
<h3>1.2 Usage Data</h3>
<ul><li>Workout records</li><li>Exercise preferences</li><li>App usage patterns</li><li>Device information</li></ul>
<h2>2. How We Use Your Information</h2>
<h3>2.1 Service Provision</h3>
<ul><li>Account management</li><li>Progress tracking</li><li>Workout recommendations</li><li>Service improvements</li></ul>
<h3>2.2 Communications</h3>
<ul><li>Service updates</li><li>Feature announcements</li><li>Support responses</li><li>Marketing (with consent)</li></ul>
<h2>3. Data Storage and Security</h2>
<h3>3.1 Storage</h3>
<ul><li>Secure servers</li><li>Encrypted transmission</li><li>Regular backups</li><li>Industry-standard protection</li></ul>
<h3>3.2 Retention</h3>
<ul><li>Active account data retained</li><li>Deleted upon account closure</li><li>Some data retained for legal purposes</li></ul>
<h2>4. Data Sharing</h2>
<h3>4.1 We Never</h3>
<ul><li>Sell your personal data</li><li>Share without consent</li><li>Use for unauthorized purposes</li></ul>
<h3>4.2 We May Share</h3>
<ul><li>For service provision</li><li>With your consent</li><li>As required by law</li></ul>
<h2>5. Your Rights</h2>
<p>You have the right to:</p>
<ul><li>Access your data</li><li>Correct inaccuracies</li><li>Delete your data</li><li>Export your data</li><li>Withdraw consent</li></ul>
<h2>6. Cookies and Tracking</h2>
<p>We use:</p>
<ul><li>Essential cookies</li><li>Analytics cookies</li><li>Preference cookies</li></ul>
<p>You can control cookie settings.</p>
<h2>7. Children\'s Privacy</h2>
<ul><li>Service not intended for under 18</li><li>We don\'t knowingly collect children\'s data</li><li>Parents can request data deletion</li></ul>
<h2>8. Changes to Policy</h2>
<ul><li>We may update this policy</li><li>Notice of significant changes</li><li>Continued use implies acceptance</li></ul>
<h2>9. Contact Us</h2>
<p>For privacy questions, contact us at [email].</p>', TRUE, CURDATE(), 'Admin'),

-- Terms and Conditions
('terms', '1.0', '<h1>Terms and Conditions</h1>
<p><strong>Last Updated:</strong> [Date]</p>
<h2>1. Acceptance of Terms</h2>
<p>By accessing and using the Fitness Tracker application ("the Service"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the Service.</p>
<h2>2. User Accounts</h2>
<h3>2.1 Registration</h3>
<ul><li>You must register for an account to use the Service</li><li>You must provide accurate and complete information</li><li>You are responsible for maintaining the security of your account</li><li>You must be at least 18 years old to use the Service</li></ul>
<h3>2.2 Account Security</h3>
<ul><li>Keep your password secure</li><li>Notify us immediately of any unauthorized access</li><li>You are responsible for all activities under your account</li></ul>
<h2>3. Service Usage</h2>
<h3>3.1 Proper Use</h3>
<ul><li>Use for personal fitness tracking only</li><li>Do not share account credentials</li><li>Do not misuse or abuse the Service</li></ul>
<h3>3.2 Prohibited Activities</h3>
<ul><li>No unauthorized access attempts</li><li>No interference with Service operation</li><li>No collection of user data</li><li>No transmission of harmful code</li></ul>
<h2>4. User Data</h2>
<h3>4.1 Data Collection</h3>
<ul><li>We collect fitness and usage data</li><li>Data is stored securely</li><li>See Privacy Policy for details</li></ul>
<h3>4.2 Data Usage</h3>
<ul><li>Used to provide and improve Service</li><li>May be anonymized for analytics</li><li>Never sold to third parties</li></ul>
<h2>5. Modifications</h2>
<h3>5.1 Service Changes</h3>
<ul><li>We may modify the Service at any time</li><li>We will notify users of significant changes</li><li>Continued use implies acceptance of changes</li></ul>
<h3>5.2 Terms Changes</h3>
<ul><li>We may update these terms</li><li>Users will be notified of changes</li><li>Continued use implies acceptance</li></ul>
<h2>6. Termination</h2>
<ul><li>We reserve the right to suspend or terminate accounts</li><li>Delete inactive accounts</li><li>Modify or discontinue the Service</li></ul>
<h2>7. Disclaimer</h2>
<p>Service provided "as is". No fitness advice guaranteed. Consult a healthcare provider before starting an exercise program.</p>
<h2>8. Limitation of Liability</h2>
<p>We are not liable for injuries during exercise, data loss or corruption, or service interruptions.</p>
<h2>9. Contact</h2>
<p>Questions about these terms should be sent to [contact email].</p>', TRUE, CURDATE(), 'Admin')
ON DUPLICATE KEY UPDATE 
    content = VALUES(content),
    active = VALUES(active);

-- ===================================
-- PRODUCTION SCHEMA COMPLETE
-- ===================================
-- For test data, run: mysql -u root -p fitness_tracker < test_data.sql
-- ===================================

-- ===================================
-- WORKOUT ROUTINES SCHEMA
-- ===================================

-- Workout Routines Table (includes all columns from the start)
CREATE TABLE IF NOT EXISTS WorkoutRoutines (
    routine_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    routine_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Sharing and import fields
    share_token VARCHAR(32) NULL UNIQUE,
    is_imported BOOLEAN DEFAULT FALSE,
    imported_from_user_id INT NULL,
    
    -- Privacy field
    visibility ENUM('public', 'friends_only', 'private') DEFAULT 'private',
    
    -- Soft delete (for imported routines - allows quick restore)
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (imported_from_user_id) REFERENCES Users(user_id) ON DELETE SET NULL,
    
    INDEX idx_user (user_id),
    INDEX idx_share_token (share_token),
    INDEX idx_imported_from_user (imported_from_user_id),
    INDEX idx_deleted (is_deleted)
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
-- WORKOUT ROUTINES SCHEMA COMPLETE
-- ===================================

-- Note: All routine sharing, import tracking, and privacy columns are now
-- included directly in the CREATE TABLE statements above.
-- No ALTER TABLE statements needed for fresh setups.

-- Create Routine Sessions table (for tracking routine usage and completion analytics)
CREATE TABLE IF NOT EXISTS RoutineSessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    routine_id INT NOT NULL,
    
    -- Session timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NULL,
    
    -- Completion tracking
    total_exercises INT NOT NULL,
    completed_exercises INT DEFAULT 0,
    is_fully_completed BOOLEAN DEFAULT FALSE,
    completion_percentage FLOAT DEFAULT 0.0,
    
    -- Session metadata
    workout_date DATE NOT NULL,
    duration_minutes FLOAT NULL,
    
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (routine_id) REFERENCES WorkoutRoutines(routine_id) ON DELETE CASCADE,
    
    INDEX idx_user (user_id),
    INDEX idx_routine (routine_id),
    INDEX idx_workout_date (workout_date),
    INDEX idx_completion (is_fully_completed)
);

-- ===================================
-- ROUTINE STATISTICS TABLES
-- ===================================
-- Public statistics for workout routines
CREATE TABLE IF NOT EXISTS RoutineStats (
    stat_id INT AUTO_INCREMENT PRIMARY KEY,
    routine_id INT NOT NULL UNIQUE,
    
    -- PUBLIC STATS (visible to everyone who can see the routine)
    times_copied INT NOT NULL DEFAULT 0 COMMENT 'How many times routine was imported by other users',
    total_completions_all_users INT NOT NULL DEFAULT 0 COMMENT 'Total completions by all users',
    active_users_count INT NOT NULL DEFAULT 0 COMMENT 'Users who used it in last 30 days',
    popularity_score FLOAT NOT NULL DEFAULT 0.0 COMMENT 'Calculated popularity metric',
    
    -- Aggregate metrics
    total_volume_all_users FLOAT NOT NULL DEFAULT 0.0 COMMENT 'Sum of all weight lifted by all users',
    average_completion_time FLOAT NULL COMMENT 'Average time to complete (minutes)',
    
    -- Timestamps
    last_used_by_anyone TIMESTAMP NULL COMMENT 'Last time anyone used this routine',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (routine_id) REFERENCES WorkoutRoutines(routine_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_routine_stats_routine_id (routine_id),
    INDEX idx_routine_stats_popularity (popularity_score),
    INDEX idx_routine_stats_times_copied (times_copied)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Public statistics for workout routines';

-- Personal statistics per user per routine
CREATE TABLE IF NOT EXISTS UserRoutineStats (
    user_routine_stat_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    routine_id INT NOT NULL,
    
    -- PERSONAL STATS (only visible to the user)
    times_completed INT NOT NULL DEFAULT 0 COMMENT 'How many times THIS user completed it',
    last_used TIMESTAMP NULL COMMENT 'Last time THIS user used it',
    first_used TIMESTAMP NULL COMMENT 'First time THIS user used it',
    
    -- Performance metrics
    total_volume_lifted FLOAT NOT NULL DEFAULT 0.0 COMMENT 'Total weight lifted by this user',
    total_exercises_completed INT NOT NULL DEFAULT 0,
    average_duration FLOAT NULL COMMENT 'Average time for this user (minutes)',
    
    -- Completion tracking
    full_completions INT NOT NULL DEFAULT 0 COMMENT '100% completed sessions',
    partial_completions INT NOT NULL DEFAULT 0 COMMENT 'Partially completed sessions',
    
    -- Best performance
    best_completion_time FLOAT NULL COMMENT 'Fastest completion (minutes)',
    personal_record_volume FLOAT NULL COMMENT 'Highest volume in single session',
    
    -- Streak tracking
    current_streak INT NOT NULL DEFAULT 0 COMMENT 'Current consecutive days/weeks',
    longest_streak INT NOT NULL DEFAULT 0 COMMENT 'Best streak ever',
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (routine_id) REFERENCES WorkoutRoutines(routine_id) ON DELETE CASCADE,
    
    -- Unique constraint: one stats record per user per routine
    UNIQUE KEY unique_user_routine_stats (user_id, routine_id),
    
    -- Indexes
    INDEX idx_user_routine_stats_user_id (user_id),
    INDEX idx_user_routine_stats_routine_id (routine_id),
    INDEX idx_user_routine_stats_times_completed (times_completed),
    INDEX idx_user_routine_stats_last_used (last_used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Personal statistics for user routine usage';

-- Create Friend Requests table
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
    
    -- Prevent duplicate requests between same users
    UNIQUE KEY unique_friend_request (sender_id, receiver_id),
    
    INDEX idx_sender (sender_id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_status (status)
);

-- Create Friends table
CREATE TABLE IF NOT EXISTS Friends (
    friendship_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    
    -- Prevent duplicate friendships
    UNIQUE KEY unique_friendship (user_id, friend_id),
    
    INDEX idx_user (user_id),
    INDEX idx_friend (friend_id)
);

-- Create User Workout Stats view
CREATE OR REPLACE VIEW UserWorkoutStats AS
SELECT 
    u.user_id,
    u.username,
    u.first_name,
    u.last_name,
    COUNT(DISTINCT w.workout_id) as total_workouts,
    COUNT(DISTINCT w.date) as total_workout_days,
    COUNT(DISTINCT e.exercise_id) as total_exercises_logged,
    COALESCE(SUM(e.sets), 0) as total_sets,
    COALESCE(SUM(e.sets * e.reps * e.weight), 0) as total_volume_lbs,
    MIN(w.date) as first_workout_date,
    MAX(w.date) as last_workout_date,
    COUNT(DISTINCT wr.routine_id) as total_routines_created
FROM Users u
LEFT JOIN Workouts w ON u.user_id = w.user_id
LEFT JOIN Exercises e ON w.workout_id = e.workout_id AND e.exercise_type = 'strength'
LEFT JOIN WorkoutRoutines wr ON u.user_id = wr.user_id AND wr.is_imported = FALSE
GROUP BY u.user_id, u.username, u.first_name, u.last_name;

-- Create Workout Activity Feed view
CREATE OR REPLACE VIEW WorkoutActivityFeed AS
SELECT 
    w.workout_id,
    w.user_id,
    u.username,
    u.first_name,
    u.last_name,
    w.date as workout_date,
    w.notes as workout_notes,
    COUNT(DISTINCT e.exercise_id) as exercises_count,
    COUNT(DISTINCT e.body_part_id) as body_parts_count,
    COALESCE(SUM(CASE WHEN e.exercise_type = 'strength' THEN e.sets ELSE 0 END), 0) as total_sets,
    COALESCE(SUM(CASE WHEN e.exercise_type = 'strength' THEN e.sets * e.reps * e.weight ELSE 0 END), 0) as total_volume
FROM Workouts w
JOIN Users u ON w.user_id = u.user_id
LEFT JOIN Exercises e ON w.workout_id = e.workout_id
GROUP BY w.workout_id, w.user_id, u.username, u.first_name, u.last_name, w.date, w.notes
ORDER BY w.date DESC;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON Users(username);
CREATE INDEX IF NOT EXISTS idx_users_profile_visibility ON Users(profile_visibility);
CREATE INDEX IF NOT EXISTS idx_routines_visibility ON WorkoutRoutines(visibility);

-- ===================================
-- SOCIAL FEATURES COMPLETE
-- ===================================

-- ===================================
-- IMPERIAL/METRIC UNITS PREFERENCE
-- Added: 2025-01-04
-- ===================================

-- Add preferred units column to Users table
-- Default to imperial since this is a US-focused app
ALTER TABLE Users 
ADD COLUMN IF NOT EXISTS preferred_units ENUM('metric', 'imperial') DEFAULT 'imperial' 
AFTER preferred_workout_time;

-- Note: height_cm and weight_kg remain the source of truth in the database
-- The frontend displays imperial primarily (ft/in, lbs) with metric as alternative
-- Users can enter values in either unit system - they auto-convert

-- ===================================
-- ANALYTICS REFERENCE DATA (LOCAL/DOCKER ONLY)
-- ===================================
-- Ensure comprehensive body parts exist (idempotent for local resets)
INSERT INTO BodyParts (body_part_name) VALUES
    ('Chest'),
    ('Upper Chest'),
    ('Lower Chest'),
    ('Shoulders'),
    ('Front Delts'),
    ('Side Delts'),
    ('Rear Delts'),
    ('Traps'),
    ('Back'),
    ('Lats'),
    ('Upper Back'),
    ('Mid Back'),
    ('Lower Back'),
    ('Biceps'),
    ('Triceps'),
    ('Forearms'),
    ('Abs'),
    ('Obliques'),
    ('Core'),
    ('Serratus'),
    ('Legs'),
    ('Quads'),
    ('Hamstrings'),
    ('Glutes'),
    ('Calves'),
    ('Hip Flexors'),
    ('Adductors'),
    ('Abductors'),
    ('Full Body'),
    ('Cardio'),
    ('Neck')
ON DUPLICATE KEY UPDATE body_part_name = VALUES(body_part_name);

-- Ensure BodyPartCategories mappings exist (idempotent)
INSERT INTO BodyPartCategories (body_part_id, anatomical_category, muscle_group_type, is_primary)
SELECT 
    bp.body_part_id,
    CASE
        WHEN bp.body_part_name IN ('Chest', 'Upper Chest', 'Lower Chest') THEN 'Chest'
        WHEN bp.body_part_name IN ('Shoulders', 'Front Delts', 'Side Delts', 'Rear Delts', 'Traps') THEN 'Shoulders'
        WHEN bp.body_part_name IN ('Back', 'Lats', 'Upper Back', 'Mid Back', 'Lower Back') THEN 'Back'
        WHEN bp.body_part_name IN ('Biceps', 'Triceps', 'Forearms') THEN 'Arms'
        WHEN bp.body_part_name IN ('Abs', 'Obliques', 'Core', 'Serratus') THEN 'Core'
        WHEN bp.body_part_name IN ('Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Hip Flexors', 'Adductors', 'Abductors') THEN 'Legs'
        WHEN bp.body_part_name = 'Full Body' THEN 'Full Body'
        WHEN bp.body_part_name IN ('Cardio', 'Neck') THEN 'Cardio'
        ELSE 'Full Body'
    END AS anatomical_category,
    CASE
        WHEN bp.body_part_name IN ('Chest', 'Upper Chest', 'Lower Chest', 'Shoulders', 'Front Delts', 'Side Delts', 'Triceps') THEN 'Push'
        WHEN bp.body_part_name IN ('Back', 'Lats', 'Upper Back', 'Mid Back', 'Lower Back', 'Rear Delts', 'Traps', 'Biceps', 'Forearms') THEN 'Pull'
        WHEN bp.body_part_name IN ('Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Hip Flexors', 'Adductors', 'Abductors') THEN 'Legs'
        WHEN bp.body_part_name IN ('Abs', 'Obliques', 'Core', 'Serratus') THEN 'Core'
        WHEN bp.body_part_name = 'Full Body' THEN 'Full Body'
        WHEN bp.body_part_name IN ('Cardio', 'Neck') THEN 'Cardio'
        ELSE 'Full Body'
    END AS muscle_group_type,
    TRUE
FROM BodyParts bp
ON DUPLICATE KEY UPDATE
    anatomical_category = VALUES(anatomical_category),
    muscle_group_type = VALUES(muscle_group_type),
    is_primary = VALUES(is_primary);

-- ===================================
-- Baseline & Goal Profile Enhancements (2025-11-14)
-- ===================================
ALTER TABLE Users
    ADD COLUMN IF NOT EXISTS training_experience ENUM('Beginner', 'Intermediate', 'Advanced') NULL AFTER activity_level;

ALTER TABLE Users
    ADD COLUMN IF NOT EXISTS weekly_training_frequency TINYINT NULL AFTER training_experience;

ALTER TABLE Users
    ADD COLUMN IF NOT EXISTS preferred_training_days VARCHAR(120) NULL AFTER weekly_training_frequency;

ALTER TABLE Users
    ADD COLUMN IF NOT EXISTS preferred_training_environment ENUM('Home', 'Gym', 'Outdoor', 'Hybrid') NULL AFTER preferred_training_days;

ALTER TABLE Users
    ADD COLUMN IF NOT EXISTS goal_deadline DATE NULL AFTER preferred_workout_time;

ALTER TABLE Users
    ADD COLUMN IF NOT EXISTS target_strength_focus VARCHAR(255) NULL AFTER target_body_fat_percentage;

ALTER TABLE Users
    ADD COLUMN IF NOT EXISTS equipment_access VARCHAR(255) NULL AFTER target_strength_focus;

ALTER TABLE Users
    ADD COLUMN IF NOT EXISTS mobility_limitations TEXT NULL AFTER equipment_access;
