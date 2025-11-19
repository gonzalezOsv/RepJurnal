// workout-diary/static/modules/workoutTemplateHelpers.js
// Template helpers for workout logger components

const WorkoutTemplateHelpers = (() => {
    
    /**
     * Show empty state in workout log container
     * @param {jQuery} $container - Container to display empty state in
     */
    function showEmptyState($container) {
        const template = document.getElementById('empty-state-template');
        if (!template) {
            console.error('Empty state template not found');
            return;
        }
        const clone = template.content.cloneNode(true);
        $container.empty().append(clone);
    }
    
    /**
     * Create and show delete exercise confirmation modal
     * @param {string} exerciseName - Name of exercise to delete
     * @param {number} totalSets - Total number of sets to be deleted
     * @returns {jQuery} Modal element
     */
    function showDeleteModal(exerciseName, totalSets) {
        // Remove existing modal if any
        $('#delete-exercise-confirmation-modal').remove();
        
        const template = document.getElementById('delete-exercise-modal-template');
        if (!template) {
            console.error('Delete modal template not found');
            return null;
        }
        
        const clone = template.content.cloneNode(true);
        const $modal = $(clone);
        
        // Populate dynamic content
        $modal.find('.modal-message').html(`
            This will permanently delete <span class="font-bold text-red-600 dark:text-red-400">${RoutineUtils.escapeHtml(exerciseName)}</span> and all its sets.
        `);
        $modal.find('.modal-submessage').text(
            `${totalSets} ${totalSets === 1 ? 'set' : 'sets'} will be removed. This action cannot be undone.`
        );
        
        return $modal;
    }
    
    /**
     * Clone exercise card template
     * @returns {jQuery} Cloned exercise card element
     */
    function cloneExerciseCard() {
        const template = document.getElementById('exercise-card-template');
        if (!template) {
            console.error('Exercise card template not found');
            return null;
        }
        return $(template.content.cloneNode(true)).find('.exercise-card');
    }
    
    /**
     * Populate exercise card with data and variations
     * @param {jQuery} $card - Exercise card element
     * @param {string} exerciseName - Name of the exercise
     * @param {Array} variations - Array of variation objects
     * @param {string} exerciseType - 'cardio' or 'strength'
     */
    function populateExerciseCard($card, exerciseName, variations, exerciseType) {
        // Set exercise name
        $card.find('.exercise-name').text(exerciseName);
        $card.find('[data-exercise]').attr('data-exercise', exerciseName);
        
        // Build and append variations
        const $container = $card.find('.exercise-sets-container');
        $container.empty();
        
        variations.forEach(variation => {
            const $variation = exerciseType === 'cardio' ? 
                buildCardioVariation(variation) : 
                buildStrengthVariation(variation);
            
            if ($variation) {
                $container.append($variation);
            }
        });
    }
    
    /**
     * Build cardio variation row
     * @param {Object} variation - Variation data
     * @returns {jQuery} Variation row element
     */
    function buildCardioVariation(variation) {
        const template = document.getElementById('variation-row-cardio-template');
        if (!template) {
            console.error('Cardio variation template not found');
            return null;
        }
        
        const clone = template.content.cloneNode(true);
        const $row = $(clone).find('.variation-row');
        
        // Set data attribute
        $row.attr('data-variation-data', JSON.stringify({
            ids: variation.ids,
            duration_minutes: variation.duration_minutes,
            distance_miles: variation.distance_miles,
            distance_km: variation.distance_km,
            intensity: variation.intensity,
            calories_burned: variation.calories_burned,
            exercise_type: 'cardio'
        }));
        
        // Populate fields conditionally
        if (variation.duration_minutes) {
            $row.find('.duration-container').removeClass('hidden');
            $row.find('.duration-value').text(`${variation.duration_minutes} min`);
        }
        
        if (variation.distance_miles) {
            $row.find('.distance-container').removeClass('hidden');
            $row.find('.distance-value').text(`${variation.distance_miles} mi`);
        } else if (variation.distance_km) {
            $row.find('.distance-container').removeClass('hidden');
            $row.find('.distance-value').text(`${variation.distance_km} km`);
        }
        
        if (variation.intensity) {
            $row.find('.intensity-value').removeClass('hidden').text(` • ${variation.intensity}`);
        }
        
        if (variation.calories_burned) {
            $row.find('.calories-container').removeClass('hidden');
            $row.find('.calories-value').text(`${variation.calories_burned} cal`);
        }
        
        if (variation.count > 1) {
            $row.find('.count-value').removeClass('hidden').text(`(${variation.count}x)`);
        }
        
        // Set IDs for buttons
        $row.find('[data-ids]').attr('data-ids', JSON.stringify(variation.ids));
        
        return $row;
    }
    
    /**
     * Build strength variation row
     * @param {Object} variation - Variation data
     * @returns {jQuery} Variation row element
     */
    function buildStrengthVariation(variation) {
        const template = document.getElementById('variation-row-strength-template');
        if (!template) {
            console.error('Strength variation template not found');
            return null;
        }
        
        const clone = template.content.cloneNode(true);
        const $row = $(clone).find('.variation-row');
        
        // Set data attribute
        $row.attr('data-variation-data', JSON.stringify({
            ids: variation.ids,
            sets: variation.sets,
            reps: variation.reps,
            weight: variation.weight,
            unit: variation.unit
        }));
        
        // Populate fields
        $row.find('.variation-sets').text(variation.sets);
        $row.find('.variation-reps').text(variation.reps);
        $row.find('.weight-value').text(variation.weight);
        $row.find('.variation-unit').text(variation.unit);
        
        // Set IDs for buttons
        $row.find('[data-ids]').attr('data-ids', JSON.stringify(variation.ids));
        
        return $row;
    }
    
    // Public API
    return {
        showEmptyState,
        showDeleteModal,
        cloneExerciseCard,
        populateExerciseCard,
        buildCardioVariation,
        buildStrengthVariation
    };
})();





