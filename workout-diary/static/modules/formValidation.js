/**
 * Form Validation Module
 * Client-side validation to prevent invalid input and provide immediate user feedback
 */

const FormValidation = {
    
    /**
     * Validate exercise name
     * @param {string} name - Exercise name
     * @returns {object} - {isValid: boolean, error: string}
     */
    validateExerciseName(name) {
        if (!name || name.trim().length === 0) {
            return { isValid: false, error: 'Exercise name is required' };
        }
        
        const trimmed = name.trim();
        
        if (trimmed.length < 2) {
            return { isValid: false, error: 'Exercise name must be at least 2 characters' };
        }
        
        if (trimmed.length > 100) {
            return { isValid: false, error: 'Exercise name must not exceed 100 characters' };
        }
        
        // Check for valid characters (letters, numbers, spaces, basic punctuation)
        if (!/^[a-zA-Z0-9\s\-'()/&°]+$/.test(trimmed)) {
            return { isValid: false, error: 'Exercise name contains invalid characters' };
        }
        
        // Check for SQL injection attempts
        const sqlPatterns = [
            /(\bOR\b|\bAND\b).*=/i,
            /(--|#|\/\*|\*\/)/,
            /(\bDROP\b|\bDELETE\b|\bUPDATE\b|\bINSERT\b|\bSELECT\b)/i,
            /(;|\bUNION\b)/i
        ];
        
        for (const pattern of sqlPatterns) {
            if (pattern.test(trimmed)) {
                return { isValid: false, error: 'Exercise name contains invalid content' };
            }
        }
        
        // Check for XSS attempts
        const xssPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe/i,
            /<embed/i,
            /<object/i
        ];
        
        for (const pattern of xssPatterns) {
            if (pattern.test(trimmed)) {
                return { isValid: false, error: 'Exercise name contains invalid content' };
            }
        }
        
        return { isValid: true, error: '' };
    },
    
    /**
     * Validate weight value
     * @param {number} weight - Weight value
     * @param {boolean} allowZero - Allow 0 for bodyweight exercises
     * @returns {object} - {isValid: boolean, error: string}
     */
    validateWeight(weight, allowZero = true) {
        const num = parseFloat(weight);
        
        if (isNaN(num)) {
            return { isValid: false, error: 'Weight must be a valid number' };
        }
        
        if (!allowZero && num <= 0) {
            return { isValid: false, error: 'Weight must be greater than 0' };
        }
        
        if (allowZero && num < 0) {
            return { isValid: false, error: 'Weight cannot be negative' };
        }
        
        if (num > 10000) {
            return { isValid: false, error: 'Weight value is too large (max 10,000 lbs)' };
        }
        
        return { isValid: true, error: '' };
    },
    
    /**
     * Validate reps value
     * @param {number} reps - Number of reps
     * @returns {object} - {isValid: boolean, error: string}
     */
    validateReps(reps) {
        const num = parseInt(reps);
        
        if (isNaN(num) || num !== parseFloat(reps)) {
            return { isValid: false, error: 'Reps must be a whole number' };
        }
        
        if (num < 1) {
            return { isValid: false, error: 'Reps must be at least 1' };
        }
        
        if (num > 1000) {
            return { isValid: false, error: 'Reps value is too large (max 1,000)' };
        }
        
        return { isValid: true, error: '' };
    },
    
    /**
     * Validate sets value
     * @param {number} sets - Number of sets
     * @returns {object} - {isValid: boolean, error: string}
     */
    validateSets(sets) {
        const num = parseInt(sets);
        
        if (isNaN(num) || num !== parseFloat(sets)) {
            return { isValid: false, error: 'Sets must be a whole number' };
        }
        
        if (num < 1) {
            return { isValid: false, error: 'Sets must be at least 1' };
        }
        
        if (num > 100) {
            return { isValid: false, error: 'Sets value is too large (max 100)' };
        }
        
        return { isValid: true, error: '' };
    },
    
    /**
     * Validate duration for cardio
     * @param {number} duration - Duration in minutes
     * @returns {object} - {isValid: boolean, error: string}
     */
    validateDuration(duration) {
        if (duration === null || duration === undefined || duration === '') {
            return { isValid: true, error: '' }; // Optional
        }
        
        const num = parseFloat(duration);
        
        if (isNaN(num)) {
            return { isValid: false, error: 'Duration must be a valid number' };
        }
        
        if (num < 0) {
            return { isValid: false, error: 'Duration cannot be negative' };
        }
        
        if (num > 1440) { // 24 hours
            return { isValid: false, error: 'Duration is too large (max 24 hours)' };
        }
        
        return { isValid: true, error: '' };
    },
    
    /**
     * Validate distance for cardio
     * @param {number} distance - Distance value
     * @param {string} unit - Distance unit (miles or km)
     * @returns {object} - {isValid: boolean, error: string}
     */
    validateDistance(distance, unit = 'miles') {
        if (distance === null || distance === undefined || distance === '') {
            return { isValid: true, error: '' }; // Optional
        }
        
        const num = parseFloat(distance);
        
        if (isNaN(num)) {
            return { isValid: false, error: 'Distance must be a valid number' };
        }
        
        if (num < 0) {
            return { isValid: false, error: 'Distance cannot be negative' };
        }
        
        const maxDistance = unit === 'miles' ? 500 : 1000;
        if (num > maxDistance) {
            return { isValid: false, error: `Distance is too large (max ${maxDistance} ${unit})` };
        }
        
        return { isValid: true, error: '' };
    },
    
    /**
     * Validate calories burned
     * @param {number} calories - Calories value
     * @returns {object} - {isValid: boolean, error: string}
     */
    validateCalories(calories) {
        if (calories === null || calories === undefined || calories === '') {
            return { isValid: true, error: '' }; // Optional
        }
        
        const num = parseInt(calories);
        
        if (isNaN(num) || num !== parseFloat(calories)) {
            return { isValid: false, error: 'Calories must be a whole number' };
        }
        
        if (num < 0) {
            return { isValid: false, error: 'Calories cannot be negative' };
        }
        
        if (num > 10000) {
            return { isValid: false, error: 'Calories value is too large (max 10,000)' };
        }
        
        return { isValid: true, error: '' };
    },
    
    /**
     * Validate date string (YYYY-MM-DD)
     * @param {string} dateStr - Date string
     * @returns {object} - {isValid: boolean, error: string}
     */
    validateDate(dateStr) {
        if (!dateStr) {
            return { isValid: false, error: 'Date is required' };
        }
        
        // Check format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return { isValid: false, error: 'Date must be in YYYY-MM-DD format' };
        }
        
        // Validate actual date
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return { isValid: false, error: 'Invalid date' };
        }
        
        // Check if date is not too far in the future
        const today = new Date();
        const maxFutureDate = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days in future
        if (date > maxFutureDate) {
            return { isValid: false, error: 'Date cannot be more than 30 days in the future' };
        }
        
        // Check if date is not too far in the past
        const minDate = new Date('2000-01-01');
        if (date < minDate) {
            return { isValid: false, error: 'Date cannot be before year 2000' };
        }
        
        return { isValid: true, error: '' };
    },
    
    /**
     * Validate complete strength exercise log
     * @param {object} data - Exercise data
     * @returns {object} - {isValid: boolean, errors: object}
     */
    validateStrengthLog(data) {
        const errors = {};
        
        // Validate required fields
        if (!data.bodyPart) {
            errors.bodyPart = 'Body part is required';
        }
        
        if (!data.exercise) {
            errors.exercise = 'Exercise is required';
        }
        
        // Validate weight
        const weightValidation = this.validateWeight(data.weight, true);
        if (!weightValidation.isValid) {
            errors.weight = weightValidation.error;
        }
        
        // Validate reps
        const repsValidation = this.validateReps(data.reps);
        if (!repsValidation.isValid) {
            errors.reps = repsValidation.error;
        }
        
        // Validate sets
        const setsValidation = this.validateSets(data.sets);
        if (!setsValidation.isValid) {
            errors.sets = setsValidation.error;
        }
        
        // Validate date
        if (data.date) {
            const dateValidation = this.validateDate(data.date);
            if (!dateValidation.isValid) {
                errors.date = dateValidation.error;
            }
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors: errors
        };
    },
    
    /**
     * Validate complete cardio exercise log
     * @param {object} data - Exercise data
     * @returns {object} - {isValid: boolean, errors: object}
     */
    validateCardioLog(data) {
        const errors = {};
        
        // Validate required fields
        if (!data.bodyPart) {
            errors.bodyPart = 'Body part is required';
        }
        
        if (!data.exercise) {
            errors.exercise = 'Exercise is required';
        }
        
        // Validate duration
        if (data.duration) {
            const durationValidation = this.validateDuration(data.duration);
            if (!durationValidation.isValid) {
                errors.duration = durationValidation.error;
            }
        }
        
        // Validate distance
        if (data.distance) {
            const distanceValidation = this.validateDistance(data.distance, data.distanceUnit);
            if (!distanceValidation.isValid) {
                errors.distance = distanceValidation.error;
            }
        }
        
        // At least duration or distance required
        if (!data.duration && !data.distance) {
            errors.general = 'Please provide at least duration or distance';
        }
        
        // Validate calories
        if (data.calories) {
            const caloriesValidation = this.validateCalories(data.calories);
            if (!caloriesValidation.isValid) {
                errors.calories = caloriesValidation.error;
            }
        }
        
        // Validate date
        if (data.date) {
            const dateValidation = this.validateDate(data.date);
            if (!dateValidation.isValid) {
                errors.date = dateValidation.error;
            }
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors: errors
        };
    },
    
    /**
     * Sanitize text input
     * @param {string} text - Input text
     * @param {number} maxLength - Maximum length
     * @returns {string} - Sanitized text
     */
    sanitizeText(text, maxLength = 255) {
        if (!text) return '';
        
        // Trim whitespace
        let sanitized = text.trim();
        
        // Limit length
        if (sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }
        
        // Remove potential XSS characters
        sanitized = sanitized.replace(/[<>]/g, '');
        
        return sanitized;
    },
    
    /**
     * Show validation error on form field
     * @param {string} fieldId - Field ID
     * @param {string} errorMessage - Error message
     */
    showFieldError(fieldId, errorMessage) {
        const $field = $(`#${fieldId}`);
        
        // Remove existing error
        $field.removeClass('border-red-500 dark:border-red-400');
        $field.next('.validation-error').remove();
        
        if (errorMessage) {
            // Add error styling
            $field.addClass('border-red-500 dark:border-red-400');
            
            // Add error message
            $field.after(`
                <p class="validation-error text-red-600 dark:text-red-400 text-xs mt-1 font-semibold">
                    ⚠️ ${errorMessage}
                </p>
            `);
            
            // Shake animation
            $field.addClass('animate__animated animate__headShake');
            setTimeout(() => {
                $field.removeClass('animate__animated animate__headShake');
            }, 500);
        }
    },
    
    /**
     * Clear all validation errors
     */
    clearAllErrors() {
        $('.validation-error').remove();
        $('input, select, textarea').removeClass('border-red-500 dark:border-red-400');
    },
    
    /**
     * Add real-time validation to a field
     * @param {string} fieldId - Field ID
     * @param {function} validationFn - Validation function
     */
    addRealTimeValidation(fieldId, validationFn) {
        $(`#${fieldId}`).on('blur', function() {
            const value = $(this).val();
            const result = validationFn(value);
            
            if (!result.isValid) {
                FormValidation.showFieldError(fieldId, result.error);
            } else {
                FormValidation.showFieldError(fieldId, ''); // Clear error
            }
        });
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormValidation;
}




