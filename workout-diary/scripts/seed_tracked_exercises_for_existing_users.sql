-- Seed TrackedExercises for Existing Users
-- This script automatically adds the top 6 most-performed exercises to tracking
-- for users who already have workout history

-- For each user, find their top 6 most-performed exercises and add to tracked
INSERT IGNORE INTO TrackedExercises (user_id, exercise_name, display_order)
SELECT 
    user_id,
    exercise_name,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY session_count DESC) as display_order
FROM (
    SELECT 
        e.user_id,
        COALESCE(se.exercise_name, ce.exercise_name) as exercise_name,
        COUNT(DISTINCT e.date) as session_count
    FROM Exercises e
    LEFT JOIN StandardExercises se ON e.standard_exercise_id = se.standard_exercise_id
    LEFT JOIN CustomExercises ce ON e.custom_exercise_id = ce.custom_exercise_id
    WHERE e.exercise_type = 'strength'
      AND e.weight IS NOT NULL
    GROUP BY e.user_id, COALESCE(se.exercise_name, ce.exercise_name)
    HAVING session_count >= 2  -- Only exercises performed at least twice
) as user_exercises
WHERE exercise_name IS NOT NULL
  AND (
    SELECT COUNT(*) 
    FROM (
        SELECT 
            e2.user_id,
            COALESCE(se2.exercise_name, ce2.exercise_name) as ex_name,
            COUNT(DISTINCT e2.date) as cnt
        FROM Exercises e2
        LEFT JOIN StandardExercises se2 ON e2.standard_exercise_id = se2.standard_exercise_id
        LEFT JOIN CustomExercises ce2 ON e2.custom_exercise_id = ce2.custom_exercise_id
        WHERE e2.user_id = user_id
          AND e2.exercise_type = 'strength'
          AND e2.weight IS NOT NULL
        GROUP BY e2.user_id, COALESCE(se2.exercise_name, ce2.exercise_name)
        HAVING cnt >= COUNT(DISTINCT e.date)
    ) as ranked
  ) <= 6;  -- Top 6 exercises

-- Show results
SELECT 
    u.username,
    t.exercise_name,
    t.display_order,
    COUNT(DISTINCT e.date) as sessions
FROM TrackedExercises t
INNER JOIN Users u ON t.user_id = u.user_id
LEFT JOIN Exercises e ON e.user_id = t.user_id
LEFT JOIN StandardExercises se ON e.standard_exercise_id = se.standard_exercise_id
LEFT JOIN CustomExercises ce ON e.custom_exercise_id = ce.custom_exercise_id
WHERE COALESCE(se.exercise_name, ce.exercise_name) = t.exercise_name
GROUP BY u.username, t.exercise_name, t.display_order
ORDER BY u.username, t.display_order;




