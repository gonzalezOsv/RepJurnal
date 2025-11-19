/**
 * Module: Utility Functions
 * Purpose: General-purpose helper functions used across the application
 * Dependencies: None
 */
const RoutineUtils = (function() {
    'use strict';
    
    /**
     * Format a Date object for HTML date input (YYYY-MM-DD)
     * @param {Date} date - The date to format
     * @returns {string} Formatted date string
     */
    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    /**
     * Escape HTML to prevent XSS attacks
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML-safe string
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Debounce function calls (prevent rapid firing)
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Get URL query parameter value
     * @param {string} param - Parameter name
     * @returns {string|null} Parameter value or null
     */
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }
    
    /**
     * Check if user is on mobile device
     * @returns {boolean} True if mobile
     */
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    /**
     * Check if element is in viewport
     * @param {HTMLElement} el - Element to check
     * @returns {boolean} True if in viewport
     */
    function isInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    
    /**
     * Smooth scroll to element
     * @param {string} selector - CSS selector for target element
     * @param {number} offset - Offset from top in pixels
     */
    function scrollToElement(selector, offset = 0) {
        const element = document.querySelector(selector);
        if (element) {
            const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    }
    
    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    
    /**
     * Capitalize first letter of string
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    /**
     * Truncate string to maximum length
     * @param {string} str - String to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated string
     */
    function truncate(str, maxLength = 50) {
        if (!str || str.length <= maxLength) return str;
        return str.substring(0, maxLength) + '...';
    }
    
    /**
     * Check if in development/debug mode
     * @returns {boolean} True if in development mode
     */
    function isDevelopment() {
        // Check for development mode via hostname or environment
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname.includes('localhost');
    }
    
    /**
     * Production-safe console wrapper
     * Only logs in development mode
     */
    const logger = {
        log: function(...args) {
            if (isDevelopment()) {
                console.log(...args);
            }
        },
        debug: function(...args) {
            if (isDevelopment()) {
                console.debug(...args);
            }
        },
        info: function(...args) {
            if (isDevelopment()) {
                console.info(...args);
            }
        },
        warn: function(...args) {
            // Warnings are logged in production too
            console.warn(...args);
        },
        error: function(...args) {
            // Errors are always logged
            console.error(...args);
        }
    };
    
    // Public API
    return {
        formatDateForInput,
        escapeHtml,
        debounce,
        getQueryParam,
        isMobileDevice,
        isInViewport,
        scrollToElement,
        deepClone,
        capitalize,
        truncate,
        isDevelopment,
        logger
    };
})();

// Make available globally
window.RoutineUtils = RoutineUtils;






