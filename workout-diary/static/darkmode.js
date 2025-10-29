/**
 * Dark Mode Utility
 * Handles dark mode toggle, persistence, and system preference detection
 */

(function() {
    'use strict';

    const DARK_MODE_STORAGE_KEY = 'darkMode';
    const DARK_MODE_CLASS = 'dark';
    
    /**
     * Initialize dark mode on page load
     * Note: The dark class is already applied by the blocking script in <head>
     * This function just ensures icons are in sync and sets up listeners
     */
    function initDarkMode() {
        // Check current state (already applied by blocking script in head)
        const isDarkMode = document.documentElement.classList.contains(DARK_MODE_CLASS);
        
        // Update toggle icons to match current state
        updateToggleIcon(isDarkMode);
        
        // Ensure localStorage is in sync (in case user hasn't set a preference yet)
        const storedPreference = localStorage.getItem(DARK_MODE_STORAGE_KEY);
        if (storedPreference === null) {
            // Save system preference if no stored preference exists
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                localStorage.setItem(DARK_MODE_STORAGE_KEY, 'true');
            } else {
                localStorage.setItem(DARK_MODE_STORAGE_KEY, 'false');
            }
        }
        
        // Listen for system theme changes (if no manual preference set)
        if (storedPreference === null && window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
                if (localStorage.getItem(DARK_MODE_STORAGE_KEY) === null) {
                    applyDarkMode(e.matches);
                    updateToggleIcon(e.matches);
                    localStorage.setItem(DARK_MODE_STORAGE_KEY, e.matches.toString());
                }
            });
        }
    }

    /**
     * Apply dark mode to the document
     */
    function applyDarkMode(isDark) {
        if (isDark) {
            document.documentElement.classList.add(DARK_MODE_CLASS);
            document.body.classList.add(DARK_MODE_CLASS);
        } else {
            document.documentElement.classList.remove(DARK_MODE_CLASS);
            document.body.classList.remove(DARK_MODE_CLASS);
        }
        
        // Save preference
        localStorage.setItem(DARK_MODE_STORAGE_KEY, isDark.toString());
    }

    /**
     * Toggle dark mode
     */
    function toggleDarkMode() {
        const isCurrentlyDark = document.documentElement.classList.contains(DARK_MODE_CLASS);
        const newMode = !isCurrentlyDark;
        
        applyDarkMode(newMode);
        updateToggleIcon(newMode);
        
        // Dispatch custom event for other scripts
        const event = new CustomEvent('darkModeChanged', { detail: { isDark: newMode } });
        document.dispatchEvent(event);
    }

    /**
     * Update the toggle button icon
     */
    function updateToggleIcon(isDark) {
        const toggleButtons = document.querySelectorAll('.dark-mode-toggle');
        
        toggleButtons.forEach(button => {
            const sunIcon = button.querySelector('.sun-icon');
            const moonIcon = button.querySelector('.moon-icon');
            const sunText = button.querySelector('.sun-icon-text');
            const moonText = button.querySelector('.moon-icon-text');
            
            if (sunIcon && moonIcon) {
                if (isDark) {
                    // Show sun icon (to switch to light mode)
                    sunIcon.classList.remove('hidden');
                    moonIcon.classList.add('hidden');
                    button.setAttribute('aria-label', 'Switch to light mode');
                    if (sunText && moonText) {
                        sunText.classList.remove('hidden');
                        moonText.classList.add('hidden');
                    }
                } else {
                    // Show moon icon (to switch to dark mode)
                    sunIcon.classList.add('hidden');
                    moonIcon.classList.remove('hidden');
                    button.setAttribute('aria-label', 'Switch to dark mode');
                    if (sunText && moonText) {
                        sunText.classList.add('hidden');
                        moonText.classList.remove('hidden');
                    }
                }
            }
        });
    }

    /**
     * Get current dark mode state
     */
    function getDarkModeState() {
        return document.documentElement.classList.contains(DARK_MODE_CLASS);
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDarkMode);
    } else {
        initDarkMode();
    }

    // Attach click handlers to all dark mode toggle buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.dark-mode-toggle')) {
            e.preventDefault();
            toggleDarkMode();
        }
    });

    // Export API for programmatic access
    window.DarkMode = {
        toggle: toggleDarkMode,
        set: applyDarkMode,
        get: getDarkModeState
    };
})();

