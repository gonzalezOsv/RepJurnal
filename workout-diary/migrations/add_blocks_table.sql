-- Migration: Add Blocks table if it doesn't exist
-- This migration adds the Blocks table for user blocking functionality
-- Run this on production databases that don't have the Blocks table yet

CREATE TABLE IF NOT EXISTS Blocks (
    block_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    blocked_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    
    -- Prevent duplicate blocks
    UNIQUE KEY unique_user_block (user_id, blocked_user_id),
    
    INDEX idx_user (user_id),
    INDEX idx_blocked_user (blocked_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

