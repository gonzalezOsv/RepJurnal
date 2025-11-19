-- ===================================
-- BODY PARTS TO MUSCLE GROUPS BRIDGE
-- ===================================
-- This script creates a bridge between the simple BodyParts system
-- and the advanced MuscleGroups system, allowing both to work together.
-- 
-- Run this AFTER both init_db.sql AND muscle_mapping_schema.sql
-- ===================================

USE fitness_tracker;

-- ===================================
-- BRIDGE TABLE
-- ===================================

CREATE TABLE IF NOT EXISTS BodyPartMuscleMapping (
    mapping_id INT AUTO_INCREMENT PRIMARY KEY,
    body_part_id INT NOT NULL,
    muscle_group_id INT NOT NULL,
    relevance_score FLOAT DEFAULT 1.0 COMMENT 'How relevant this muscle is to the body part (0-1)',
    is_primary BOOLEAN DEFAULT TRUE COMMENT 'Is this a primary muscle for this body part?',
    
    FOREIGN KEY (body_part_id) REFERENCES BodyParts(body_part_id) ON DELETE CASCADE,
    FOREIGN KEY (muscle_group_id) REFERENCES MuscleGroups(muscle_group_id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_bodypart_muscle (body_part_id, muscle_group_id),
    INDEX idx_body_part (body_part_id),
    INDEX idx_muscle_group (muscle_group_id),
    INDEX idx_relevance (relevance_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Maps simple body parts to detailed muscle groups';

-- ===================================
-- POPULATE MAPPINGS
-- ===================================

-- CHEST → Chest Muscles
INSERT INTO BodyPartMuscleMapping (body_part_id, muscle_group_id, relevance_score, is_primary)
SELECT 
    bp.body_part_id,
    mg.muscle_group_id,
    1.0,
    TRUE
FROM BodyParts bp
CROSS JOIN MuscleGroups mg
WHERE bp.body_part_name IN ('Chest', 'Upper Chest', 'Lower Chest')
  AND mg.muscle_name IN ('Pectoralis Major (Chest)', 'Pectoralis Minor', 'Serratus Anterior')
ON DUPLICATE KEY UPDATE relevance_score = VALUES(relevance_score);

-- BACK → Back Muscles
INSERT INTO BodyPartMuscleMapping (body_part_id, muscle_group_id, relevance_score, is_primary)
SELECT 
    bp.body_part_id,
    mg.muscle_group_id,
    CASE 
        WHEN bp.body_part_name = 'Lats' AND mg.muscle_name = 'Latissimus Dorsi (Lats)' THEN 1.0
        WHEN bp.body_part_name = 'Traps' AND mg.muscle_name = 'Trapezius (Traps)' THEN 1.0
        WHEN bp.body_part_name = 'Lower Back' AND mg.muscle_name = 'Erector Spinae (Lower Back)' THEN 1.0
        ELSE 0.8
    END,
    TRUE
FROM BodyParts bp
CROSS JOIN MuscleGroups mg
WHERE bp.body_part_name IN ('Back', 'Lats', 'Upper Back', 'Mid Back', 'Lower Back', 'Traps')
  AND mg.muscle_name IN ('Latissimus Dorsi (Lats)', 'Trapezius (Traps)', 'Rhomboids', 'Erector Spinae (Lower Back)', 'Teres Major')
ON DUPLICATE KEY UPDATE relevance_score = VALUES(relevance_score);

-- SHOULDERS → Deltoid Muscles
INSERT INTO BodyPartMuscleMapping (body_part_id, muscle_group_id, relevance_score, is_primary)
SELECT 
    bp.body_part_id,
    mg.muscle_group_id,
    CASE 
        WHEN bp.body_part_name = 'Front Delts' AND mg.muscle_name = 'Anterior Deltoids (Front Delts)' THEN 1.0
        WHEN bp.body_part_name = 'Side Delts' AND mg.muscle_name = 'Lateral Deltoids (Side Delts)' THEN 1.0
        WHEN bp.body_part_name = 'Rear Delts' AND mg.muscle_name = 'Posterior Deltoids (Rear Delts)' THEN 1.0
        ELSE 0.9
    END,
    TRUE
FROM BodyParts bp
CROSS JOIN MuscleGroups mg
WHERE bp.body_part_name IN ('Shoulders', 'Front Delts', 'Side Delts', 'Rear Delts')
  AND mg.muscle_name IN ('Anterior Deltoids (Front Delts)', 'Lateral Deltoids (Side Delts)', 'Posterior Deltoids (Rear Delts)', 'Rotator Cuff')
ON DUPLICATE KEY UPDATE relevance_score = VALUES(relevance_score);

-- ARMS - BICEPS → Bicep Muscles
INSERT INTO BodyPartMuscleMapping (body_part_id, muscle_group_id, relevance_score, is_primary)
SELECT 
    bp.body_part_id,
    mg.muscle_group_id,
    1.0,
    TRUE
FROM BodyParts bp
CROSS JOIN MuscleGroups mg
WHERE bp.body_part_name = 'Biceps'
  AND mg.muscle_name IN ('Biceps Brachii', 'Brachialis', 'Brachioradialis')
ON DUPLICATE KEY UPDATE relevance_score = VALUES(relevance_score);

-- ARMS - TRICEPS → Tricep Muscles
INSERT INTO BodyPartMuscleMapping (body_part_id, muscle_group_id, relevance_score, is_primary)
SELECT 
    bp.body_part_id,
    mg.muscle_group_id,
    1.0,
    TRUE
FROM BodyParts bp
CROSS JOIN MuscleGroups mg
WHERE bp.body_part_name = 'Triceps'
  AND mg.muscle_name = 'Triceps Brachii'
ON DUPLICATE KEY UPDATE relevance_score = VALUES(relevance_score);

-- ARMS - FOREARMS → Forearm Muscles
INSERT INTO BodyPartMuscleMapping (body_part_id, muscle_group_id, relevance_score, is_primary)
SELECT 
    bp.body_part_id,
    mg.muscle_group_id,
    1.0,
    TRUE
FROM BodyParts bp
CROSS JOIN MuscleGroups mg
WHERE bp.body_part_name = 'Forearms'
  AND mg.muscle_name IN ('Forearm Flexors', 'Forearm Extensors', 'Brachioradialis')
ON DUPLICATE KEY UPDATE relevance_score = VALUES(relevance_score);

-- CORE/ABS → Core Muscles
INSERT INTO BodyPartMuscleMapping (body_part_id, muscle_group_id, relevance_score, is_primary)
SELECT 
    bp.body_part_id,
    mg.muscle_group_id,
    CASE 
        WHEN bp.body_part_name = 'Abs' AND mg.muscle_name = 'Rectus Abdominis (Six Pack)' THEN 1.0
        WHEN bp.body_part_name = 'Obliques' AND mg.muscle_name IN ('External Obliques', 'Internal Obliques') THEN 1.0
        ELSE 0.8
    END,
    TRUE
FROM BodyParts bp
CROSS JOIN MuscleGroups mg
WHERE bp.body_part_name IN ('Abs', 'Obliques', 'Core', 'Serratus')
  AND mg.muscle_name IN ('Rectus Abdominis (Six Pack)', 'External Obliques', 'Internal Obliques', 'Transverse Abdominis', 'Serratus Posterior', 'Serratus Anterior')
ON DUPLICATE KEY UPDATE relevance_score = VALUES(relevance_score);

-- LEGS - QUADS → Quad Muscles
INSERT INTO BodyPartMuscleMapping (body_part_id, muscle_group_id, relevance_score, is_primary)
SELECT 
    bp.body_part_id,
    mg.muscle_group_id,
    1.0,
    TRUE
FROM BodyParts bp
CROSS JOIN MuscleGroups mg
WHERE bp.body_part_name IN ('Legs', 'Quads')
  AND mg.muscle_name IN ('Quadriceps (Quads)', 'Rectus Femoris', 'Vastus Lateralis', 'Vastus Medialis', 'Vastus Intermedius')
ON DUPLICATE KEY UPDATE relevance_score = VALUES(relevance_score);

-- LEGS - HAMSTRINGS → Hamstring Muscles
INSERT INTO BodyPartMuscleMapping (body_part_id, muscle_group_id, relevance_score, is_primary)
SELECT 
    bp.body_part_id,
    mg.muscle_group_id,
    1.0,
    TRUE
FROM BodyParts bp
CROSS JOIN MuscleGroups mg
WHERE bp.body_part_name = 'Hamstrings'
  AND mg.muscle_name IN ('Hamstrings', 'Biceps Femoris', 'Semitendinosus', 'Semimembranosus')
ON DUPLICATE KEY UPDATE relevance_score = VALUES(relevance_score);

-- LEGS - GLUTES → Glute Muscles
INSERT INTO BodyPartMuscleMapping (body_part_id, muscle_group_id, relevance_score, is_primary)
SELECT 
    bp.body_part_id,
    mg.muscle_group_id,
    1.0,
    TRUE
FROM BodyParts bp
CROSS JOIN MuscleGroups mg
WHERE bp.body_part_name = 'Glutes'
  AND mg.muscle_name IN ('Gluteus Maximus (Glutes)', 'Gluteus Medius', 'Gluteus Minimus')
ON DUPLICATE KEY UPDATE relevance_score = VALUES(relevance_score);

-- LEGS - CALVES → Calf Muscles
INSERT INTO BodyPartMuscleMapping (body_part_id, muscle_group_id, relevance_score, is_primary)
SELECT 
    bp.body_part_id,
    mg.muscle_group_id,
    1.0,
    TRUE
FROM BodyParts bp
CROSS JOIN MuscleGroups mg
WHERE bp.body_part_name = 'Calves'
  AND mg.muscle_name IN ('Gastrocnemius (Calves)', 'Soleus')
ON DUPLICATE KEY UPDATE relevance_score = VALUES(relevance_score);

-- LEGS - HIP FLEXORS/ADDUCTORS/ABDUCTORS
INSERT INTO BodyPartMuscleMapping (body_part_id, muscle_group_id, relevance_score, is_primary)
SELECT 
    bp.body_part_id,
    mg.muscle_group_id,
    1.0,
    TRUE
FROM BodyParts bp
CROSS JOIN MuscleGroups mg
WHERE bp.body_part_name IN ('Hip Flexors', 'Adductors', 'Abductors')
  AND mg.muscle_name IN ('Hip Flexors (Iliopsoas)', 'Hip Adductors', 'Hip Abductors')
  AND (
      (bp.body_part_name = 'Hip Flexors' AND mg.muscle_name = 'Hip Flexors (Iliopsoas)') OR
      (bp.body_part_name = 'Adductors' AND mg.muscle_name = 'Hip Adductors') OR
      (bp.body_part_name = 'Abductors' AND mg.muscle_name = 'Hip Abductors')
  )
ON DUPLICATE KEY UPDATE relevance_score = VALUES(relevance_score);

-- FULL BODY
INSERT INTO BodyPartMuscleMapping (body_part_id, muscle_group_id, relevance_score, is_primary)
SELECT 
    bp.body_part_id,
    mg.muscle_group_id,
    1.0,
    TRUE
FROM BodyParts bp
CROSS JOIN MuscleGroups mg
WHERE bp.body_part_name = 'Full Body'
  AND mg.muscle_name = 'Full Body Engagement'
ON DUPLICATE KEY UPDATE relevance_score = VALUES(relevance_score);

-- ===================================
-- ANALYTICS VIEW
-- ===================================

-- Enhanced view that combines body parts with muscle groups
CREATE OR REPLACE VIEW vw_EnhancedBodyPartMapping AS
SELECT 
    bp.body_part_id,
    bp.body_part_name,
    bpc.anatomical_category,
    bpc.muscle_group_type,
    mg.muscle_group_id,
    mg.muscle_name,
    mg.muscle_category,
    mg.muscle_region,
    bpm.relevance_score,
    bpm.is_primary
FROM BodyParts bp
LEFT JOIN BodyPartCategories bpc ON bp.body_part_id = bpc.body_part_id
LEFT JOIN BodyPartMuscleMapping bpm ON bp.body_part_id = bpm.body_part_id
LEFT JOIN MuscleGroups mg ON bpm.muscle_group_id = mg.muscle_group_id
ORDER BY bp.body_part_name, bpm.relevance_score DESC;

-- ===================================
-- VERIFICATION QUERIES
-- ===================================

-- Count mappings per body part
SELECT 
    bp.body_part_name,
    COUNT(mg.muscle_group_id) as muscle_count
FROM BodyParts bp
LEFT JOIN BodyPartMuscleMapping bpm ON bp.body_part_id = bpm.body_part_id
LEFT JOIN MuscleGroups mg ON bpm.muscle_group_id = mg.muscle_group_id
GROUP BY bp.body_part_name
ORDER BY muscle_count DESC;

-- View all mappings
SELECT 
    bp.body_part_name,
    mg.muscle_name,
    bpm.relevance_score,
    bpm.is_primary
FROM BodyPartMuscleMapping bpm
JOIN BodyParts bp ON bpm.body_part_id = bp.body_part_id
JOIN MuscleGroups mg ON bpm.muscle_group_id = mg.muscle_group_id
ORDER BY bp.body_part_name, bpm.relevance_score DESC;

-- ===================================
-- SUCCESS MESSAGE
-- ===================================
SELECT 'Body Parts to Muscle Groups bridge created successfully!' as status,
       COUNT(*) as total_mappings
FROM BodyPartMuscleMapping;



