-- Initialize Motivational Quotes Table and Data

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS motivational_quotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_text TEXT NOT NULL,
    author VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert motivational quotes
INSERT INTO motivational_quotes (quote_text, author, category, active) VALUES
('The only bad workout is the one that didn''t happen.', 'Unknown', 'motivation', TRUE),
('Success isn''t always about greatness. It''s about consistency. Consistent hard work leads to success.', 'Dwayne Johnson', 'consistency', TRUE),
('The body achieves what the mind believes.', 'Napoleon Hill', 'mindset', TRUE),
('The pain you feel today will be the strength you feel tomorrow.', 'Unknown', 'strength', TRUE),
('Don''t count the days, make the days count.', 'Muhammad Ali', 'motivation', TRUE),
('The only way to define your limits is by going beyond them.', 'Arthur C. Clarke', 'perseverance', TRUE),
('Strength does not come from the body. It comes from the will.', 'Arnold Schwarzenegger', 'strength', TRUE),
('You don''t have to be great to start, but you have to start to be great.', 'Zig Ziglar', 'motivation', TRUE),
('The difference between the impossible and the possible lies in a person''s determination.', 'Tommy Lasorda', 'determination', TRUE),
('Your body can stand almost anything. It''s your mind that you have to convince.', 'Unknown', 'mindset', TRUE),
('Take care of your body. It''s the only place you have to live.', 'Jim Rohn', 'health', TRUE),
('The clock is ticking. Are you becoming the person you want to be?', 'Greg Plitt', 'motivation', TRUE),
('Whether you think you can or you think you can''t, you''re right.', 'Henry Ford', 'mindset', TRUE),
('The hard days are what make you stronger.', 'Aly Raisman', 'strength', TRUE),
('Push yourself because no one else is going to do it for you.', 'Unknown', 'motivation', TRUE),
('Great things never come from comfort zones.', 'Unknown', 'growth', TRUE),
('The only person you should try to be better than is the person you were yesterday.', 'Unknown', 'growth', TRUE),
('Sweat is fat crying.', 'Unknown', 'motivation', TRUE),
('If it doesn''t challenge you, it doesn''t change you.', 'Fred DeVito', 'growth', TRUE),
('The last three or four reps is what makes the muscle grow. This area of pain divides the champion from someone else who is not a champion.', 'Arnold Schwarzenegger', 'strength', TRUE)
ON DUPLICATE KEY UPDATE active = active; -- Prevents duplicates if run multiple times


