/**
 * Module: API Client
 * Purpose: Handle all API communication for workout routines
 * Dependencies: uiHelpers.js (for error handling)
 */
const RoutineAPI = (function() {
    'use strict';
    
    // Private variables
    const BASE_URL = '/api/routines';
    const WORKOUT_BASE_URL = '/workout/api';
    
    /**
     * Handle API errors consistently
     * @param {Object} error - jQuery AJAX error object
     * @param {string} defaultMessage - Default error message
     */
    function handleApiError(error, defaultMessage = 'An error occurred') {
        console.error('API Error:', error);
        const message = error.responseJSON?.error || defaultMessage;
        return message;
    }
    
    /**
     * Load all routines for the current user
     * @returns {Promise<Array>} Array of routine objects
     */
    async function loadRoutines() {
        try {
            const response = await $.ajax({
                url: BASE_URL,
                method: 'GET'
            });
            return response.routines || [];
        } catch (error) {
            const message = handleApiError(error, 'Failed to load routines');
            UIHelpers.showError(message);
            return [];
        }
    }
    
    /**
     * Create a new routine
     * @param {Object} routineData - Routine data object
     * @returns {Promise<Object>} Created routine response
     */
    async function createRoutine(routineData) {
        try {
            const response = await $.ajax({
                url: BASE_URL,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(routineData)
            });
            return { success: true, data: response };
        } catch (error) {
            const message = handleApiError(error, 'Failed to create routine');
            return { success: false, error: message };
        }
    }
    
    /**
     * Update an existing routine
     * @param {number} routineId - Routine ID
     * @param {Object} routineData - Updated routine data
     * @returns {Promise<Object>} Update response
     */
    async function updateRoutine(routineId, routineData) {
        try {
            const response = await $.ajax({
                url: `${BASE_URL}/${routineId}`,
                method: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify(routineData)
            });
            return { success: true, data: response };
        } catch (error) {
            const message = handleApiError(error, 'Failed to update routine');
            return { success: false, error: message };
        }
    }
    
    /**
     * Delete a routine
     * @param {number} routineId - Routine ID
     * @returns {Promise<Object>} Delete response
     */
    async function deleteRoutine(routineId) {
        try {
            await $.ajax({
                url: `${BASE_URL}/${routineId}`,
                method: 'DELETE'
            });
            return { success: true };
        } catch (error) {
            const message = handleApiError(error, 'Failed to delete routine');
            return { success: false, error: message };
        }
    }
    
    /**
     * Load all body parts
     * @returns {Promise<Array>} Array of body part objects
     */
    async function loadBodyParts() {
        try {
            const response = await $.ajax({
                url: `${WORKOUT_BASE_URL}/bodyparts`,
                method: 'GET'
            });
            return response.body_parts || [];
        } catch (error) {
            console.error('Error loading body parts:', error);
            return [];
        }
    }
    
    /**
     * Load exercises for a specific body part
     * @param {number} bodyPartId - Body part ID
     * @returns {Promise<Object>} Exercises response
     */
    async function loadExercisesForBodyPart(bodyPartId) {
        try {
            const response = await $.ajax({
                url: `${WORKOUT_BASE_URL}/exercises/${bodyPartId}`,
                method: 'GET'
            });
            return response.exercises || [];
        } catch (error) {
            const message = handleApiError(error, 'Failed to load exercises');
            UIHelpers.showError(message);
            return [];
        }
    }
    
    /**
     * Generate share token for a routine
     * @param {number} routineId - Routine ID
     * @returns {Promise<Object>} Share token response
     */
    async function generateShareToken(routineId) {
        try {
            const response = await $.ajax({
                url: `${BASE_URL}/${routineId}/share`,
                method: 'POST'
            });
            return { success: true, data: response };
        } catch (error) {
            const message = handleApiError(error, 'Failed to generate share link');
            return { success: false, error: message };
        }
    }
    
    /**
     * Revoke share token for a routine
     * @param {number} routineId - Routine ID
     * @returns {Promise<Object>} Revoke response
     */
    async function revokeShareToken(routineId) {
        try {
            const response = await $.ajax({
                url: `${BASE_URL}/${routineId}/share`,
                method: 'DELETE'
            });
            return { success: true, data: response };
        } catch (error) {
            const message = handleApiError(error, 'Failed to revoke share link');
            return { success: false, error: message };
        }
    }
    
    /**
     * Fetch routine by share token (for import preview)
     * @param {string} shareToken - Share token
     * @returns {Promise<Object>} Routine data response
     */
    async function fetchRoutineByToken(shareToken) {
        try {
            const response = await $.ajax({
                url: `${BASE_URL}/import/${shareToken}`,
                method: 'GET'
            });
            return { success: true, data: response.routine };
        } catch (error) {
            const message = handleApiError(error, 'Invalid share URL or routine not found');
            return { success: false, error: message };
        }
    }
    
    /**
     * Import a routine using share token
     * @param {string} shareToken - Share token
     * @returns {Promise<Object>} Import response
     */
    async function importRoutine(shareToken) {
        try {
            await $.ajax({
                url: `${BASE_URL}/import/${shareToken}`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({})
            });
            return { success: true };
        } catch (error) {
            const message = handleApiError(error, 'Failed to import routine');
            return { success: false, error: message };
        }
    }
    
    // Public API
    return {
        loadRoutines,
        createRoutine,
        updateRoutine,
        deleteRoutine,
        loadBodyParts,
        loadExercisesForBodyPart,
        generateShareToken,
        revokeShareToken,
        fetchRoutineByToken,
        importRoutine
    };
})();

// Make available globally
window.RoutineAPI = RoutineAPI;





