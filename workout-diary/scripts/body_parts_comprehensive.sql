-- ===================================
-- COMPREHENSIVE BODY PARTS INITIALIZATION
-- ===================================
-- This file ensures all body parts are properly mapped to anatomical categories
-- for accurate analytics, muscle balance tracking, and workout analysis
-- ===================================

USE fitness_tracker;

-- ===================================
-- BODY PARTS WITH ANATOMICAL CATEGORIES
-- ===================================

-- Clear existing body parts (only run on fresh setup)
-- TRUNCATE TABLE BodyParts;

-- Insert all body parts with comprehensive coverage
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
-- BODY PART TO ANATOMICAL CATEGORY MAPPING
-- ===================================
-- This helps with analytics grouping

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

-- ===================================
-- POPULATE BODY PART CATEGORIES
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
-- VERIFICATION QUERIES
-- ===================================

-- View all body parts with their categories
SELECT 
    bp.body_part_id,
    bp.body_part_name,
    bpc.anatomical_category,
    bpc.muscle_group_type
FROM BodyParts bp
LEFT JOIN BodyPartCategories bpc ON bp.body_part_id = bpc.body_part_id
ORDER BY 
    bpc.anatomical_category,
    bp.body_part_name;

-- Count by category
SELECT 
    bpc.anatomical_category,
    COUNT(*) as count
FROM BodyPartCategories bpc
GROUP BY bpc.anatomical_category
ORDER BY count DESC;

-- Count by muscle group type (for Push/Pull/Legs analytics)
SELECT 
    bpc.muscle_group_type,
    COUNT(*) as count
FROM BodyPartCategories bpc
GROUP BY bpc.muscle_group_type
ORDER BY count DESC;

-- ===================================
-- HELPER VIEWS FOR ANALYTICS
-- ===================================

-- View for easy access to body part categories
CREATE OR REPLACE VIEW vw_BodyPartMapping AS
SELECT 
    bp.body_part_id,
    bp.body_part_name,
    bpc.anatomical_category,
    bpc.muscle_group_type,
    CASE 
        WHEN bpc.muscle_group_type IN ('Push', 'Pull') THEN 'Upper Body'
        WHEN bpc.muscle_group_type = 'Legs' THEN 'Lower Body'
        WHEN bpc.muscle_group_type = 'Core' THEN 'Core'
        ELSE 'Other'
    END as body_region
FROM BodyParts bp
LEFT JOIN BodyPartCategories bpc ON bp.body_part_id = bpc.body_part_id;

-- ===================================
-- SUCCESS MESSAGE
-- ===================================
SELECT 'Body parts initialized successfully!' as status,
       COUNT(*) as total_body_parts
FROM BodyParts;

SELECT 'Body part categories mapped successfully!' as status,
       COUNT(*) as total_mappings
FROM BodyPartCategories;



