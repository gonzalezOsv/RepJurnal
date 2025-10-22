-- ===================================
-- FITNESS TRACKER - PRODUCTION SCHEMA
-- ===================================
-- This file contains ONLY the database schema and essential reference data
-- For test data, see test_data.sql
-- ===================================

-- Create database (if not already created)
-- WARNING: Do NOT uncomment the drop command below in production!
-- DROP DATABASE fitness_tracker;
CREATE DATABASE IF NOT EXISTS fitness_tracker;

-- Use the database
USE fitness_tracker;

-- ===================================
-- DROP EXISTING TABLES (For clean setup)
-- ===================================
DROP TABLE IF EXISTS Exercises;
DROP TABLE IF EXISTS CustomExercises;
DROP TABLE IF EXISTS Workouts;
DROP TABLE IF EXISTS StandardExercises;
DROP TABLE IF EXISTS BodyParts;
DROP TABLE IF EXISTS user_legal_acceptance;
DROP TABLE IF EXISTS legal_documents;
DROP TABLE IF EXISTS PhysicalStats;
DROP TABLE IF EXISTS Users;

-- ===================================
-- CREATE TABLES - SCHEMA ONLY
-- ===================================

-- Users Table
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
    INDEX idx_user_date (user_id, date)
);

-- Body Parts Table (Reference Data)
CREATE TABLE IF NOT EXISTS BodyParts (
    body_part_id INT AUTO_INCREMENT PRIMARY KEY,
    body_part_name VARCHAR(50) UNIQUE NOT NULL,
    INDEX idx_name (body_part_name)
);

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
    INDEX idx_user (user_id)
);

-- Exercises Table
CREATE TABLE IF NOT EXISTS Exercises (
    exercise_id INT AUTO_INCREMENT PRIMARY KEY,
    workout_id INT NOT NULL,
    user_id INT NOT NULL,
    body_part_id INT,
    exercise_name VARCHAR(50),
    standard_exercise_id INT NULL,
    custom_exercise_id INT NULL,
    sets INT NOT NULL,
    reps INT NOT NULL,
    weight FLOAT NOT NULL,
    date DATE NOT NULL,
    FOREIGN KEY (workout_id) REFERENCES Workouts(workout_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (body_part_id) REFERENCES BodyParts(body_part_id),
    FOREIGN KEY (standard_exercise_id) REFERENCES StandardExercises(standard_exercise_id),
    FOREIGN KEY (custom_exercise_id) REFERENCES CustomExercises(custom_exercise_id),
    INDEX idx_workout (workout_id),
    INDEX idx_user_date (user_id, date)
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
