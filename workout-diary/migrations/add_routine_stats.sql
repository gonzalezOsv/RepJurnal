-- ============================================================================
-- ROUTINE STATS MIGRATION
-- Description: Add statistics tracking for workout routines
-- Author: AI Assistant
-- Date: 2025-01-04
-- Version: 1.0
-- ============================================================================

-- This migration adds two new tables for tracking routine statistics:
-- 1. RoutineStats: Public stats (visible to everyone viewing the routine)
-- 2. UserRoutineStats: Personal stats (visible only to the user)

-- ============================================================================
-- TABLE 1: RoutineStats (Public Statistics)
-- Purpose: Track public/social metrics for routines
-- ============================================================================

CREATE TABLE IF NOT EXISTS `RoutineStats` (
    `stat_id` INT AUTO_INCREMENT PRIMARY KEY,
    `routine_id` INT NOT NULL UNIQUE,
    
    -- PUBLIC STATS (visible to everyone who can see the routine)
    `times_copied` INT NOT NULL DEFAULT 0 COMMENT 'How many times routine was imported by other users',
    `total_completions_all_users` INT NOT NULL DEFAULT 0 COMMENT 'Total completions by all users',
    `active_users_count` INT NOT NULL DEFAULT 0 COMMENT 'Users who used it in last 30 days',
    `popularity_score` FLOAT NOT NULL DEFAULT 0.0 COMMENT 'Calculated popularity metric',
    
    -- Aggregate metrics
    `total_volume_all_users` FLOAT NOT NULL DEFAULT 0.0 COMMENT 'Sum of all weight lifted by all users',
    `average_completion_time` FLOAT NULL COMMENT 'Average time to complete (minutes)',
    
    -- Timestamps
    `last_used_by_anyone` TIMESTAMP NULL COMMENT 'Last time anyone used this routine',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (`routine_id`) REFERENCES `WorkoutRoutines`(`routine_id`) ON DELETE CASCADE,
    
    -- Indexes
    INDEX `idx_routine_stats_routine_id` (`routine_id`),
    INDEX `idx_routine_stats_popularity` (`popularity_score`),
    INDEX `idx_routine_stats_times_copied` (`times_copied`)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Public statistics for workout routines';


-- ============================================================================
-- TABLE 2: UserRoutineStats (Personal Statistics)
-- Purpose: Track individual user's interaction with routines
-- ============================================================================

CREATE TABLE IF NOT EXISTS `UserRoutineStats` (
    `user_routine_stat_id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `routine_id` INT NOT NULL,
    
    -- PERSONAL STATS (only visible to the user)
    `times_completed` INT NOT NULL DEFAULT 0 COMMENT 'How many times THIS user completed it',
    `last_used` TIMESTAMP NULL COMMENT 'Last time THIS user used it',
    `first_used` TIMESTAMP NULL COMMENT 'First time THIS user used it',
    
    -- Performance metrics
    `total_volume_lifted` FLOAT NOT NULL DEFAULT 0.0 COMMENT 'Total weight lifted by this user',
    `total_exercises_completed` INT NOT NULL DEFAULT 0,
    `average_duration` FLOAT NULL COMMENT 'Average time for this user (minutes)',
    
    -- Completion tracking
    `full_completions` INT NOT NULL DEFAULT 0 COMMENT '100% completed sessions',
    `partial_completions` INT NOT NULL DEFAULT 0 COMMENT 'Partially completed sessions',
    
    -- Best performance
    `best_completion_time` FLOAT NULL COMMENT 'Fastest completion (minutes)',
    `personal_record_volume` FLOAT NULL COMMENT 'Highest volume in single session',
    
    -- Streak tracking
    `current_streak` INT NOT NULL DEFAULT 0 COMMENT 'Current consecutive days/weeks',
    `longest_streak` INT NOT NULL DEFAULT 0 COMMENT 'Best streak ever',
    
    -- Timestamps
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (`user_id`) REFERENCES `Users`(`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`routine_id`) REFERENCES `WorkoutRoutines`(`routine_id`) ON DELETE CASCADE,
    
    -- Unique constraint: one stats record per user per routine
    UNIQUE KEY `unique_user_routine_stats` (`user_id`, `routine_id`),
    
    -- Indexes
    INDEX `idx_user_routine_stats_user_id` (`user_id`),
    INDEX `idx_user_routine_stats_routine_id` (`routine_id`),
    INDEX `idx_user_routine_stats_times_completed` (`times_completed`),
    INDEX `idx_user_routine_stats_last_used` (`last_used`)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Personal statistics for user routine usage';


-- ============================================================================
-- INITIALIZE STATS FOR EXISTING ROUTINES
-- Purpose: Create initial stats records for all existing routines
-- ============================================================================

-- Insert RoutineStats for all existing routines (if they don't have stats yet)
INSERT INTO `RoutineStats` (`routine_id`)
SELECT `routine_id` 
FROM `WorkoutRoutines`
WHERE `is_deleted` = FALSE
  AND `routine_id` NOT IN (SELECT `routine_id` FROM `RoutineStats`)
ON DUPLICATE KEY UPDATE `routine_id` = `routine_id`;

-- Insert UserRoutineStats for all existing user-routine combinations
INSERT INTO `UserRoutineStats` (`user_id`, `routine_id`)
SELECT `user_id`, `routine_id` 
FROM `WorkoutRoutines`
WHERE `is_deleted` = FALSE
ON DUPLICATE KEY UPDATE `user_id` = `user_id`;


-- ============================================================================
-- HELPER FUNCTIONS / STORED PROCEDURES (Optional)
-- Purpose: Update stats automatically
-- ============================================================================

-- Stored Procedure: Update routine popularity score
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS UpdateRoutinePopularity(IN p_routine_id INT)
BEGIN
    UPDATE `RoutineStats`
    SET `popularity_score` = (
        (`times_copied` * 10) +
        (`total_completions_all_users` * 2) +
        (`active_users_count` * 5)
    )
    WHERE `routine_id` = p_routine_id;
END //
DELIMITER ;

-- Stored Procedure: Increment copy count when a routine is copied
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS IncrementRoutineCopyCount(IN p_routine_id INT)
BEGIN
    UPDATE `RoutineStats`
    SET `times_copied` = `times_copied` + 1
    WHERE `routine_id` = p_routine_id;
    
    -- Update popularity score
    CALL UpdateRoutinePopularity(p_routine_id);
END //
DELIMITER ;

-- Stored Procedure: Record routine completion
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS RecordRoutineCompletion(
    IN p_user_id INT,
    IN p_routine_id INT,
    IN p_completion_time FLOAT,
    IN p_volume_lifted FLOAT,
    IN p_is_full_completion BOOLEAN
)
BEGIN
    -- Update user stats
    INSERT INTO `UserRoutineStats` 
        (`user_id`, `routine_id`, `times_completed`, `last_used`, `first_used`, 
         `total_volume_lifted`, `full_completions`, `partial_completions`,
         `best_completion_time`, `personal_record_volume`)
    VALUES 
        (p_user_id, p_routine_id, 1, NOW(), NOW(), 
         p_volume_lifted, IF(p_is_full_completion, 1, 0), IF(p_is_full_completion, 0, 1),
         p_completion_time, p_volume_lifted)
    ON DUPLICATE KEY UPDATE
        `times_completed` = `times_completed` + 1,
        `last_used` = NOW(),
        `total_volume_lifted` = `total_volume_lifted` + p_volume_lifted,
        `full_completions` = `full_completions` + IF(p_is_full_completion, 1, 0),
        `partial_completions` = `partial_completions` + IF(p_is_full_completion, 0, 1),
        `best_completion_time` = LEAST(COALESCE(`best_completion_time`, 999999), p_completion_time),
        `personal_record_volume` = GREATEST(COALESCE(`personal_record_volume`, 0), p_volume_lifted);
    
    -- Update public stats
    UPDATE `RoutineStats`
    SET `total_completions_all_users` = `total_completions_all_users` + 1,
        `total_volume_all_users` = `total_volume_all_users` + p_volume_lifted,
        `last_used_by_anyone` = NOW()
    WHERE `routine_id` = p_routine_id;
    
    -- Update popularity score
    CALL UpdateRoutinePopularity(p_routine_id);
END //
DELIMITER ;


-- ============================================================================
-- VERIFICATION QUERIES
-- Purpose: Verify the migration was successful
-- ============================================================================

-- Check table creation
SELECT 
    'RoutineStats table exists' AS check_name,
    COUNT(*) AS record_count 
FROM `RoutineStats`;

SELECT 
    'UserRoutineStats table exists' AS check_name,
    COUNT(*) AS record_count 
FROM `UserRoutineStats`;

-- Check stored procedures
SHOW PROCEDURE STATUS WHERE Db = DATABASE() AND Name LIKE '%Routine%';


-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- Purpose: Remove the stats tables and stored procedures
-- ============================================================================

-- CAUTION: Uncomment the following lines ONLY if you need to rollback this migration

-- DROP PROCEDURE IF EXISTS RecordRoutineCompletion;
-- DROP PROCEDURE IF EXISTS IncrementRoutineCopyCount;
-- DROP PROCEDURE IF EXISTS UpdateRoutinePopularity;
-- DROP TABLE IF EXISTS UserRoutineStats;
-- DROP TABLE IF EXISTS RoutineStats;


-- ============================================================================
-- NOTES & BEST PRACTICES
-- ============================================================================

-- 1. UPDATING STATS:
--    - Call RecordRoutineCompletion() after each workout session
--    - Call IncrementRoutineCopyCount() when a routine is copied/imported
--    - Popularity score updates automatically via stored procedures

-- 2. PERFORMANCE:
--    - Indexes are optimized for common queries (user_id, routine_id, popularity)
--    - Use EXPLAIN on queries to verify index usage
--    - Consider partitioning UserRoutineStats by user_id for large datasets

-- 3. MAINTENANCE:
--    - Periodically update active_users_count (last 30 days):
--      UPDATE RoutineStats r
--      SET active_users_count = (
--          SELECT COUNT(DISTINCT user_id) 
--          FROM UserRoutineStats 
--          WHERE routine_id = r.routine_id 
--            AND last_used >= DATE_SUB(NOW(), INTERVAL 30 DAY)
--      );

-- 4. DATA INTEGRITY:
--    - ON DELETE CASCADE ensures stats are removed when routines/users are deleted
--    - UNIQUE constraint prevents duplicate user-routine stat records

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================



