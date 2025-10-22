-- ===================================
-- FITNESS TRACKER - TEST DATA
-- ===================================
-- This file contains test users and sample workout data for development and testing
-- DO NOT run this in production!
-- ===================================

USE fitness_tracker;

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


