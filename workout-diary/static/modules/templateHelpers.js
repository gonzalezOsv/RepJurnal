/**
 * Module: Template Helpers
 * Purpose: Template cloning and population for routine cards
 * Dependencies: utils.js (for escapeHtml)
 */
const TemplateHelpers = (function() {
    'use strict';
    
    /**
     * Clone the routine card template and return a jQuery object
     * @returns {jQuery} Cloned template as jQuery object
     */
    function cloneRoutineCardTemplate() {
        const template = document.getElementById('routine-card-template');
        if (!template) {
            console.error('Routine card template not found!');
            return $('<div>');
        }
        const clone = template.content.cloneNode(true);
        return $(clone);
    }
    
    /**
     * Create a badge element
     * @param {string} text - Badge text
     * @param {string} type - Badge type ('imported', 'public', 'private')
     * @returns {jQuery} Badge element
     */
    function createBadge(text, type) {
        const badges = {
            'imported': 'px-2.5 py-1 text-xs font-bold bg-blue-500 dark:bg-blue-600 text-white rounded-full shadow-sm',
            'public': 'px-2.5 py-1 text-xs font-bold bg-purple-500 dark:bg-purple-600 text-white rounded-full shadow-sm flex items-center gap-1',
            'private': 'px-2.5 py-1 text-xs font-bold bg-gray-500 dark:bg-gray-600 text-white rounded-full shadow-sm flex items-center gap-1'
        };
        
        const icons = {
            'public': '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>',
            'private': '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>'
        };
        
        const badge = $('<span>').addClass(badges[type] || badges.public).text(text);
        
        if (icons[type]) {
            badge.prepend(icons[type]);
        }
        
        return badge;
    }
    
    /**
     * Populate routine card template with data
     * @param {jQuery} $card - Cloned template card
     * @param {Object} routine - Routine data object
     * @returns {jQuery} Populated card
     */
    function populateRoutineCard($card, routine) {
        const isImported = routine.is_imported || false;
        const exerciseCount = routine.exercises ? routine.exercises.length : 0;
        const createdDate = routine.created_at ? new Date(routine.created_at).toLocaleDateString() : 'Unknown';
        
        // Set routine IDs on all actionable elements
        setRoutineIds($card, routine.routine_id);
        
        // Apply card styling based on import status
        applyCardStyling($card, isImported);
        
        // Populate text content
        populateCardContent($card, routine, isImported, exerciseCount, createdDate);
        
        // Add badges
        addCardBadges($card, routine, isImported);
        
        // Set visibility indicators
        setVisibilityIndicators($card, routine, isImported);
        
        // Populate stats
        populateRoutineStats($card, routine, isImported);
        
        // Populate exercises
        populateExercisesList($card, routine);
        
        return $card;
    }
    
    /**
     * Set routine ID on all elements that need it
     * @private
     */
    function setRoutineIds($card, routineId) {
        $card.find('.routine-card').attr('data-routine-id', routineId);
        $card.find('.routine-header').attr('data-routine-id', routineId);
        $card.find('.edit-routine-btn').attr('data-routine-id', routineId);
        $card.find('.delete-routine-btn').attr('data-routine-id', routineId);
        $card.find('.share-routine-btn').attr('data-routine-id', routineId);
        $card.find('.start-routine-btn').attr('data-routine-id', routineId);
    }
    
    /**
     * Apply styling based on import status
     * @private
     */
    function applyCardStyling($card, isImported) {
        const $routineCard = $card.find('.routine-card');
        
        if (isImported) {
            $routineCard.addClass('bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30');
            $routineCard.addClass('border-2 border-blue-300 dark:border-blue-600 hover:border-blue-400 dark:hover:border-blue-500');
            $card.find('.routine-arrow').addClass('text-blue-500 dark:text-blue-400');
            $card.find('.routine-header').addClass('border-blue-200 dark:border-blue-700');
        } else {
            $routineCard.addClass('bg-white dark:bg-gray-800');
            $routineCard.addClass('border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600');
            $card.find('.routine-arrow').addClass('text-gray-400 dark:text-gray-500');
            $card.find('.routine-header').addClass('border-gray-200 dark:border-gray-700');
        }
    }
    
    /**
     * Populate card text content
     * @private
     */
    function populateCardContent($card, routine, isImported, exerciseCount, createdDate) {
        // Set routine name
        $card.find('.routine-name')
            .text(routine.routine_name)
            .addClass(isImported ? 'text-blue-900 dark:text-blue-100' : 'text-gray-800 dark:text-gray-100');
        
        // Set description
        if (routine.description) {
            $card.find('.routine-description')
                .text(routine.description)
                .removeClass('hidden')
                .addClass(isImported ? 'text-blue-800 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400');
        }
        
        // Show imported from username
        if (isImported && routine.imported_from_username) {
            $card.find('.routine-imported-from')
                .removeClass('hidden')
                .find('.routine-creator')
                .text(routine.imported_from_username);
        }
        
        // Set meta info
        $card.find('.routine-meta')
            .text(`${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''} • Created ${createdDate}`)
            .addClass(isImported ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400');
    }
    
    /**
     * Add badges to card
     * @private
     */
    function addCardBadges($card, routine, isImported) {
        const $badgesContainer = $card.find('.routine-badges');
        
        if (isImported) {
            $badgesContainer.append(createBadge('Imported', 'imported'));
        } else {
            if (routine.visibility === 'public') {
                $badgesContainer.append(createBadge('Public', 'public'));
            } else if (routine.visibility === 'private') {
                $badgesContainer.append(createBadge('Private', 'private'));
            }
        }
    }
    
    /**
     * Set visibility indicators (badge and status card)
     * @private
     */
    function setVisibilityIndicators($card, routine, isImported) {
        // Skip for imported routines
        if (isImported) return;
        
        // Default to 'private' if no visibility is set
        const visibility = routine.visibility || 'private';
        const isPublic = visibility === 'public';
        
        // Compact badge in header (visible when collapsed)
        const $compactBadge = $card.find('.routine-visibility-badge-compact');
        $compactBadge.removeClass('hidden');
        
        if (isPublic) {
            // Public styling - Purple theme
            $compactBadge.addClass('bg-purple-100 dark:bg-purple-900/50 border border-purple-300 dark:border-purple-600');
            $compactBadge.find('.visibility-icon-compact').html(`
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            `).addClass('text-purple-600 dark:text-purple-400');
            $compactBadge.find('.visibility-text-compact').text('Public')
                .addClass('text-purple-700 dark:text-purple-300');
        } else {
            // Private styling - Gray theme
            $compactBadge.addClass('bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600');
            $compactBadge.find('.visibility-icon-compact').html(`
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            `).addClass('text-gray-600 dark:text-gray-400');
            $compactBadge.find('.visibility-text-compact').text('Private')
                .addClass('text-gray-700 dark:text-gray-300');
        }
        
        // Compact status card in expanded view
        const $statusCard = $card.find('.routine-visibility-status');
        $statusCard.removeClass('hidden');
        
        if (isPublic) {
            // Public styling - Purple theme (compact)
            $statusCard.addClass('bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-600');
            $statusCard.find('.visibility-status-icon-compact')
                .addClass('text-purple-600 dark:text-purple-400')
                .html(`
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                `);
            $statusCard.find('.visibility-status-text-compact')
                .addClass('text-purple-800 dark:text-purple-200')
                .text('🌐 Public - Friends can view and copy');
        } else {
            // Private styling - Gray theme (compact)
            $statusCard.addClass('bg-gray-100 dark:bg-gray-700/30 border-gray-300 dark:border-gray-600');
            $statusCard.find('.visibility-status-icon-compact')
                .addClass('text-gray-600 dark:text-gray-400')
                .html(`
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                `);
            $statusCard.find('.visibility-status-text-compact')
                .addClass('text-gray-700 dark:text-gray-300')
                .text('🔒 Private - Only visible to you');
        }
    }
    
    /**
     * Populate exercises list in the card
     * @private
     */
    function populateExercisesList($card, routine) {
        const $exercisesList = $card.find('.routine-exercises-list');
        const exerciseCount = routine.exercises ? routine.exercises.length : 0;
        
        $card.find('.routine-exercises-header').text(`Exercises (${exerciseCount})`);
        
        if (routine.exercises && routine.exercises.length > 0) {
            routine.exercises.forEach(ex => {
                const $exerciseItem = createExerciseItem(ex);
                $exercisesList.append($exerciseItem);
            });
        } else {
            $exercisesList.append(
                $('<p>').addClass('text-sm text-gray-500 dark:text-gray-400').text('No exercises')
            );
        }
    }
    
    /**
     * Create an exercise item element
     * @private
     */
    function createExerciseItem(exercise) {
        const $item = $('<div>')
            .addClass('flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2');
        
        // Exercise number
        $item.append(
            $('<span>')
                .addClass('text-blue-600 dark:text-blue-400 font-bold')
                .text(`${exercise.exercise_order + 1}.`)
        );
        
        // Exercise name
        $item.append(
            $('<span>')
                .addClass('text-gray-700 dark:text-gray-300')
                .text(exercise.exercise_name)
        );
        
        // Exercise details (sets/reps or duration)
        if (exercise.exercise_type === 'strength' && exercise.sets && exercise.reps) {
            const details = `${exercise.sets}×${exercise.reps}${exercise.weight ? ` @ ${exercise.weight}${exercise.unit || 'lbs'}` : ''}`;
            $item.append(
                $('<span>')
                    .addClass('text-gray-500 dark:text-gray-400 ml-auto')
                    .text(details)
            );
        } else if (exercise.exercise_type === 'cardio' && exercise.duration_minutes) {
            $item.append(
                $('<span>')
                    .addClass('text-gray-500 dark:text-gray-400 ml-auto')
                    .text(`${exercise.duration_minutes} min`)
            );
        }
        
        return $item;
    }
    
    /**
     * Populate routine stats (personal and public)
     * @private
     */
    function populateRoutineStats($card, routine, isImported) {
        const personalStats = routine.personal_stats || {};
        const publicStats = routine.public_stats || {};
        
        // Helper function to format relative time
        function formatRelativeTime(dateStr) {
            if (!dateStr) return 'Never used';
            const date = new Date(dateStr);
            const now = new Date();
            const diffTime = now - date;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
            return date.toLocaleDateString();
        }
        
        // Personal Stats (only for own non-imported routines with some activity)
        const hasPersonalActivity = personalStats.times_completed > 0 || personalStats.current_streak > 0;
        if (!isImported && hasPersonalActivity) {
            const $personalStats = $card.find('.routine-personal-stats');
            $personalStats.removeClass('hidden');
            
            // Times completed
            $personalStats.find('.stat-times-completed').text(personalStats.times_completed || 0);
            $personalStats.find('.stat-last-used').text(formatRelativeTime(personalStats.last_used));
            
            // Current streak
            const streak = personalStats.current_streak || 0;
            $personalStats.find('.stat-current-streak').text(streak);
            $personalStats.find('.stat-streak-label').text(streak === 1 ? 'day streak' : 'days streak');
        }
        
        // Public Stats (show if any public activity OR if it's a public routine)
        const hasPublicActivity = publicStats.times_copied > 0 || 
                                   publicStats.total_completions > 0 || 
                                   publicStats.active_users > 0 ||
                                   routine.visibility === 'public';
        
        if (hasPublicActivity) {
            const $publicStats = $card.find('.routine-public-stats');
            $publicStats.removeClass('hidden');
            
            // Times copied
            const copiedCount = publicStats.times_copied || 0;
            $publicStats.find('.stat-times-copied').text(
                copiedCount >= 1000 ? `${(copiedCount / 1000).toFixed(1)}k` : copiedCount
            );
            
            // Active users
            const activeUsers = publicStats.active_users || 0;
            $publicStats.find('.stat-active-users').text(
                activeUsers >= 1000 ? `${(activeUsers / 1000).toFixed(1)}k` : activeUsers
            );
            
            // Popularity score
            const popularity = publicStats.popularity_score || 0;
            $publicStats.find('.stat-popularity-score').text(
                popularity >= 1000 ? `${(popularity / 1000).toFixed(1)}k` : Math.round(popularity)
            );
        }
    }
    
    // Public API
    return {
        cloneRoutineCardTemplate,
        createBadge,
        populateRoutineCard
    };
})();

// Make available globally
window.TemplateHelpers = TemplateHelpers;

