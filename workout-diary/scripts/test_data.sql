-- ===================================
-- FITNESS TRACKER - TEST DATA
-- ===================================
-- This file contains test users and sample workout data for development and testing
-- DO NOT run this in production!
-- ===================================

USE fitness_tracker;

-- ===================================
-- BODY PARTS - COMPREHENSIVE LIST
-- ===================================
INSERT INTO BodyParts (body_part_name) VALUES
-- UPPER BODY - CHEST
('Chest'),              -- General chest (pectorals)
('Upper Chest'),        -- Clavicular head of pectorals
('Lower Chest'),        -- Sternal head of pectorals

-- UPPER BODY - SHOULDERS  
('Shoulders'),          -- General shoulders (deltoids)
('Front Delts'),        -- Anterior deltoids
('Side Delts'),         -- Lateral deltoids
('Rear Delts'),         -- Posterior deltoids
('Traps'),              -- Trapezius (upper, middle, lower)

-- UPPER BODY - BACK
('Back'),               -- General back
('Lats'),               -- Latissimus dorsi
('Upper Back'),         -- Traps, rhomboids
('Mid Back'),           -- Rhomboids, middle traps
('Lower Back'),         -- Erector spinae, lumbar region

-- UPPER BODY - ARMS
('Biceps'),             -- Biceps brachii
('Triceps'),            -- Triceps brachii
('Forearms'),           -- Wrist flexors/extensors, brachioradialis

-- CORE & ABS
('Abs'),                -- Rectus abdominis
('Obliques'),           -- External/internal obliques
('Core'),               -- General core stability muscles
('Serratus'),           -- Serratus anterior

-- LOWER BODY - LEGS (QUADS & FRONT)
('Legs'),               -- General legs
('Quads'),              -- Quadriceps femoris
('Hip Flexors'),        -- Iliopsoas, rectus femoris

-- LOWER BODY - LEGS (HAMSTRINGS & BACK)
('Hamstrings'),         -- Biceps femoris, semitendinosus, semimembranosus
('Glutes'),             -- Gluteus maximus, medius, minimus
('Calves'),             -- Gastrocnemius, soleus

-- LOWER BODY - SPECIFIC
('Adductors'),          -- Inner thigh (adductor group)
('Abductors'),          -- Outer thigh/hip (gluteus medius, TFL)

-- FULL BODY & CARDIO
('Full Body'),          -- Compound movements
('Cardio'),             -- Cardiovascular exercises
('Neck')                -- Neck muscles
ON DUPLICATE KEY UPDATE body_part_name = VALUES(body_part_name);

-- ===================================
-- BODY PART CATEGORIES MAPPING
-- ===================================
INSERT INTO BodyPartCategories (body_part_id, anatomical_category, muscle_group_type, is_primary)
SELECT 
    bp.body_part_id,
    CASE
        -- CHEST MAPPING
        WHEN bp.body_part_name IN ('Chest', 'Upper Chest', 'Lower Chest') THEN 'Chest'
        
        -- SHOULDERS MAPPING  
        WHEN bp.body_part_name IN ('Shoulders', 'Front Delts', 'Side Delts', 'Rear Delts', 'Traps') THEN 'Shoulders'
        
        -- BACK MAPPING
        WHEN bp.body_part_name IN ('Back', 'Lats', 'Upper Back', 'Mid Back', 'Lower Back') THEN 'Back'
        
        -- ARMS MAPPING
        WHEN bp.body_part_name IN ('Biceps', 'Triceps', 'Forearms') THEN 'Arms'
        
        -- CORE MAPPING
        WHEN bp.body_part_name IN ('Abs', 'Obliques', 'Core', 'Serratus') THEN 'Core'
        
        -- LEGS MAPPING
        WHEN bp.body_part_name IN ('Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Hip Flexors', 'Adductors', 'Abductors') THEN 'Legs'
        
        -- FULL BODY MAPPING
        WHEN bp.body_part_name = 'Full Body' THEN 'Full Body'
        
        -- CARDIO MAPPING
        WHEN bp.body_part_name IN ('Cardio', 'Neck') THEN 'Cardio'
        
        ELSE 'Full Body'
    END as anatomical_category,
    
    CASE
        -- PUSH MUSCLES
        WHEN bp.body_part_name IN ('Chest', 'Upper Chest', 'Lower Chest', 'Shoulders', 'Front Delts', 'Side Delts', 'Triceps') THEN 'Push'
        
        -- PULL MUSCLES
        WHEN bp.body_part_name IN ('Back', 'Lats', 'Upper Back', 'Mid Back', 'Lower Back', 'Rear Delts', 'Traps', 'Biceps', 'Forearms') THEN 'Pull'
        
        -- LEG MUSCLES
        WHEN bp.body_part_name IN ('Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Hip Flexors', 'Adductors', 'Abductors') THEN 'Legs'
        
        -- CORE MUSCLES
        WHEN bp.body_part_name IN ('Abs', 'Obliques', 'Core', 'Serratus') THEN 'Core'
        
        -- FULL BODY
        WHEN bp.body_part_name = 'Full Body' THEN 'Full Body'
        
        -- CARDIO
        WHEN bp.body_part_name IN ('Cardio', 'Neck') THEN 'Cardio'
        
        ELSE 'Full Body'
    END as muscle_group_type,
    TRUE as is_primary
FROM BodyParts bp
WHERE bp.body_part_name IS NOT NULL
ON DUPLICATE KEY UPDATE 
    anatomical_category = VALUES(anatomical_category),
    muscle_group_type = VALUES(muscle_group_type);

-- ===================================
-- TEST USERS
-- ===================================
-- Default password for all test users: vL5MYe7HdD4bhmY##
-- (Password hash is scrypt format)

INSERT INTO Users (
    username, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    date_of_birth, 
    gender, 
    phone_number, 
    address, 
    height_cm, 
    weight_kg, 
    body_fat_percentage, 
    fitness_goal, 
    activity_level, 
    dietary_preferences, 
    medical_conditions, 
    allergies, 
    injuries, 
    target_weight_kg, 
    target_body_fat_percentage, 
    weekly_weight_loss_goal, 
    smoking_status, 
    alcohol_consumption, 
    motivation_level, 
    preferred_workout_time, 
    signup_source
) VALUES
-- Test User 1: Tom (Muscle Gain)
('tom101', 'tom@example.com', 
    'scrypt:32768:8:1$KcMXQVWNnf67cSDy$81ae732d3c99a2a00ce8d98d868b1760be8eafab4d893d934cd14c703526fc2babaef653f5b82bd5c288a8edd67c27914c662db6fbaacb86fed12f6b09b5535a', 
    'Tom', 'Doe', '1990-01-01', 'Male', '123-456-7890', '123 Main St, City, Country',
    180, 80, 18.5, 'Muscle Gain', 'Moderately Active', 'No Restrictions', NULL, NULL, NULL, 
    75, 15.0, 0.5, 'Non-Smoker', 'Occasional', 'High', '18:00:00', 'Google'),

-- Test User 2: Jess (Weight Loss)  
('jess101', 'jess@example.com', 
    'scrypt:32768:8:1$KcMXQVWNnf67cSDy$81ae732d3c99a2a00ce8d98d868b1760be8eafab4d893d934cd14c703526fc2babaef653f5b82bd5c288a8edd67c27914c662db6fbaacb86fed12f6b09b5535a', 
    'Jess', 'Smith', '1985-02-02', 'Female', '987-654-3210', '456 Oak St, City, Country',
    165, 68, 22.0, 'Weight Loss', 'Lightly Active', 'Vegetarian', NULL, 'Peanuts', NULL, 
    60, 18.0, 0.8, 'Non-Smoker', 'None', 'Moderate', '07:00:00', 'Friend'),

-- Test User 3: Danny (Endurance)
('danny101', 'danny@example.com', 
    'scrypt:32768:8:1$KcMXQVWNnf67cSDy$81ae732d3c99a2a00ce8d98d868b1760be8eafab4d893d934cd14c703526fc2babaef653f5b82bd5c288a8edd67c27914c662db6fbaacb86fed12f6b09b5535a', 
    'Danny', 'Johnson', '2000-03-03', 'Other', '555-555-5555', '789 Pine St, City, Country',
    175, 72, 20.0, 'Improved Endurance', 'Very Active', 'Keto', 'Asthma', NULL, 'Knee Injury', 
    70, 18.5, 0.4, 'Occasional Smoker', 'Moderate', 'Low', '20:00:00', 'Ad');

-- ===================================
-- TEST PHYSICAL STATS
-- ===================================
INSERT INTO PhysicalStats (user_id, height, weight, body_fat_percentage, created_at) VALUES
(1, 170.0, 70.0, 15.0, CURDATE()),
(2, 165.0, 60.0, 20.0, CURDATE() - INTERVAL 1 DAY),
(3, 180.0, 80.0, 12.0, CURDATE() - INTERVAL 2 DAY);

-- ===================================
-- TEST WORKOUTS
-- ===================================
-- Creating 4 weeks of workout history for all users
INSERT INTO Workouts (user_id, date, workout_name, notes) VALUES
-- Tom's Workouts (User 1) - Last 4 weeks
(1, CURDATE(), 'Chest Day', 'Felt strong today! New PR on bench!'),
(1, CURDATE() - INTERVAL 1 DAY, 'Leg Day', 'Great session, squats feeling heavy'),
(1, CURDATE() - INTERVAL 2 DAY, 'Back and Deadlifts', 'Solid deadlift workout'),
(1, CURDATE() - INTERVAL 4 DAY, 'Chest Day', 'Good pump, progressive overload'),
(1, CURDATE() - INTERVAL 5 DAY, 'Leg Day', 'Squats getting easier'),
(1, CURDATE() - INTERVAL 6 DAY, 'Back and Deadlifts', 'Heavy pulls today'),
(1, CURDATE() - INTERVAL 8 DAY, 'Chest Day', 'Bench press feeling strong'),
(1, CURDATE() - INTERVAL 9 DAY, 'Leg Day', 'Focused on form'),
(1, CURDATE() - INTERVAL 11 DAY, 'Back and Deadlifts', 'Great deadlift session'),
(1, CURDATE() - INTERVAL 13 DAY, 'Chest Day', 'Increased weight slightly'),
(1, CURDATE() - INTERVAL 15 DAY, 'Leg Day', 'Deep squats today'),
(1, CURDATE() - INTERVAL 16 DAY, 'Back and Deadlifts', 'Working on technique'),
(1, CURDATE() - INTERVAL 18 DAY, 'Chest Day', 'Solid bench session'),
(1, CURDATE() - INTERVAL 20 DAY, 'Leg Day', 'Legs burning!'),
(1, CURDATE() - INTERVAL 22 DAY, 'Back and Deadlifts', 'Deadlifts getting stronger'),
(1, CURDATE() - INTERVAL 25 DAY, 'Chest Day', 'Starting new program'),
(1, CURDATE() - INTERVAL 27 DAY, 'Leg Day', 'First heavy squat session'),
(1, CURDATE() - INTERVAL 29 DAY, 'Back and Deadlifts', 'Baseline deadlift day'),

-- Jess's Workouts (User 2) - Last 4 weeks
(2, CURDATE(), 'Upper Body', 'Good pump! Bench press improving'),
(2, CURDATE() - INTERVAL 1 DAY, 'Leg Day', 'Pushed through some tough squat sets'),
(2, CURDATE() - INTERVAL 3 DAY, 'Deadlift Day', 'Learning proper form'),
(2, CURDATE() - INTERVAL 5 DAY, 'Chest and Arms', 'Bench press PR!'),
(2, CURDATE() - INTERVAL 7 DAY, 'Leg Day', 'Squats getting more comfortable'),
(2, CURDATE() - INTERVAL 9 DAY, 'Back and Deadlifts', 'Heavy deadlift day'),
(2, CURDATE() - INTERVAL 12 DAY, 'Upper Body', 'Bench press feeling strong'),
(2, CURDATE() - INTERVAL 14 DAY, 'Leg Day', 'Working on squat depth'),
(2, CURDATE() - INTERVAL 16 DAY, 'Deadlift Day', 'Form check day'),
(2, CURDATE() - INTERVAL 19 DAY, 'Chest Day', 'Bench press progress'),
(2, CURDATE() - INTERVAL 21 DAY, 'Leg Day', 'Squat volume day'),
(2, CURDATE() - INTERVAL 23 DAY, 'Back and Deadlifts', 'Deadlift technique work'),
(2, CURDATE() - INTERVAL 26 DAY, 'Upper Body', 'Starting strength program'),
(2, CURDATE() - INTERVAL 28 DAY, 'Leg Day', 'First day back to squats'),

-- Danny's Workouts (User 3) - Last 4 weeks
(3, CURDATE(), 'Full Body', 'All three main lifts today!'),
(3, CURDATE() - INTERVAL 2 DAY, 'Strength Training', 'Heavy bench and deadlift'),
(3, CURDATE() - INTERVAL 4 DAY, 'Lower Body', 'Squats and deadlifts'),
(3, CURDATE() - INTERVAL 6 DAY, 'Upper Body', 'Bench press focus'),
(3, CURDATE() - INTERVAL 8 DAY, 'Full Body', 'Big 3 workout'),
(3, CURDATE() - INTERVAL 10 DAY, 'Strength Day', 'Deadlifts feeling strong'),
(3, CURDATE() - INTERVAL 13 DAY, 'Leg Day', 'Squat progression'),
(3, CURDATE() - INTERVAL 15 DAY, 'Upper Body', 'Bench press volume'),
(3, CURDATE() - INTERVAL 17 DAY, 'Full Body', 'All main lifts'),
(3, CURDATE() - INTERVAL 20 DAY, 'Deadlift Day', 'Heavy pulls'),
(3, CURDATE() - INTERVAL 22 DAY, 'Leg Day', 'Squat day'),
(3, CURDATE() - INTERVAL 24 DAY, 'Chest Day', 'Bench press day'),
(3, CURDATE() - INTERVAL 27 DAY, 'Full Body', 'Starting new program');

-- ===================================
-- TEST EXERCISES
-- ===================================
-- Comprehensive Big 3 lift progression for all users over 4 weeks
INSERT INTO Exercises (workout_id, user_id, body_part_id, exercise_name, sets, reps, weight, date) VALUES

-- ============================================
-- TOM'S EXERCISES (User 1) - Progressive Overload Program
-- ============================================

-- Week 4 (Most Recent)
-- Day 1: Chest Day (Today)
(1, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 5, 5, 215.0, CURDATE()),
(1, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Incline Dumbbell Press', 3, 8, 75.0, CURDATE()),
(1, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Triceps'), 'Tricep Dips', 3, 10, 0, CURDATE()),

-- Day 2: Leg Day (Yesterday)
(2, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 5, 5, 255.0, CURDATE() - INTERVAL 1 DAY),
(2, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Front Squats', 3, 8, 185.0, CURDATE() - INTERVAL 1 DAY),
(2, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Hamstrings'), 'Romanian Deadlift', 3, 10, 155.0, CURDATE() - INTERVAL 1 DAY),

-- Day 3: Back and Deadlifts (2 days ago)
(3, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 5, 5, 315.0, CURDATE() - INTERVAL 2 DAY),
(3, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Barbell Rows', 3, 8, 165.0, CURDATE() - INTERVAL 2 DAY),
(3, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Pull-Ups', 3, 8, 0, CURDATE() - INTERVAL 2 DAY),

-- Week 3
-- Chest Day
(4, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 5, 5, 210.0, CURDATE() - INTERVAL 4 DAY),
(4, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Incline Dumbbell Press', 3, 8, 70.0, CURDATE() - INTERVAL 4 DAY),

-- Leg Day
(5, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 5, 5, 250.0, CURDATE() - INTERVAL 5 DAY),
(5, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Front Squats', 3, 8, 180.0, CURDATE() - INTERVAL 5 DAY),

-- Deadlift Day
(6, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 5, 5, 305.0, CURDATE() - INTERVAL 6 DAY),
(6, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Barbell Rows', 3, 8, 155.0, CURDATE() - INTERVAL 6 DAY),

-- Chest Day
(7, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 5, 5, 205.0, CURDATE() - INTERVAL 8 DAY),
(7, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Incline Dumbbell Press', 3, 8, 70.0, CURDATE() - INTERVAL 8 DAY),

-- Leg Day
(8, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 5, 5, 245.0, CURDATE() - INTERVAL 9 DAY),
(8, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Hamstrings'), 'Romanian Deadlift', 3, 10, 145.0, CURDATE() - INTERVAL 9 DAY),

-- Week 2
-- Deadlift Day
(9, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 5, 5, 295.0, CURDATE() - INTERVAL 11 DAY),
(9, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Barbell Rows', 3, 8, 150.0, CURDATE() - INTERVAL 11 DAY),

-- Chest Day
(10, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 5, 5, 200.0, CURDATE() - INTERVAL 13 DAY),
(10, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Incline Dumbbell Press', 3, 8, 65.0, CURDATE() - INTERVAL 13 DAY),

-- Leg Day
(11, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 5, 5, 240.0, CURDATE() - INTERVAL 15 DAY),
(11, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Front Squats', 3, 8, 170.0, CURDATE() - INTERVAL 15 DAY),

-- Deadlift Day
(12, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 5, 5, 285.0, CURDATE() - INTERVAL 16 DAY),
(12, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Pull-Ups', 3, 8, 0, CURDATE() - INTERVAL 16 DAY),

-- Chest Day
(13, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 5, 5, 195.0, CURDATE() - INTERVAL 18 DAY),
(13, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Triceps'), 'Close Grip Bench', 3, 8, 155.0, CURDATE() - INTERVAL 18 DAY),

-- Week 1
-- Leg Day
(14, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 5, 5, 235.0, CURDATE() - INTERVAL 20 DAY),
(14, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Hamstrings'), 'Romanian Deadlift', 3, 10, 135.0, CURDATE() - INTERVAL 20 DAY),

-- Deadlift Day
(15, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 5, 5, 275.0, CURDATE() - INTERVAL 22 DAY),
(15, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Barbell Rows', 3, 8, 145.0, CURDATE() - INTERVAL 22 DAY),

-- Chest Day (Program Start)
(16, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 5, 5, 185.0, CURDATE() - INTERVAL 25 DAY),
(16, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Incline Dumbbell Press', 3, 8, 60.0, CURDATE() - INTERVAL 25 DAY),

-- Leg Day (Program Start)
(17, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 5, 5, 225.0, CURDATE() - INTERVAL 27 DAY),
(17, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Leg Press', 3, 10, 315.0, CURDATE() - INTERVAL 27 DAY),

-- Deadlift Day (Program Start)
(18, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 5, 5, 265.0, CURDATE() - INTERVAL 29 DAY),
(18, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Pull-Ups', 3, 6, 0, CURDATE() - INTERVAL 29 DAY),

-- ============================================
-- JESS'S EXERCISES (User 2) - Building Strength Program
-- ============================================

-- Week 4 (Most Recent)
-- Upper Body (Today)
(19, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 4, 8, 85.0, CURDATE()),
(19, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Overhead Press', 3, 10, 50.0, CURDATE()),
(19, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Triceps'), 'Tricep Extensions', 3, 12, 25.0, CURDATE()),

-- Leg Day (Yesterday)
(20, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 4, 8, 115.0, CURDATE() - INTERVAL 1 DAY),
(20, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Glutes'), 'Hip Thrusts', 3, 10, 115.0, CURDATE() - INTERVAL 1 DAY),
(20, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Lunges', 3, 10, 30.0, CURDATE() - INTERVAL 1 DAY),

-- Deadlift Day
(21, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 4, 6, 135.0, CURDATE() - INTERVAL 3 DAY),
(21, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Lat Pulldowns', 3, 10, 70.0, CURDATE() - INTERVAL 3 DAY),

-- Week 3
-- Chest and Arms
(22, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 4, 8, 80.0, CURDATE() - INTERVAL 5 DAY),
(22, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Dumbbell Flyes', 3, 12, 20.0, CURDATE() - INTERVAL 5 DAY),

-- Leg Day
(23, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 4, 8, 110.0, CURDATE() - INTERVAL 7 DAY),
(23, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Glutes'), 'Hip Thrusts', 3, 10, 110.0, CURDATE() - INTERVAL 7 DAY),

-- Back and Deadlifts
(24, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 4, 6, 125.0, CURDATE() - INTERVAL 9 DAY),
(24, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Cable Rows', 3, 12, 60.0, CURDATE() - INTERVAL 9 DAY),

-- Upper Body
(25, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 4, 8, 75.0, CURDATE() - INTERVAL 12 DAY),
(25, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Overhead Press', 3, 10, 45.0, CURDATE() - INTERVAL 12 DAY),

-- Week 2
-- Leg Day
(26, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 4, 10, 105.0, CURDATE() - INTERVAL 14 DAY),
(26, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Leg Press', 3, 12, 180.0, CURDATE() - INTERVAL 14 DAY),

-- Deadlift Day
(27, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 4, 8, 115.0, CURDATE() - INTERVAL 16 DAY),
(27, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Lat Pulldowns', 3, 12, 60.0, CURDATE() - INTERVAL 16 DAY),

-- Chest Day
(28, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 4, 10, 70.0, CURDATE() - INTERVAL 19 DAY),
(28, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Push-Ups', 3, 15, 0, CURDATE() - INTERVAL 19 DAY),

-- Leg Day
(29, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 4, 10, 100.0, CURDATE() - INTERVAL 21 DAY),
(29, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Glutes'), 'Hip Thrusts', 3, 12, 100.0, CURDATE() - INTERVAL 21 DAY),

-- Week 1
-- Back and Deadlifts
(30, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 4, 8, 105.0, CURDATE() - INTERVAL 23 DAY),
(30, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Cable Rows', 3, 12, 50.0, CURDATE() - INTERVAL 23 DAY),

-- Upper Body (Program Start)
(31, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 4, 10, 65.0, CURDATE() - INTERVAL 26 DAY),
(31, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Overhead Press', 3, 12, 40.0, CURDATE() - INTERVAL 26 DAY),

-- Leg Day (Program Start)
(32, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 4, 10, 95.0, CURDATE() - INTERVAL 28 DAY),
(32, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Lunges', 3, 10, 20.0, CURDATE() - INTERVAL 28 DAY),

-- ============================================
-- DANNY'S EXERCISES (User 3) - Athletic Performance Program
-- ============================================

-- Week 4 (Most Recent)
-- Full Body (Today)
(33, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 3, 8, 175.0, CURDATE()),
(33, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 3, 8, 225.0, CURDATE()),
(33, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 3, 8, 275.0, CURDATE()),

-- Strength Training
(34, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 4, 6, 185.0, CURDATE() - INTERVAL 2 DAY),
(34, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 4, 5, 285.0, CURDATE() - INTERVAL 2 DAY),
(34, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Overhead Press', 3, 8, 115.0, CURDATE() - INTERVAL 2 DAY),

-- Week 3
-- Lower Body
(35, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 4, 6, 235.0, CURDATE() - INTERVAL 4 DAY),
(35, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 3, 8, 265.0, CURDATE() - INTERVAL 4 DAY),
(35, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Hamstrings'), 'Romanian Deadlift', 3, 10, 185.0, CURDATE() - INTERVAL 4 DAY),

-- Upper Body
(36, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 4, 8, 170.0, CURDATE() - INTERVAL 6 DAY),
(36, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Incline Bench Press', 3, 8, 145.0, CURDATE() - INTERVAL 6 DAY),
(36, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Triceps'), 'Tricep Dips', 3, 12, 0, CURDATE() - INTERVAL 6 DAY),

-- Full Body
(37, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 3, 8, 165.0, CURDATE() - INTERVAL 8 DAY),
(37, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 3, 8, 215.0, CURDATE() - INTERVAL 8 DAY),
(37, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 3, 8, 255.0, CURDATE() - INTERVAL 8 DAY),

-- Week 2
-- Strength Day
(38, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 5, 5, 275.0, CURDATE() - INTERVAL 10 DAY),
(38, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Barbell Rows', 4, 8, 155.0, CURDATE() - INTERVAL 10 DAY),
(38, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Pull-Ups', 3, 10, 0, CURDATE() - INTERVAL 10 DAY),

-- Leg Day
(39, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 5, 5, 225.0, CURDATE() - INTERVAL 13 DAY),
(39, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Front Squats', 3, 8, 165.0, CURDATE() - INTERVAL 13 DAY),
(39, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Calves'), 'Calf Raises', 4, 15, 100.0, CURDATE() - INTERVAL 13 DAY),

-- Upper Body
(40, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 5, 5, 175.0, CURDATE() - INTERVAL 15 DAY),
(40, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Overhead Press', 3, 8, 105.0, CURDATE() - INTERVAL 15 DAY),
(40, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Triceps'), 'Close Grip Bench', 3, 8, 135.0, CURDATE() - INTERVAL 15 DAY),

-- Full Body
(41, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 3, 10, 155.0, CURDATE() - INTERVAL 17 DAY),
(41, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 3, 10, 205.0, CURDATE() - INTERVAL 17 DAY),
(41, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 3, 10, 245.0, CURDATE() - INTERVAL 17 DAY),

-- Week 1
-- Deadlift Day
(42, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 5, 5, 265.0, CURDATE() - INTERVAL 20 DAY),
(42, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deficit Deadlift', 3, 5, 225.0, CURDATE() - INTERVAL 20 DAY),

-- Leg Day
(43, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 5, 5, 215.0, CURDATE() - INTERVAL 22 DAY),
(43, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Hamstrings'), 'Romanian Deadlift', 3, 10, 165.0, CURDATE() - INTERVAL 22 DAY),

-- Chest Day
(44, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 5, 5, 165.0, CURDATE() - INTERVAL 24 DAY),
(44, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Dumbbell Press', 3, 10, 60.0, CURDATE() - INTERVAL 24 DAY),

-- Full Body (Program Start)
(45, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 3, 10, 145.0, CURDATE() - INTERVAL 27 DAY),
(45, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 3, 10, 195.0, CURDATE() - INTERVAL 27 DAY),
(45, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 3, 10, 235.0, CURDATE() - INTERVAL 27 DAY);

-- ===================================
-- TEST DATA COMPLETE
-- ===================================
-- You can now test the application with 3 users
-- Login credentials (all users have same password):
--   Username: tom101 / jess101 / danny101
--   Password: vL5MYe7HdD4bhmY##
-- ===================================

-- ===================================
-- WORKOUT ROUTINES TEST DATA
-- ===================================
-- Sample workout routines for test users

-- Routine for user 1 (tom101) - Push Day Routine
INSERT INTO WorkoutRoutines (user_id, routine_name, description) VALUES
(1, 'Push Day - Chest & Shoulders', 'Focus on chest, shoulders, and triceps');

SET @push_routine_id = LAST_INSERT_ID();

INSERT INTO RoutineExercises (routine_id, body_part_id, exercise_name, sets, reps, weight, unit, exercise_order, exercise_type) VALUES
(@push_routine_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 4, 8, 185.0, 'lb', 1, 'strength'),
(@push_routine_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Incline Dumbbell Press', 3, 10, 70.0, 'lb', 2, 'strength'),
(@push_routine_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Shoulder Press', 3, 12, 60.0, 'lb', 3, 'strength'),
(@push_routine_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Triceps'), 'Tricep Dips', 3, 15, NULL, 'lb', 4, 'strength');

-- Routine for user 1 - Pull Day Routine
INSERT INTO WorkoutRoutines (user_id, routine_name, description) VALUES
(1, 'Pull Day - Back & Biceps', 'Focus on back and bicep development');

SET @pull_routine_id = LAST_INSERT_ID();

INSERT INTO RoutineExercises (routine_id, body_part_id, exercise_name, sets, reps, weight, unit, exercise_order, exercise_type) VALUES
(@pull_routine_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 3, 5, 275.0, 'lb', 1, 'strength'),
(@pull_routine_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Pull-Ups', 4, 8, NULL, 'lb', 2, 'strength'),
(@pull_routine_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Bent Over Rows', 3, 10, 155.0, 'lb', 3, 'strength'),
(@pull_routine_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Biceps'), 'Barbell Curls', 3, 12, 50.0, 'lb', 4, 'strength');

-- Routine for user 2 (jess101) - Full Body Cardio
INSERT INTO WorkoutRoutines (user_id, routine_name, description) VALUES
(2, 'Cardio & Core Blast', 'High-intensity cardio with core strengthening');

SET @cardio_routine_id = LAST_INSERT_ID();

INSERT INTO RoutineExercises (routine_id, body_part_id, exercise_name, sets, reps, weight, unit, exercise_order, exercise_type, duration_minutes, intensity) VALUES
(@cardio_routine_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Cardio'), 'Running', NULL, NULL, NULL, NULL, 1, 'cardio', 30, 'High'),
(@cardio_routine_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Abs'), 'Plank', 3, 60, NULL, 'lb', 2, 'strength', NULL, NULL),
(@cardio_routine_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Cardio'), 'Rowing', NULL, NULL, NULL, NULL, 3, 'cardio', 20, 'Moderate');

-- ===================================
-- COMPREHENSIVE WORKOUT ROUTINES
-- ===================================
-- Adding realistic workout splits for all test users

-- USER 1 (tom101) - Complete PPL Split
-- Push Day 1 (Monday)
INSERT INTO WorkoutRoutines (user_id, routine_name, description) VALUES
(1, 'PPL - Push Day (Chest Focus)', 'Complete upper body push workout focusing on chest, shoulders, and triceps. Perfect for Monday');

SET @push_day1_id = LAST_INSERT_ID();

INSERT INTO RoutineExercises (routine_id, body_part_id, exercise_name, sets, reps, weight, unit, exercise_order, exercise_type) VALUES
(@push_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 5, 5, 215.0, 'lb', 0, 'strength'),
(@push_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Incline Dumbbell Press', 4, 8, 75.0, 'lb', 1, 'strength'),
(@push_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Dumbbell Flyes', 3, 12, 40.0, 'lb', 2, 'strength'),
(@push_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Overhead Press', 4, 6, 135.0, 'lb', 3, 'strength'),
(@push_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Lateral Raises', 3, 15, 20.0, 'lb', 4, 'strength'),
(@push_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Triceps'), 'Close-Grip Bench Press', 3, 8, 175.0, 'lb', 5, 'strength'),
(@push_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Triceps'), 'Tricep Dips', 3, 12, NULL, 'lb', 6, 'strength');

-- Pull Day 1 (Tuesday)
INSERT INTO WorkoutRoutines (user_id, routine_name, description) VALUES
(1, 'PPL - Pull Day (Back Focus)', 'Complete upper body pull workout focusing on back, biceps, and rear delts. Perfect for Tuesday');

SET @pull_day1_id = LAST_INSERT_ID();

INSERT INTO RoutineExercises (routine_id, body_part_id, exercise_name, sets, reps, weight, unit, exercise_order, exercise_type) VALUES
(@pull_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 5, 5, 315.0, 'lb', 0, 'strength'),
(@pull_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Pull-Ups', 4, 8, NULL, 'lb', 1, 'strength'),
(@pull_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Bent Over Rows', 4, 8, 185.0, 'lb', 2, 'strength'),
(@pull_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Lat Pulldown', 3, 10, 140.0, 'lb', 3, 'strength'),
(@pull_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Face Pulls', 4, 15, 60.0, 'lb', 4, 'strength'),
(@pull_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Biceps'), 'Bicep Curls', 3, 12, 35.0, 'lb', 5, 'strength'),
(@pull_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Biceps'), 'Hammer Curls', 3, 12, 30.0, 'lb', 6, 'strength');

-- Leg Day 1 (Wednesday)
INSERT INTO WorkoutRoutines (user_id, routine_name, description) VALUES
(1, 'PPL - Leg Day (Quads Focus)', 'Complete lower body workout focusing on quads, hamstrings, glutes, and calves. Perfect for Wednesday');

SET @leg_day1_id = LAST_INSERT_ID();

INSERT INTO RoutineExercises (routine_id, body_part_id, exercise_name, sets, reps, weight, unit, exercise_order, exercise_type) VALUES
(@leg_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 5, 5, 255.0, 'lb', 0, 'strength'),
(@leg_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Quads'), 'Front Squats', 3, 8, 185.0, 'lb', 1, 'strength'),
(@leg_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Quads'), 'Leg Extensions', 3, 12, 120.0, 'lb', 2, 'strength'),
(@leg_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Hamstrings'), 'Romanian Deadlift', 3, 8, 185.0, 'lb', 3, 'strength'),
(@leg_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Hamstrings'), 'Leg Curls', 3, 12, 100.0, 'lb', 4, 'strength'),
(@leg_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Glutes'), 'Hip Thrusts', 4, 10, 225.0, 'lb', 5, 'strength'),
(@leg_day1_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Calves'), 'Calf Raises', 4, 15, 225.0, 'lb', 6, 'strength');

-- USER 2 (jess101) - Upper/Lower Split
-- Upper Body Day
INSERT INTO WorkoutRoutines (user_id, routine_name, description) VALUES
(2, 'Upper/Lower - Upper Body', 'Comprehensive upper body workout covering chest, back, shoulders, and arms. Perfect for Monday or Wednesday');

SET @upper_day_id = LAST_INSERT_ID();

INSERT INTO RoutineExercises (routine_id, body_part_id, exercise_name, sets, reps, weight, unit, exercise_order, exercise_type) VALUES
(@upper_day_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 4, 8, 85.0, 'lb', 0, 'strength'),
(@upper_day_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Bent Over Rows', 4, 8, 65.0, 'lb', 1, 'strength'),
(@upper_day_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Incline Dumbbell Press', 3, 10, 50.0, 'lb', 2, 'strength'),
(@upper_day_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Lat Pulldown', 3, 10, 70.0, 'lb', 3, 'strength'),
(@upper_day_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Overhead Press', 3, 10, 50.0, 'lb', 4, 'strength'),
(@upper_day_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Triceps'), 'Tricep Extensions', 3, 12, 25.0, 'lb', 5, 'strength'),
(@upper_day_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Biceps'), 'Bicep Curls', 3, 12, 20.0, 'lb', 6, 'strength');

-- Lower Body Day
INSERT INTO WorkoutRoutines (user_id, routine_name, description) VALUES
(2, 'Upper/Lower - Lower Body', 'Complete lower body workout for legs, glutes, and core. Perfect for Tuesday or Thursday');

SET @lower_day_id = LAST_INSERT_ID();

INSERT INTO RoutineExercises (routine_id, body_part_id, exercise_name, sets, reps, weight, unit, exercise_order, exercise_type) VALUES
(@lower_day_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 4, 8, 115.0, 'lb', 0, 'strength'),
(@lower_day_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Romanian Deadlift', 4, 8, 105.0, 'lb', 1, 'strength'),
(@lower_day_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Glutes'), 'Hip Thrusts', 3, 10, 115.0, 'lb', 2, 'strength'),
(@lower_day_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Lunges', 3, 10, 30.0, 'lb', 3, 'strength'),
(@lower_day_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Quads'), 'Leg Extensions', 3, 12, 50.0, 'lb', 4, 'strength'),
(@lower_day_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Hamstrings'), 'Leg Curls', 3, 12, 50.0, 'lb', 5, 'strength'),
(@lower_day_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Calves'), 'Calf Raises', 4, 15, 135.0, 'lb', 6, 'strength'),
(@lower_day_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Abs'), 'Planks', 3, 45, NULL, 'lb', 7, 'strength');

-- Cardio + Core Day
INSERT INTO WorkoutRoutines (user_id, routine_name, description) VALUES
(2, 'Upper/Lower - Cardio & Core', 'Active recovery day with cardio and core work. Perfect for Friday or weekend');

SET @cardio_core_id = LAST_INSERT_ID();

INSERT INTO RoutineExercises (routine_id, body_part_id, exercise_name, sets, reps, weight, unit, exercise_order, exercise_type, duration_minutes, intensity) VALUES
(@cardio_core_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Cardio'), 'Running', NULL, NULL, NULL, NULL, 0, 'cardio', 25, 'Moderate'),
(@cardio_core_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Abs'), 'Planks', 3, 60, NULL, 'lb', 1, 'strength', NULL, NULL),
(@cardio_core_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Abs'), 'Russian Twists', 3, 20, NULL, 'lb', 2, 'strength', NULL, NULL),
(@cardio_core_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Abs'), 'Leg Raises', 3, 15, NULL, 'lb', 3, 'strength', NULL, NULL),
(@cardio_core_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Cardio'), 'Cycling', NULL, NULL, NULL, NULL, 4, 'cardio', 20, 'Low');

-- USER 3 (danny101) - Full Body & 5-Day Split
-- Full Body Workout
INSERT INTO WorkoutRoutines (user_id, routine_name, description) VALUES
(3, 'Full Body - Complete Workout', 'Efficient full body routine hitting all major muscle groups. Great for 3x per week training');

SET @full_body_id = LAST_INSERT_ID();

INSERT INTO RoutineExercises (routine_id, body_part_id, exercise_name, sets, reps, weight, unit, exercise_order, exercise_type) VALUES
(@full_body_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 4, 6, 225.0, 'lb', 0, 'strength'),
(@full_body_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 4, 6, 175.0, 'lb', 1, 'strength'),
(@full_body_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 3, 5, 275.0, 'lb', 2, 'strength'),
(@full_body_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Pull-Ups', 3, 8, NULL, 'lb', 3, 'strength'),
(@full_body_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Overhead Press', 3, 8, 115.0, 'lb', 4, 'strength'),
(@full_body_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Abs'), 'Planks', 3, 60, NULL, 'lb', 5, 'strength');

-- 5-Day Split - Chest & Triceps
INSERT INTO WorkoutRoutines (user_id, routine_name, description) VALUES
(3, '5-Day Split - Chest & Triceps', 'Dedicated chest and tricep day for advanced training split. Day 1 of 5');

SET @chest_tri_id = LAST_INSERT_ID();

INSERT INTO RoutineExercises (routine_id, body_part_id, exercise_name, sets, reps, weight, unit, exercise_order, exercise_type) VALUES
(@chest_tri_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 5, 5, 195.0, 'lb', 0, 'strength'),
(@chest_tri_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Incline Bench Press', 4, 8, 155.0, 'lb', 1, 'strength'),
(@chest_tri_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Dumbbell Flyes', 3, 12, 50.0, 'lb', 2, 'strength'),
(@chest_tri_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Cable Chest Press', 3, 12, 100.0, 'lb', 3, 'strength'),
(@chest_tri_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Triceps'), 'Close-Grip Bench Press', 4, 8, 155.0, 'lb', 4, 'strength'),
(@chest_tri_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Triceps'), 'Tricep Extensions', 3, 12, 50.0, 'lb', 5, 'strength'),
(@chest_tri_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Triceps'), 'Tricep Dips', 3, 12, NULL, 'lb', 6, 'strength');

-- 5-Day Split - Back & Biceps
INSERT INTO WorkoutRoutines (user_id, routine_name, description) VALUES
(3, '5-Day Split - Back & Biceps', 'Dedicated back and bicep day. Focus on width and thickness. Day 2 of 5');

SET @back_bi_id = LAST_INSERT_ID();

INSERT INTO RoutineExercises (routine_id, body_part_id, exercise_name, sets, reps, weight, unit, exercise_order, exercise_type) VALUES
(@back_bi_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 5, 3, 315.0, 'lb', 0, 'strength'),
(@back_bi_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Pull-Ups', 4, 10, NULL, 'lb', 1, 'strength'),
(@back_bi_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Bent Over Rows', 4, 8, 185.0, 'lb', 2, 'strength'),
(@back_bi_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'T-Bar Rows', 3, 10, 135.0, 'lb', 3, 'strength'),
(@back_bi_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Lat Pulldown', 3, 12, 140.0, 'lb', 4, 'strength'),
(@back_bi_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Biceps'), 'Bicep Curls', 4, 10, 40.0, 'lb', 5, 'strength'),
(@back_bi_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Biceps'), 'Hammer Curls', 3, 12, 35.0, 'lb', 6, 'strength'),
(@back_bi_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Biceps'), 'Preacher Curls', 3, 10, 45.0, 'lb', 7, 'strength');

-- 5-Day Split - Legs (Quads Focus)
INSERT INTO WorkoutRoutines (user_id, routine_name, description) VALUES
(3, '5-Day Split - Legs (Quads)', 'Quad-focused leg day with squats and quad isolation. Day 3 of 5');

SET @legs_quads_id = LAST_INSERT_ID();

INSERT INTO RoutineExercises (routine_id, body_part_id, exercise_name, sets, reps, weight, unit, exercise_order, exercise_type) VALUES
(@legs_quads_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Squats', 5, 5, 255.0, 'lb', 0, 'strength'),
(@legs_quads_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Quads'), 'Front Squats', 4, 8, 195.0, 'lb', 1, 'strength'),
(@legs_quads_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Leg Press', 4, 12, 405.0, 'lb', 2, 'strength'),
(@legs_quads_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Quads'), 'Leg Extensions', 4, 15, 130.0, 'lb', 3, 'strength'),
(@legs_quads_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Lunges', 3, 10, 85.0, 'lb', 4, 'strength'),
(@legs_quads_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Calves'), 'Calf Raises', 5, 15, 225.0, 'lb', 5, 'strength');

-- 5-Day Split - Shoulders & Traps
INSERT INTO WorkoutRoutines (user_id, routine_name, description) VALUES
(3, '5-Day Split - Shoulders & Traps', 'Shoulder and trap development for broader physique. Day 4 of 5');

SET @shoulders_traps_id = LAST_INSERT_ID();

INSERT INTO RoutineExercises (routine_id, body_part_id, exercise_name, sets, reps, weight, unit, exercise_order, exercise_type) VALUES
(@shoulders_traps_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Overhead Press', 5, 5, 145.0, 'lb', 0, 'strength'),
(@shoulders_traps_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Lateral Raises', 4, 12, 25.0, 'lb', 1, 'strength'),
(@shoulders_traps_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Face Pulls', 4, 15, 70.0, 'lb', 2, 'strength'),
(@shoulders_traps_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Front Raises', 3, 12, 20.0, 'lb', 3, 'strength'),
(@shoulders_traps_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Arnold Press', 3, 10, 35.0, 'lb', 4, 'strength'),
(@shoulders_traps_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Reverse Flyes', 3, 15, 20.0, 'lb', 5, 'strength'),
(@shoulders_traps_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Traps'), 'Dumbbell Shrugs', 4, 12, 85.0, 'lb', 6, 'strength');

-- 5-Day Split - Legs (Hamstrings & Glutes)
INSERT INTO WorkoutRoutines (user_id, routine_name, description) VALUES
(3, '5-Day Split - Legs (Posterior)', 'Hamstring and glute focus for complete leg development. Day 5 of 5');

SET @legs_hams_id = LAST_INSERT_ID();

INSERT INTO RoutineExercises (routine_id, body_part_id, exercise_name, sets, reps, weight, unit, exercise_order, exercise_type) VALUES
(@legs_hams_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 5, 3, 315.0, 'lb', 0, 'strength'),
(@legs_hams_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Hamstrings'), 'Romanian Deadlift', 4, 8, 205.0, 'lb', 1, 'strength'),
(@legs_hams_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Hamstrings'), 'Leg Curls', 4, 12, 110.0, 'lb', 2, 'strength'),
(@legs_hams_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Glutes'), 'Hip Thrusts', 4, 10, 275.0, 'lb', 3, 'strength'),
(@legs_hams_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Glutes'), 'Glute Bridges', 3, 15, 185.0, 'lb', 4, 'strength'),
(@legs_hams_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Bulgarian Split Squats', 3, 10, 45.0, 'lb', 5, 'strength'),
(@legs_hams_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Calves'), 'Seated Calf Raises', 4, 15, 135.0, 'lb', 6, 'strength');

-- USER 1 - Rest Day Active Recovery
INSERT INTO WorkoutRoutines (user_id, routine_name, description) VALUES
(1, 'PPL - Active Recovery Day', 'Light cardio and mobility work for rest days. Perfect for Sunday');

SET @recovery_id = LAST_INSERT_ID();

INSERT INTO RoutineExercises (routine_id, body_part_id, exercise_name, sets, reps, weight, unit, exercise_order, exercise_type, duration_minutes, intensity) VALUES
(@recovery_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Cardio'), 'Rowing', NULL, NULL, NULL, NULL, 0, 'cardio', 20, 'Low'),
(@recovery_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Abs'), 'Planks', 3, 45, NULL, 'lb', 1, 'strength', NULL, NULL),
(@recovery_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Core'), 'Side Planks', 2, 30, NULL, 'lb', 2, 'strength', NULL, NULL),
(@recovery_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Cardio'), 'Running', NULL, NULL, NULL, NULL, 3, 'cardio', 15, 'Low'),
(@recovery_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Abs'), 'Russian Twists', 2, 15, NULL, 'lb', 4, 'strength', NULL, NULL);

-- USER 2 - HIIT Cardio Workout
INSERT INTO WorkoutRoutines (user_id, routine_name, description) VALUES
(2, 'HIIT Cardio Blast', 'High-intensity interval training for fat loss and cardiovascular health. 30-minute session');

SET @hiit_id = LAST_INSERT_ID();

INSERT INTO RoutineExercises (routine_id, body_part_id, exercise_name, sets, reps, weight, unit, exercise_order, exercise_type, duration_minutes, intensity) VALUES
(@hiit_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Cardio'), 'Running', NULL, NULL, NULL, NULL, 0, 'cardio', 20, 'High'),
(@hiit_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Full Body'), 'Burpees', 4, 10, NULL, 'lb', 1, 'strength', NULL, NULL),
(@hiit_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Full Body'), 'Kettlebell Swings', 4, 15, 25.0, 'lb', 2, 'strength', NULL, NULL),
(@hiit_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Cardio'), 'Cycling', NULL, NULL, NULL, NULL, 3, 'cardio', 10, 'High'),
(@hiit_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Full Body'), 'Thrusters', 3, 10, 45.0, 'lb', 4, 'strength', NULL, NULL);

-- USER 3 - Volume Hypertrophy Day
INSERT INTO WorkoutRoutines (user_id, routine_name, description) VALUES
(3, 'Hypertrophy - Chest Volume', 'High-volume chest workout for muscle growth. Focus on time under tension');

SET @hypertrophy_id = LAST_INSERT_ID();

INSERT INTO RoutineExercises (routine_id, body_part_id, exercise_name, sets, reps, weight, unit, exercise_order, exercise_type) VALUES
(@hypertrophy_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 5, 8, 185.0, 'lb', 0, 'strength'),
(@hypertrophy_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Incline Dumbbell Press', 4, 10, 70.0, 'lb', 1, 'strength'),
(@hypertrophy_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Dumbbell Flyes', 4, 12, 45.0, 'lb', 2, 'strength'),
(@hypertrophy_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Cable Chest Press', 3, 15, 90.0, 'lb', 3, 'strength'),
(@hypertrophy_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Push-Ups', 3, 20, NULL, 'lb', 4, 'strength'),
(@hypertrophy_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Triceps'), 'Tricep Dips', 4, 12, NULL, 'lb', 5, 'strength'),
(@hypertrophy_id, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Triceps'), 'Tricep Extensions', 3, 15, 45.0, 'lb', 6, 'strength');

-- ===================================
-- ADDITIONAL EXTENDED TEST DATA
-- ===================================
-- Provide fresh sessions to keep dashboards interesting, with emphasis on Danny (user 3)

-- Tom: Skill practice session
INSERT INTO Workouts (user_id, date, workout_name, notes)
VALUES (1, CURDATE() - INTERVAL 3 DAY, 'Olympic Lift Practice', 'Light technique work on cleans and snatches');
SET @tom_skill_day = LAST_INSERT_ID();

INSERT INTO Exercises (workout_id, user_id, body_part_id, exercise_name, sets, reps, weight, date) VALUES
(@tom_skill_day, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Full Body'), 'Power Clean', 6, 3, 135.0, CURDATE() - INTERVAL 3 DAY),
(@tom_skill_day, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Push Press', 5, 3, 165.0, CURDATE() - INTERVAL 3 DAY),
(@tom_skill_day, 1, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Core'), 'Hanging Leg Raise', 4, 12, NULL, CURDATE() - INTERVAL 3 DAY);

-- Jess: Conditioning + accessory circuit
INSERT INTO Workouts (user_id, date, workout_name, notes)
VALUES (2, CURDATE() - INTERVAL 4 DAY, 'Conditioning Circuit', 'EMOM conditioning and accessory work');
SET @jess_conditioning = LAST_INSERT_ID();

INSERT INTO Exercises (workout_id, user_id, body_part_id, exercise_name, sets, reps, weight, date) VALUES
(@jess_conditioning, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Cardio'), 'Assault Bike Sprints', 10, 0, NULL, CURDATE() - INTERVAL 4 DAY),
(@jess_conditioning, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Core'), 'Weighted Plank', 4, 45, 25.0, CURDATE() - INTERVAL 4 DAY),
(@jess_conditioning, 2, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Glutes'), 'Kettlebell Swings', 5, 20, 35.0, CURDATE() - INTERVAL 4 DAY);

-- Danny: Strength endurance day
INSERT INTO Workouts (user_id, date, workout_name, notes)
VALUES (3, CURDATE() - INTERVAL 1 DAY, 'Strength Endurance', 'High volume squats and bench with supersets');
SET @danny_endurance = LAST_INSERT_ID();

INSERT INTO Exercises (workout_id, user_id, body_part_id, exercise_name, sets, reps, weight, date) VALUES
(@danny_endurance, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Back Squat', 6, 6, 245.0, CURDATE() - INTERVAL 1 DAY),
(@danny_endurance, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 6, 6, 185.0, CURDATE() - INTERVAL 1 DAY),
(@danny_endurance, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Hamstrings'), 'Good Morning', 4, 10, 135.0, CURDATE() - INTERVAL 1 DAY),
(@danny_endurance, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Core'), 'Weighted Sit-Up', 4, 15, 35.0, CURDATE() - INTERVAL 1 DAY);

-- Danny: Speed & agility day
INSERT INTO Workouts (user_id, date, workout_name, notes)
VALUES (3, CURDATE() - INTERVAL 6 DAY, 'Speed & Agility', 'Field session with sprints and plyometrics');
SET @danny_speed = LAST_INSERT_ID();

INSERT INTO Exercises (workout_id, user_id, body_part_id, exercise_name, sets, reps, weight, date) VALUES
(@danny_speed, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Cardio'), '40m Sprint', 8, 0, NULL, CURDATE() - INTERVAL 6 DAY),
(@danny_speed, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Full Body'), 'Broad Jump', 5, 5, NULL, CURDATE() - INTERVAL 6 DAY),
(@danny_speed, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Split Squat Jumps', 4, 12, NULL, CURDATE() - INTERVAL 6 DAY),
(@danny_speed, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Core'), 'Anti-Rotation Press', 4, 12, 35.0, CURDATE() - INTERVAL 6 DAY);

-- Danny: Recovery hybrid day with light cardio & mobility
INSERT INTO Workouts (user_id, date, workout_name, notes)
VALUES (3, CURDATE() - INTERVAL 9 DAY, 'Recovery Flow', 'Zone 2 cardio plus mobility and core activation');
SET @danny_recovery = LAST_INSERT_ID();

INSERT INTO Exercises (workout_id, user_id, body_part_id, exercise_name, sets, reps, weight, date) VALUES
(@danny_recovery, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Cardio'), 'Row Machine Steady State', 1, 0, NULL, CURDATE() - INTERVAL 9 DAY),
(@danny_recovery, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Core'), 'Bird Dog', 3, 16, NULL, CURDATE() - INTERVAL 9 DAY),
(@danny_recovery, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Core'), 'Side Plank Reach Through', 3, 12, NULL, CURDATE() - INTERVAL 9 DAY),
(@danny_recovery, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Full Body'), 'Mobility Flow', 3, 0, NULL, CURDATE() - INTERVAL 9 DAY);

-- Danny: Max strength testing day
INSERT INTO Workouts (user_id, date, workout_name, notes)
VALUES (3, CURDATE() - INTERVAL 14 DAY, 'Max Strength Test', 'Testing heavy singles on the big three lifts');
SET @danny_max_test = LAST_INSERT_ID();

INSERT INTO Exercises (workout_id, user_id, body_part_id, exercise_name, sets, reps, weight, date) VALUES
(@danny_max_test, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Bench Press', 5, 1, 205.0, CURDATE() - INTERVAL 14 DAY),
(@danny_max_test, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Back Squat', 5, 1, 275.0, CURDATE() - INTERVAL 14 DAY),
(@danny_max_test, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Deadlift', 5, 1, 335.0, CURDATE() - INTERVAL 14 DAY),
(@danny_max_test, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Overhead Press', 4, 1, 135.0, CURDATE() - INTERVAL 14 DAY);

-- Danny: Functional bodybuilding accessory day
INSERT INTO Workouts (user_id, date, workout_name, notes)
VALUES (3, CURDATE() - INTERVAL 18 DAY, 'Functional Bodybuilding', 'Tempo work and unilateral focus for symmetry');
SET @danny_functional = LAST_INSERT_ID();

INSERT INTO Exercises (workout_id, user_id, body_part_id, exercise_name, sets, reps, weight, date) VALUES
(@danny_functional, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Legs'), 'Tempo Front Squat (3-1-1)', 4, 6, 185.0, CURDATE() - INTERVAL 18 DAY),
(@danny_functional, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Chest'), 'Dumbbell Incline Bench (3-1-1)', 4, 8, 70.0, CURDATE() - INTERVAL 18 DAY),
(@danny_functional, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Back'), 'Single Arm Dumbbell Row', 4, 10, 90.0, CURDATE() - INTERVAL 18 DAY),
(@danny_functional, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Shoulders'), 'Seated Arnold Press', 3, 12, 40.0, CURDATE() - INTERVAL 18 DAY),
(@danny_functional, 3, (SELECT body_part_id FROM BodyParts WHERE body_part_name = 'Core'), 'Standing Cable Wood Chop', 3, 15, 55.0, CURDATE() - INTERVAL 18 DAY);

-- ===================================
-- WORKOUT ROUTINES TEST DATA COMPLETE
-- ===================================
-- Total Routines Created:
--   User 1 (tom101): 5 routines (PPL + Recovery)
--   User 2 (jess101): 5 routines (Upper/Lower + Cardio + HIIT)
--   User 3 (danny101): 6 routines (Full Body + 5-Day Split + Hypertrophy)
-- ===================================

-- ===================================
-- FRIENDS & SOCIAL TEST DATA
-- ===================================
-- Add sample friend relationships and social interactions

-- Update user profiles with bio and privacy settings
UPDATE Users SET 
    bio = 'Fitness enthusiast focused on strength training and muscle building. Always looking to improve!',
    profile_visibility = 'public',
    show_stats_to_friends = TRUE,
    show_workouts_to_friends = TRUE,
    show_routines_to_public = TRUE
WHERE user_id = 1;

UPDATE Users SET 
    bio = 'Cardio lover and HIIT enthusiast. Love challenging workouts and staying active!',
    profile_visibility = 'public',
    show_stats_to_friends = TRUE,
    show_workouts_to_friends = TRUE,
    show_routines_to_public = TRUE
WHERE user_id = 2;

UPDATE Users SET 
    bio = 'Bodybuilder and powerlifter. Sharing my journey and helping others reach their goals.',
    profile_visibility = 'public',
    show_stats_to_friends = TRUE,
    show_workouts_to_friends = TRUE,
    show_routines_to_public = TRUE
WHERE user_id = 3;

-- Create friend relationships
-- tom101 and jess101 are friends
INSERT INTO Friends (user_id, friend_id, created_at) VALUES
(1, 2, NOW() - INTERVAL 30 DAY),
(2, 1, NOW() - INTERVAL 30 DAY);

-- tom101 and danny101 are friends
INSERT INTO Friends (user_id, friend_id, created_at) VALUES
(1, 3, NOW() - INTERVAL 15 DAY),
(3, 1, NOW() - INTERVAL 15 DAY);

-- jess101 and danny101 have a pending friend request (jess sent to danny)
INSERT INTO FriendRequests (sender_id, receiver_id, status, message, created_at) VALUES
(2, 3, 'pending', 'Hey! I saw your workout routines and they look amazing. Would love to connect!', NOW() - INTERVAL 5 DAY);

-- Update some routines to be public/friends_only for sharing
UPDATE WorkoutRoutines SET visibility = 'public' WHERE user_id = 1 AND routine_name = 'Push Day - Chest & Triceps';
UPDATE WorkoutRoutines SET visibility = 'public' WHERE user_id = 1 AND routine_name = 'Pull Day - Back & Biceps';
UPDATE WorkoutRoutines SET visibility = 'friends_only' WHERE user_id = 2 AND routine_name = 'Upper Body Strength';
UPDATE WorkoutRoutines SET visibility = 'public' WHERE user_id = 2 AND routine_name = 'HIIT Cardio Blast';
UPDATE WorkoutRoutines SET visibility = 'public' WHERE user_id = 3 AND routine_name = 'Full Body - Complete Workout';
UPDATE WorkoutRoutines SET visibility = 'friends_only' WHERE user_id = 3 AND routine_name = '5-Day Split - Chest & Triceps';

-- ===================================
-- FRIENDS & SOCIAL TEST DATA COMPLETE
-- ===================================
-- Friend Relationships:
--   tom101 ↔ jess101 (friends for 30 days)
--   tom101 ↔ danny101 (friends for 15 days)
--   jess101 → danny101 (pending friend request)
-- 
-- Public Routines:
--   tom101: Push Day, Pull Day
--   jess101: HIIT Cardio Blast
--   danny101: Full Body Complete Workout
-- 
-- Friends-Only Routines:
--   jess101: Upper Body Strength
--   danny101: 5-Day Split - Chest & Triceps
-- ===================================


