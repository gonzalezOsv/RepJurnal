-- ===================================
-- POPULATE MUSCLE MAPPINGS FOR ALL EXERCISES
-- ===================================
-- This script maps standard exercises to muscles based on exercise name patterns
-- Run after muscle_mapping_schema.sql
-- ===================================

-- First, let's see what exercises exist
-- SELECT standard_exercise_id, exercise_name, body_part_id FROM StandardExercises ORDER BY exercise_name;

-- ===================================
-- HELPER: Map exercises by name pattern
-- ===================================

-- CHEST EXERCISES
-- Bench Press variations
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 95
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Bench Press%' AND mg.muscle_name = 'Pectoralis Major (Chest)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 80
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Bench Press%' AND mg.muscle_name = 'Triceps Brachii';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 75
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Bench Press%' AND mg.muscle_name = 'Anterior Deltoids (Front Delts)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Stabilizer', 30
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Bench Press%' AND mg.muscle_name = 'Rectus Abdominis (Six Pack)';

-- Chest Fly variations
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 90
FROM StandardExercises se, MuscleGroups mg
WHERE (se.exercise_name LIKE '%Fly%' OR se.exercise_name LIKE '%Flye%') AND mg.muscle_name = 'Pectoralis Major (Chest)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Secondary', 40
FROM StandardExercises se, MuscleGroups mg
WHERE (se.exercise_name LIKE '%Fly%' OR se.exercise_name LIKE '%Flye%') AND mg.muscle_name = 'Anterior Deltoids (Front Delts)';

-- Push-ups
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 90
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Push%Up%' AND mg.muscle_name = 'Pectoralis Major (Chest)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 75
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Push%Up%' AND mg.muscle_name = 'Triceps Brachii';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 65
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Push%Up%' AND mg.muscle_name = 'Anterior Deltoids (Front Delts)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Stabilizer', 50
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Push%Up%' AND mg.muscle_name = 'Rectus Abdominis (Six Pack)';

-- Dips
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 85
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Dip%' AND mg.muscle_name = 'Pectoralis Major (Chest)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 90
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Dip%' AND mg.muscle_name = 'Triceps Brachii';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Secondary', 50
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Dip%' AND mg.muscle_name = 'Anterior Deltoids (Front Delts)';

-- ===================================
-- BACK EXERCISES
-- ===================================

-- Deadlift variations
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 95
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Deadlift%' AND mg.muscle_name = 'Erector Spinae (Lower Back)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 90
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Deadlift%' AND mg.muscle_name = 'Gluteus Maximus (Glutes)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 85
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Deadlift%' AND mg.muscle_name = 'Hamstrings';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 70
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Deadlift%' AND mg.muscle_name = 'Quadriceps (Quads)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Secondary', 65
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Deadlift%' AND mg.muscle_name = 'Trapezius (Traps)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Secondary', 50
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Deadlift%' AND mg.muscle_name = 'Forearm Flexors';

-- Pull-ups / Chin-ups
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 95
FROM StandardExercises se, MuscleGroups mg
WHERE (se.exercise_name LIKE '%Pull%Up%' OR se.exercise_name LIKE '%Chin%Up%') AND mg.muscle_name = 'Latissimus Dorsi (Lats)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 80
FROM StandardExercises se, MuscleGroups mg
WHERE (se.exercise_name LIKE '%Pull%Up%' OR se.exercise_name LIKE '%Chin%Up%') AND mg.muscle_name = 'Biceps Brachii';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 70
FROM StandardExercises se, MuscleGroups mg
WHERE (se.exercise_name LIKE '%Pull%Up%' OR se.exercise_name LIKE '%Chin%Up%') AND mg.muscle_name = 'Rhomboids';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Secondary', 60
FROM StandardExercises se, MuscleGroups mg
WHERE (se.exercise_name LIKE '%Pull%Up%' OR se.exercise_name LIKE '%Chin%Up%') AND mg.muscle_name = 'Trapezius (Traps)';

-- Rows (all variations)
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 90
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Row%' AND mg.muscle_name = 'Latissimus Dorsi (Lats)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 75
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Row%' AND mg.muscle_name = 'Rhomboids';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 70
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Row%' AND mg.muscle_name = 'Trapezius (Traps)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Secondary', 60
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Row%' AND mg.muscle_name = 'Posterior Deltoids (Rear Delts)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Secondary', 50
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Row%' AND mg.muscle_name = 'Biceps Brachii';

-- Lat Pulldown
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 95
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Lat%Pulldown%' AND mg.muscle_name = 'Latissimus Dorsi (Lats)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 75
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Lat%Pulldown%' AND mg.muscle_name = 'Biceps Brachii';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Secondary', 60
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Lat%Pulldown%' AND mg.muscle_name = 'Rhomboids';

-- ===================================
-- SHOULDER EXERCISES
-- ===================================

-- Shoulder Press / Overhead Press
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 95
FROM StandardExercises se, MuscleGroups mg
WHERE (se.exercise_name LIKE '%Shoulder%Press%' OR se.exercise_name LIKE '%Overhead%Press%' OR se.exercise_name LIKE '%Military%Press%') 
  AND mg.muscle_name = 'Anterior Deltoids (Front Delts)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 75
FROM StandardExercises se, MuscleGroups mg
WHERE (se.exercise_name LIKE '%Shoulder%Press%' OR se.exercise_name LIKE '%Overhead%Press%' OR se.exercise_name LIKE '%Military%Press%') 
  AND mg.muscle_name = 'Lateral Deltoids (Side Delts)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 80
FROM StandardExercises se, MuscleGroups mg
WHERE (se.exercise_name LIKE '%Shoulder%Press%' OR se.exercise_name LIKE '%Overhead%Press%' OR se.exercise_name LIKE '%Military%Press%') 
  AND mg.muscle_name = 'Triceps Brachii';

-- Lateral Raises
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 95
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Lateral%Raise%' AND mg.muscle_name = 'Lateral Deltoids (Side Delts)';

-- Front Raises
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 95
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Front%Raise%' AND mg.muscle_name = 'Anterior Deltoids (Front Delts)';

-- Rear Delt Fly
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 95
FROM StandardExercises se, MuscleGroups mg
WHERE (se.exercise_name LIKE '%Rear%Delt%' OR se.exercise_name LIKE '%Reverse%Fly%') 
  AND mg.muscle_name = 'Posterior Deltoids (Rear Delts)';

-- ===================================
-- ARM EXERCISES - BICEPS
-- ===================================

-- Bicep Curl (all variations)
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 95
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Bicep%Curl%' AND mg.muscle_name = 'Biceps Brachii';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Secondary', 60
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Bicep%Curl%' AND mg.muscle_name = 'Brachialis';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Secondary', 40
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Bicep%Curl%' AND mg.muscle_name = 'Forearm Flexors';

-- Hammer Curl
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 85
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Hammer%Curl%' AND mg.muscle_name = 'Biceps Brachii';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 80
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Hammer%Curl%' AND mg.muscle_name = 'Brachialis';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 70
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Hammer%Curl%' AND mg.muscle_name = 'Brachioradialis';

-- ===================================
-- ARM EXERCISES - TRICEPS
-- ===================================

-- Tricep Extension / Kickback
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 95
FROM StandardExercises se, MuscleGroups mg
WHERE (se.exercise_name LIKE '%Tricep%Extension%' OR se.exercise_name LIKE '%Tricep%Kickback%') 
  AND mg.muscle_name = 'Triceps Brachii';

-- Skull Crushers
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 95
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Skull%Crusher%' AND mg.muscle_name = 'Triceps Brachii';

-- ===================================
-- LEG EXERCISES
-- ===================================

-- Squat (all variations)
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 95
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Squat%' AND mg.muscle_name = 'Quadriceps (Quads)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 85
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Squat%' AND mg.muscle_name = 'Gluteus Maximus (Glutes)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 70
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Squat%' AND mg.muscle_name = 'Hamstrings';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Secondary', 60
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Squat%' AND mg.muscle_name = 'Erector Spinae (Lower Back)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Stabilizer', 50
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Squat%' AND mg.muscle_name = 'Rectus Abdominis (Six Pack)';

-- Leg Press
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 90
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Leg%Press%' AND mg.muscle_name = 'Quadriceps (Quads)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 80
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Leg%Press%' AND mg.muscle_name = 'Gluteus Maximus (Glutes)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Secondary', 60
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Leg%Press%' AND mg.muscle_name = 'Hamstrings';

-- Leg Extension
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 95
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Leg%Extension%' AND mg.muscle_name = 'Quadriceps (Quads)';

-- Leg Curl
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 95
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Leg%Curl%' AND mg.muscle_name = 'Hamstrings';

-- Lunges
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 90
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Lunge%' AND mg.muscle_name = 'Quadriceps (Quads)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 85
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Lunge%' AND mg.muscle_name = 'Gluteus Maximus (Glutes)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 70
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Lunge%' AND mg.muscle_name = 'Hamstrings';

-- Calf Raise
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 95
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Calf%Raise%' AND mg.muscle_name = 'Gastrocnemius (Calves)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 80
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Calf%Raise%' AND mg.muscle_name = 'Soleus';

-- ===================================
-- CORE/ABS EXERCISES
-- ===================================

-- Plank variations
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 95
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Plank%' AND mg.muscle_name = 'Rectus Abdominis (Six Pack)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 80
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Plank%' AND mg.muscle_name = 'Transverse Abdominis';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Secondary', 60
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Plank%' AND mg.muscle_name = 'External Obliques';

-- Crunches
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 95
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Crunch%' AND mg.muscle_name = 'Rectus Abdominis (Six Pack)';

-- Sit-ups
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 90
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Sit%Up%' AND mg.muscle_name = 'Rectus Abdominis (Six Pack)';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Secondary', 50
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Sit%Up%' AND mg.muscle_name = 'Hip Flexors (Iliopsoas)';

-- Russian Twist
INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 90
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Russian%Twist%' AND mg.muscle_name = 'External Obliques';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Primary', 85
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Russian%Twist%' AND mg.muscle_name = 'Internal Obliques';

INSERT IGNORE INTO ExerciseMuscleMapping (standard_exercise_id, muscle_group_id, activation_level, activation_percentage)
SELECT se.standard_exercise_id, mg.muscle_group_id, 'Secondary', 60
FROM StandardExercises se, MuscleGroups mg
WHERE se.exercise_name LIKE '%Russian%Twist%' AND mg.muscle_name = 'Rectus Abdominis (Six Pack)';

-- ===================================
-- COMPLETION STATUS
-- ===================================
SELECT 'Muscle mappings populated successfully!' as Status;
SELECT COUNT(*) as 'Total Mappings Created' FROM ExerciseMuscleMapping;
SELECT se.exercise_name, COUNT(emm.mapping_id) as muscle_count
FROM StandardExercises se
LEFT JOIN ExerciseMuscleMapping emm ON se.standard_exercise_id = emm.standard_exercise_id
GROUP BY se.standard_exercise_id
ORDER BY muscle_count DESC
LIMIT 20;

