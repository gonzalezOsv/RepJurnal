-- ===================================
-- MUSCLE MAPPING SYSTEM - SCHEMA & DATA
-- ===================================
-- Comprehensive muscle tracking for exercise analytics
-- Run this after init_db.sql to add muscle mapping capabilities
-- ===================================

-- ===================================
-- DROP EXISTING MUSCLE TABLES
-- ===================================
DROP TABLE IF EXISTS CustomExerciseMuscleMapping;
DROP TABLE IF EXISTS ExerciseMuscleMapping;
DROP TABLE IF EXISTS MuscleGroups;

-- ===================================
-- CREATE MUSCLE MAPPING TABLES
-- ===================================

-- Muscle Groups Table
CREATE TABLE IF NOT EXISTS MuscleGroups (
    muscle_group_id INT AUTO_INCREMENT PRIMARY KEY,
    muscle_name VARCHAR(100) NOT NULL UNIQUE,
    muscle_category ENUM('Upper Body', 'Lower Body', 'Core', 'Full Body') NOT NULL,
    muscle_region VARCHAR(50), -- e.g., 'Chest', 'Back', 'Legs', 'Arms', 'Shoulders'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_category (muscle_category),
    INDEX idx_region (muscle_region),
    INDEX idx_name (muscle_name)
);

-- Exercise-Muscle Mapping for Standard Exercises
CREATE TABLE IF NOT EXISTS ExerciseMuscleMapping (
    mapping_id INT AUTO_INCREMENT PRIMARY KEY,
    standard_exercise_id INT NOT NULL,
    muscle_group_id INT NOT NULL,
    activation_level ENUM('Primary', 'Secondary', 'Stabilizer') NOT NULL,
    activation_percentage FLOAT DEFAULT 0, -- Estimated % of muscle engagement (0-100)
    
    FOREIGN KEY (standard_exercise_id) REFERENCES StandardExercises(standard_exercise_id) ON DELETE CASCADE,
    FOREIGN KEY (muscle_group_id) REFERENCES MuscleGroups(muscle_group_id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_exercise_muscle (standard_exercise_id, muscle_group_id),
    INDEX idx_exercise (standard_exercise_id),
    INDEX idx_muscle (muscle_group_id),
    INDEX idx_activation (activation_level)
);

-- Custom Exercise-Muscle Mapping (user-defined)
CREATE TABLE IF NOT EXISTS CustomExerciseMuscleMapping (
    mapping_id INT AUTO_INCREMENT PRIMARY KEY,
    custom_exercise_id INT NOT NULL,
    muscle_group_id INT NOT NULL,
    activation_level ENUM('Primary', 'Secondary', 'Stabilizer') NOT NULL,
    
    FOREIGN KEY (custom_exercise_id) REFERENCES CustomExercises(custom_exercise_id) ON DELETE CASCADE,
    FOREIGN KEY (muscle_group_id) REFERENCES MuscleGroups(muscle_group_id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_custom_exercise_muscle (custom_exercise_id, muscle_group_id),
    INDEX idx_custom_exercise (custom_exercise_id),
    INDEX idx_muscle (muscle_group_id)
);

-- ===================================
-- POPULATE MUSCLE GROUPS
-- ===================================

-- CHEST
INSERT INTO MuscleGroups (muscle_name, muscle_category, muscle_region, description) VALUES
('Pectoralis Major (Chest)', 'Upper Body', 'Chest', 'Large chest muscle responsible for arm movement and pushing'),
('Pectoralis Minor', 'Upper Body', 'Chest', 'Small chest muscle beneath pectoralis major'),
('Serratus Anterior', 'Upper Body', 'Chest', 'Muscle along the ribcage, aids in scapular movement');

-- BACK
INSERT INTO MuscleGroups (muscle_name, muscle_category, muscle_region, description) VALUES
('Latissimus Dorsi (Lats)', 'Upper Body', 'Back', 'Large V-shaped back muscle for pulling movements'),
('Trapezius (Traps)', 'Upper Body', 'Back', 'Upper back muscle for shoulder and neck movement'),
('Rhomboids', 'Upper Body', 'Back', 'Mid-back muscles for scapular retraction'),
('Erector Spinae (Lower Back)', 'Core', 'Lower Back', 'Spine stabilizers and extensors'),
('Teres Major', 'Upper Body', 'Back', 'Assists with lat movements');

-- SHOULDERS
INSERT INTO MuscleGroups (muscle_name, muscle_category, muscle_region, description) VALUES
('Anterior Deltoids (Front Delts)', 'Upper Body', 'Shoulders', 'Front shoulder muscles for pressing and raising'),
('Lateral Deltoids (Side Delts)', 'Upper Body', 'Shoulders', 'Side shoulder muscles for lateral raises'),
('Posterior Deltoids (Rear Delts)', 'Upper Body', 'Shoulders', 'Rear shoulder muscles for rowing and pulling'),
('Rotator Cuff', 'Upper Body', 'Shoulders', 'Group of stabilizing shoulder muscles');

-- ARMS - BICEPS
INSERT INTO MuscleGroups (muscle_name, muscle_category, muscle_region, description) VALUES
('Biceps Brachii', 'Upper Body', 'Arms', 'Front upper arm muscle for elbow flexion'),
('Brachialis', 'Upper Body', 'Arms', 'Underneath biceps, aids in elbow flexion'),
('Brachioradialis', 'Upper Body', 'Arms', 'Forearm muscle involved in bicep movements');

-- ARMS - TRICEPS
INSERT INTO MuscleGroups (muscle_name, muscle_category, muscle_region, description) VALUES
('Triceps Brachii', 'Upper Body', 'Arms', 'Back of upper arm for elbow extension');

-- FOREARMS
INSERT INTO MuscleGroups (muscle_name, muscle_category, muscle_region, description) VALUES
('Forearm Flexors', 'Upper Body', 'Forearms', 'Inside forearm muscles for grip and wrist flexion'),
('Forearm Extensors', 'Upper Body', 'Forearms', 'Outside forearm muscles for wrist extension');

-- CORE / ABS
INSERT INTO MuscleGroups (muscle_name, muscle_category, muscle_region, description) VALUES
('Rectus Abdominis (Six Pack)', 'Core', 'Abs', 'Front abdominal muscles for trunk flexion'),
('External Obliques', 'Core', 'Abs', 'Side abdominal muscles for rotation and lateral flexion'),
('Internal Obliques', 'Core', 'Abs', 'Deep side abdominal muscles'),
('Transverse Abdominis', 'Core', 'Abs', 'Deepest core muscle for stability'),
('Serratus Posterior', 'Core', 'Core', 'Back muscles assisting with breathing and stability');

-- LEGS - QUADRICEPS
INSERT INTO MuscleGroups (muscle_name, muscle_category, muscle_region, description) VALUES
('Quadriceps (Quads)', 'Lower Body', 'Legs', 'Front thigh muscles for knee extension'),
('Rectus Femoris', 'Lower Body', 'Legs', 'Quad muscle that crosses hip and knee'),
('Vastus Lateralis', 'Lower Body', 'Legs', 'Outer quad muscle'),
('Vastus Medialis', 'Lower Body', 'Legs', 'Inner quad muscle'),
('Vastus Intermedius', 'Lower Body', 'Legs', 'Deep quad muscle');

-- LEGS - HAMSTRINGS
INSERT INTO MuscleGroups (muscle_name, muscle_category, muscle_region, description) VALUES
('Hamstrings', 'Lower Body', 'Legs', 'Back thigh muscles for knee flexion and hip extension'),
('Biceps Femoris', 'Lower Body', 'Legs', 'Lateral hamstring muscle'),
('Semitendinosus', 'Lower Body', 'Legs', 'Medial hamstring muscle'),
('Semimembranosus', 'Lower Body', 'Legs', 'Medial hamstring muscle');

-- LEGS - GLUTES
INSERT INTO MuscleGroups (muscle_name, muscle_category, muscle_region, description) VALUES
('Gluteus Maximus (Glutes)', 'Lower Body', 'Glutes', 'Large butt muscle for hip extension'),
('Gluteus Medius', 'Lower Body', 'Glutes', 'Side glute for hip abduction and stability'),
('Gluteus Minimus', 'Lower Body', 'Glutes', 'Smallest glute muscle for hip stabilization');

-- LEGS - CALVES
INSERT INTO MuscleGroups (muscle_name, muscle_category, muscle_region, description) VALUES
('Gastrocnemius (Calves)', 'Lower Body', 'Calves', 'Large calf muscle for plantar flexion'),
('Soleus', 'Lower Body', 'Calves', 'Deep calf muscle for ankle stability');

-- LEGS - HIP/ADDUCTORS
INSERT INTO MuscleGroups (muscle_name, muscle_category, muscle_region, description) VALUES
('Hip Adductors', 'Lower Body', 'Legs', 'Inner thigh muscles for leg adduction'),
('Hip Abductors', 'Lower Body', 'Legs', 'Outer hip muscles for leg abduction'),
('Hip Flexors (Iliopsoas)', 'Lower Body', 'Legs', 'Front hip muscles for leg raising');

-- FULL BODY
INSERT INTO MuscleGroups (muscle_name, muscle_category, muscle_region, description) VALUES
('Full Body Engagement', 'Full Body', 'Full Body', 'Exercises engaging multiple muscle groups simultaneously');

-- ===================================
-- EXERCISE-MUSCLE MAPPINGS
-- ===================================
-- Note: standard_exercise_id values must match your StandardExercises table
-- This is a template - adjust IDs based on your actual exercise IDs
-- ===================================

-- Helper: Get muscle_group_id by name
-- You'll need to replace <muscle_id> with actual IDs from SELECT muscle_group_id FROM MuscleGroups WHERE muscle_name = 'X';

-- ===================================
-- COMPOUND MOVEMENTS - CHEST
-- ===================================

-- BENCH PRESS (assuming exercise_id = 1)
-- Primary muscles
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 1, muscle_group_id, 'Primary', 95 FROM MuscleGroups WHERE muscle_name = 'Pectoralis Major (Chest)';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 1, muscle_group_id, 'Primary', 80 FROM MuscleGroups WHERE muscle_name = 'Triceps Brachii';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 1, muscle_group_id, 'Primary', 75 FROM MuscleGroups WHERE muscle_name = 'Anterior Deltoids (Front Delts)';

-- Secondary muscles
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 1, muscle_group_id, 'Secondary', 40 FROM MuscleGroups WHERE muscle_name = 'Serratus Anterior';

-- Stabilizers
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 1, muscle_group_id, 'Stabilizer', 30 FROM MuscleGroups WHERE muscle_name = 'Rectus Abdominis (Six Pack)';

-- ===================================
-- COMPOUND MOVEMENTS - BACK
-- ===================================

-- DEADLIFT (assuming exercise_id = 2)
-- Primary muscles
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 2, muscle_group_id, 'Primary', 95 FROM MuscleGroups WHERE muscle_name = 'Erector Spinae (Lower Back)';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 2, muscle_group_id, 'Primary', 90 FROM MuscleGroups WHERE muscle_name = 'Gluteus Maximus (Glutes)';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 2, muscle_group_id, 'Primary', 85 FROM MuscleGroups WHERE muscle_name = 'Hamstrings';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 2, muscle_group_id, 'Primary', 70 FROM MuscleGroups WHERE muscle_name = 'Quadriceps (Quads)';

-- Secondary muscles
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 2, muscle_group_id, 'Secondary', 65 FROM MuscleGroups WHERE muscle_name = 'Trapezius (Traps)';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 2, muscle_group_id, 'Secondary', 60 FROM MuscleGroups WHERE muscle_name = 'Latissimus Dorsi (Lats)';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 2, muscle_group_id, 'Secondary', 50 FROM MuscleGroups WHERE muscle_name = 'Forearm Flexors';

-- Stabilizers
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 2, muscle_group_id, 'Stabilizer', 40 FROM MuscleGroups WHERE muscle_name = 'Rectus Abdominis (Six Pack)';

-- PULL-UP / CHIN-UP (assuming exercise_id = 3)
-- Primary muscles
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 3, muscle_group_id, 'Primary', 95 FROM MuscleGroups WHERE muscle_name = 'Latissimus Dorsi (Lats)';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 3, muscle_group_id, 'Primary', 80 FROM MuscleGroups WHERE muscle_name = 'Biceps Brachii';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 3, muscle_group_id, 'Primary', 70 FROM MuscleGroups WHERE muscle_name = 'Rhomboids';

-- Secondary muscles
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 3, muscle_group_id, 'Secondary', 65 FROM MuscleGroups WHERE muscle_name = 'Trapezius (Traps)';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 3, muscle_group_id, 'Secondary', 60 FROM MuscleGroups WHERE muscle_name = 'Forearm Flexors';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 3, muscle_group_id, 'Secondary', 50 FROM MuscleGroups WHERE muscle_name = 'Posterior Deltoids (Rear Delts)';

-- Stabilizers
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 3, muscle_group_id, 'Stabilizer', 40 FROM MuscleGroups WHERE muscle_name = 'Rectus Abdominis (Six Pack)';

-- ===================================
-- COMPOUND MOVEMENTS - LEGS
-- ===================================

-- SQUAT (assuming exercise_id = 4)
-- Primary muscles
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 4, muscle_group_id, 'Primary', 95 FROM MuscleGroups WHERE muscle_name = 'Quadriceps (Quads)';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 4, muscle_group_id, 'Primary', 85 FROM MuscleGroups WHERE muscle_name = 'Gluteus Maximus (Glutes)';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 4, muscle_group_id, 'Primary', 70 FROM MuscleGroups WHERE muscle_name = 'Hamstrings';

-- Secondary muscles
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 4, muscle_group_id, 'Secondary', 60 FROM MuscleGroups WHERE muscle_name = 'Erector Spinae (Lower Back)';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 4, muscle_group_id, 'Secondary', 40 FROM MuscleGroups WHERE muscle_name = 'Gastrocnemius (Calves)';

-- Stabilizers
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 4, muscle_group_id, 'Stabilizer', 50 FROM MuscleGroups WHERE muscle_name = 'Rectus Abdominis (Six Pack)';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 4, muscle_group_id, 'Stabilizer', 45 FROM MuscleGroups WHERE muscle_name = 'External Obliques';

-- ===================================
-- COMPOUND MOVEMENTS - SHOULDERS
-- ===================================

-- OVERHEAD PRESS (assuming exercise_id = 5)
-- Primary muscles
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 5, muscle_group_id, 'Primary', 95 FROM MuscleGroups WHERE muscle_name = 'Anterior Deltoids (Front Delts)';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 5, muscle_group_id, 'Primary', 75 FROM MuscleGroups WHERE muscle_name = 'Lateral Deltoids (Side Delts)';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 5, muscle_group_id, 'Primary', 80 FROM MuscleGroups WHERE muscle_name = 'Triceps Brachii';

-- Secondary muscles
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 5, muscle_group_id, 'Secondary', 50 FROM MuscleGroups WHERE muscle_name = 'Trapezius (Traps)';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 5, muscle_group_id, 'Secondary', 40 FROM MuscleGroups WHERE muscle_name = 'Pectoralis Major (Chest)';

-- Stabilizers
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 5, muscle_group_id, 'Stabilizer', 45 FROM MuscleGroups WHERE muscle_name = 'Rectus Abdominis (Six Pack)';

-- ===================================
-- ISOLATION EXERCISES - ARMS
-- ===================================

-- BICEP CURL (assuming exercise_id = 6)
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 6, muscle_group_id, 'Primary', 95 FROM MuscleGroups WHERE muscle_name = 'Biceps Brachii';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 6, muscle_group_id, 'Secondary', 60 FROM MuscleGroups WHERE muscle_name = 'Brachialis';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 6, muscle_group_id, 'Secondary', 40 FROM MuscleGroups WHERE muscle_name = 'Forearm Flexors';

-- TRICEP EXTENSION (assuming exercise_id = 7)
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 7, muscle_group_id, 'Primary', 95 FROM MuscleGroups WHERE muscle_name = 'Triceps Brachii';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 7, muscle_group_id, 'Secondary', 30 FROM MuscleGroups WHERE muscle_name = 'Anterior Deltoids (Front Delts)';

-- ===================================
-- ISOLATION EXERCISES - LEGS
-- ===================================

-- LEG CURL (assuming exercise_id = 8)
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 8, muscle_group_id, 'Primary', 95 FROM MuscleGroups WHERE muscle_name = 'Hamstrings';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 8, muscle_group_id, 'Secondary', 30 FROM MuscleGroups WHERE muscle_name = 'Gastrocnemius (Calves)';

-- LEG EXTENSION (assuming exercise_id = 9)
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 9, muscle_group_id, 'Primary', 95 FROM MuscleGroups WHERE muscle_name = 'Quadriceps (Quads)';

-- CALF RAISE (assuming exercise_id = 10)
INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 10, muscle_group_id, 'Primary', 95 FROM MuscleGroups WHERE muscle_name = 'Gastrocnemius (Calves)';

INSERT INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT 10, muscle_group_id, 'Primary', 80 FROM MuscleGroups WHERE muscle_name = 'Soleus';

-- ===================================
-- ANALYTICS VIEWS
-- ===================================

-- View: Exercise Muscle Targets
CREATE OR REPLACE VIEW ExerciseMuscleSummary AS
SELECT 
    se.standard_exercise_id,
    se.exercise_name,
    bp.body_part_name,
    mg.muscle_name,
    mg.muscle_category,
    mg.muscle_region,
    emm.activation_level,
    emm.activation_percentage
FROM StandardExercises se
LEFT JOIN ExerciseMuscleMapping emm ON se.standard_exercise_id = emm.standard_exercise_id
LEFT JOIN MuscleGroups mg ON emm.muscle_group_id = mg.muscle_group_id
LEFT JOIN BodyParts bp ON se.body_part_id = bp.body_part_id
ORDER BY se.exercise_name, emm.activation_percentage DESC;

-- View: Workout Muscle Coverage
CREATE OR REPLACE VIEW WorkoutMuscleCoverage AS
SELECT 
    e.workout_id,
    e.user_id,
    e.date,
    mg.muscle_name,
    mg.muscle_category,
    mg.muscle_region,
    emm.activation_level,
    COUNT(DISTINCT e.exercise_id) as exercise_count,
    AVG(emm.activation_percentage) as avg_activation_pct,
    SUM(e.sets * e.reps * COALESCE(e.weight, 0)) as total_volume
FROM Exercises e
LEFT JOIN StandardExercises se ON e.standard_exercise_id = se.standard_exercise_id
LEFT JOIN ExerciseMuscleMapping emm ON se.standard_exercise_id = emm.standard_exercise_id
LEFT JOIN MuscleGroups mg ON emm.muscle_group_id = mg.muscle_group_id
WHERE emm.mapping_id IS NOT NULL
GROUP BY e.workout_id, e.user_id, e.date, mg.muscle_name, mg.muscle_category, mg.muscle_region, emm.activation_level;

-- View: User Muscle Balance (30-day)
CREATE OR REPLACE VIEW UserMuscleBalance30Days AS
SELECT 
    e.user_id,
    mg.muscle_category,
    mg.muscle_region,
    COUNT(DISTINCT e.exercise_id) as exercises_performed,
    SUM(e.sets * COALESCE(e.reps, 0)) as total_reps,
    SUM(e.sets * COALESCE(e.reps, 0) * COALESCE(e.weight, 0)) as total_volume,
    COUNT(DISTINCT e.date) as days_trained,
    AVG(emm.activation_percentage) as avg_muscle_activation
FROM Exercises e
LEFT JOIN StandardExercises se ON e.standard_exercise_id = se.standard_exercise_id
LEFT JOIN ExerciseMuscleMapping emm ON se.standard_exercise_id = emm.standard_exercise_id
LEFT JOIN MuscleGroups mg ON emm.muscle_group_id = mg.muscle_group_id
WHERE emm.activation_level IN ('Primary', 'Secondary')
  AND e.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
  AND e.exercise_type = 'strength'
GROUP BY e.user_id, mg.muscle_category, mg.muscle_region
ORDER BY e.user_id, total_volume DESC;

-- View: Exercise Effectiveness Score
CREATE OR REPLACE VIEW ExerciseEffectivenessScore AS
SELECT 
    se.standard_exercise_id,
    se.exercise_name,
    bp.body_part_name,
    se.is_compound,
    COUNT(DISTINCT mg.muscle_group_id) as total_muscles_targeted,
    COUNT(DISTINCT CASE WHEN emm.activation_level = 'Primary' THEN mg.muscle_group_id END) as primary_muscles,
    COUNT(DISTINCT CASE WHEN emm.activation_level = 'Secondary' THEN mg.muscle_group_id END) as secondary_muscles,
    COUNT(DISTINCT CASE WHEN emm.activation_level = 'Stabilizer' THEN mg.muscle_group_id END) as stabilizer_muscles,
    AVG(emm.activation_percentage) as avg_activation_pct,
    -- Effectiveness score: weighted sum
    (COUNT(DISTINCT CASE WHEN emm.activation_level = 'Primary' THEN mg.muscle_group_id END) * 3 +
     COUNT(DISTINCT CASE WHEN emm.activation_level = 'Secondary' THEN mg.muscle_group_id END) * 2 +
     COUNT(DISTINCT CASE WHEN emm.activation_level = 'Stabilizer' THEN mg.muscle_group_id END) * 1) as effectiveness_score
FROM StandardExercises se
LEFT JOIN ExerciseMuscleMapping emm ON se.standard_exercise_id = emm.standard_exercise_id
LEFT JOIN MuscleGroups mg ON emm.muscle_group_id = mg.muscle_group_id
LEFT JOIN BodyParts bp ON se.body_part_id = bp.body_part_id
GROUP BY se.standard_exercise_id, se.exercise_name, bp.body_part_name, se.is_compound
ORDER BY effectiveness_score DESC;

-- ===================================
-- COMPLETION MESSAGE
-- ===================================
SELECT 'Muscle mapping schema created successfully!' as Status;
SELECT COUNT(*) as 'Total Muscle Groups' FROM MuscleGroups;
SELECT COUNT(*) as 'Total Exercise-Muscle Mappings' FROM ExerciseMuscleMapping;





