/**
 * Main Lifts Tab - Tracked exercises management
 */

const MainLiftsTab = {
    getCsrfToken() {
        if (window.CSRF && typeof window.CSRF.getToken === 'function') {
            const token = window.CSRF.getToken();
            if (token) {
                window.__CSRF_TOKEN_CACHE = token;
                return token;
            }
        }

        if (window.__CSRF_TOKEN_CACHE) {
            return window.__CSRF_TOKEN_CACHE;
        }

        try {
            $.ajax({
                url: '/api/csrf-token',
                method: 'GET',
                async: false,
                success: function(response) {
                    if (response && response.csrfToken) {
                        window.__CSRF_TOKEN_CACHE = response.csrfToken;
                    }
                },
                error: function() {
                    console.warn('[MainLiftsTab] Unable to fetch CSRF token via fallback request');
                }
            });
        } catch (error) {
            console.warn('[MainLiftsTab] CSRF fallback error:', error);
        }

        return window.__CSRF_TOKEN_CACHE || null;
    },
    pendingDelete: null, // Store pending delete info {trackedId, exerciseName}
    
    init() {
        this.loadTrackedExercises();
        this.setupEventHandlers();
    },

    loadTrackedExercises() {
        $.ajax({
            url: '/metrics/api/tracked-exercises',
            method: 'GET',
            success: (data) => {
                const $grid = $('#trackedExercisesGrid');
                const $emptyState = $('#noTrackedExercises');
                
                if (!data || !data.tracked_exercises || data.tracked_exercises.length === 0) {
                    $grid.addClass('hidden');
                    $emptyState.removeClass('hidden');
                    return;
                }
                
                // Hide empty state
                $emptyState.addClass('hidden');
                $grid.removeClass('hidden').empty();
                
                // Create a card for each tracked exercise
                data.tracked_exercises.forEach((ex, index) => {
                    const color = ProgressUtils.cardColors[index % ProgressUtils.cardColors.length];
                    const canvasId = `trackedChart${index}`;
                    const prValueId = `trackedPrValue${index}`;
                    const prDateId = `trackedPrDate${index}`;
                    
                    const card = this.createExerciseCard(ex, index, color, canvasId, prValueId, prDateId);
                    $grid.append(card);
                    
                    // Load progression data for this exercise
                    setTimeout(() => {
                        ProgressUtils.loadExerciseProgression(ex.exercise_name, canvasId, prValueId, prDateId);
                    }, 150 + (index * 50));
                });
                
            },
            error: (xhr, status, error) => {
                console.error('Error loading tracked exercises:', error);
                
                $('#trackedExercisesGrid').html(`
                    <div class="col-span-full text-center py-12">
                        <div class="text-6xl mb-4">⚠️</div>
                        <p class="text-red-600 text-lg font-semibold">Error loading tracked lifts</p>
                        <p class="text-gray-500 text-sm mt-2">Status: ${xhr.status} - ${xhr.statusText}</p>
                        <p class="text-gray-500 text-sm">Please check console for details</p>
                    </div>
                `);
            }
        });
    },

    createExerciseCard(exercise, index, color, canvasId, prValueId, prDateId) {
        const iconPath = 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6';
        
        return `
            <div class="group bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-${color}-300 dark:hover:border-${color}-600" data-tracked-id="${exercise.tracked_exercise_id}">
                <div class="bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                    <div class="flex items-center justify-between mb-3 sm:mb-4">
                        <div class="flex-1 min-w-0">
                            <h3 class="text-gray-800 dark:text-gray-100 text-lg sm:text-xl font-bold mb-1 truncate">${exercise.exercise_name}</h3>
                            <p class="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">${exercise.session_count} session${exercise.session_count !== 1 ? 's' : ''} tracked</p>
                        </div>
                        <div class="bg-${color}-50 dark:bg-${color}-900/50 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
                            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-${color}-600 dark:text-${color}-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"/>
                            </svg>
                        </div>
                    </div>
                    <div class="bg-${color}-50 dark:bg-${color}-900/50 border border-${color}-200 dark:border-${color}-700 rounded-lg sm:rounded-xl p-3 sm:p-4">
                        <div class="text-center">
                            <p class="text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">Personal Record</p>
                            <p class="text-${color}-700 dark:text-${color}-400 text-2xl sm:text-3xl font-bold" id="${prValueId}">--</p>
                            <p class="text-gray-500 dark:text-gray-500 text-xs mt-1" id="${prDateId}">Loading...</p>
                        </div>
                    </div>
                </div>
                <div class="p-3 sm:p-6 bg-gray-50 dark:bg-gray-900">
                    <div class="h-48 sm:h-56 md:h-64 relative">
                        <canvas id="${canvasId}"></canvas>
                    </div>
                </div>
            </div>
        `;
    },

    loadManageModal() {
        const $modal = $('#manageTrackedModal');
        $modal.removeClass('hidden');
        
        this.refreshTrackedList();
        this.refreshAvailableDropdown();
    },

    refreshTrackedList() {
        $.get('/metrics/api/tracked-exercises', (data) => {
            const $list = $('#trackedExercisesList');
            const $emptyState = $('#emptyTrackedState');
            const $dropdown = $('#addExerciseDropdown');
            
            // Update counter
            const count = data.tracked_exercises.length;
            $('#trackedCountLabel').text(count);
            
            // Enable/disable dropdown based on limit
            if (count >= 6) {
                $dropdown.prop('disabled', true);
                $dropdown.css('opacity', '0.6');
                $dropdown.css('cursor', 'not-allowed');
                // Add limit message option if not already there
                if ($dropdown.find('option[value=""][data-limit-message]').length === 0) {
                    $dropdown.prepend('<option value="" disabled selected data-limit-message>Maximum of 6 exercises reached</option>');
                }
            } else {
                $dropdown.prop('disabled', false);
                $dropdown.css('opacity', '1');
                $dropdown.css('cursor', 'pointer');
                // Remove the "maximum reached" option if it exists
                $dropdown.find('option[data-limit-message]').remove();
            }
            
            if (count === 0) {
                $emptyState.show();
                $list.find('.tracked-exercise-item').remove();
            } else {
                $emptyState.hide();
                $list.find('.tracked-exercise-item').remove();
                
                // Add each tracked exercise
                data.tracked_exercises.forEach((ex, index) => {
                    const color = ProgressUtils.cardColors[index % ProgressUtils.cardColors.length];
                    const item = this.createTrackedListItem(ex, index, color);
                    $emptyState.after(item);
                });
            }
        }).catch(error => {
            console.error('Error loading tracked exercises:', error);
        });
    },

    createTrackedListItem(exercise, index, color) {
        return $(`
            <div class="tracked-exercise-item flex items-center justify-between p-4 bg-gradient-to-r from-${color}-50 to-${color}-100 dark:from-${color}-900/30 dark:to-${color}-800/20 rounded-xl border-2 border-${color}-200 dark:border-${color}-700 hover:shadow-md transition-all group" data-tracked-id="${exercise.tracked_exercise_id}" data-exercise-name="${exercise.exercise_name}">
                <div class="flex items-center gap-3 flex-1">
                    <div class="bg-${color}-500 dark:bg-${color}-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        ${index + 1}
                    </div>
                    <div>
                        <div class="font-bold text-gray-800 dark:text-gray-100">${exercise.exercise_name}</div>
                        <div class="text-xs text-gray-600 dark:text-gray-400">${exercise.session_count} session${exercise.session_count !== 1 ? 's' : ''} logged</div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button class="delete-tracked-btn p-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg transition-all hover:shadow-md" data-tracked-id="${exercise.tracked_exercise_id}" data-exercise-name="${exercise.exercise_name}" title="Remove">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>
        `);
    },

    refreshAvailableDropdown() {
        const $dropdown = $('#addExerciseDropdown');
        
        Promise.all([
            $.get('/metrics/api/tracked-exercises'),
            $.get('/metrics/api/available-exercises')
        ]).then(([trackedData, availableData]) => {
            
            const trackedCount = trackedData.tracked_exercises.length;
            const trackedNames = new Set(trackedData.tracked_exercises.map(ex => ex.exercise_name));
            
            // Check if at limit before populating
            if (trackedCount >= 6) {
                $dropdown.empty().append('<option value="" disabled selected data-limit-message>Maximum of 6 exercises reached</option>');
                $dropdown.prop('disabled', true);
                $dropdown.css('opacity', '0.6');
                $dropdown.css('cursor', 'not-allowed');
                return;
            }
            
            const exercisesByBodyPart = availableData.exercises_by_body_part;
            
            // Clear dropdown and ensure it's enabled
            $dropdown.empty().append('<option value="">Select an exercise to add...</option>');
            $dropdown.prop('disabled', false);
            $dropdown.css('opacity', '1');
            $dropdown.css('cursor', 'pointer');
            
            if (!exercisesByBodyPart || Object.keys(exercisesByBodyPart).length === 0) {
                $dropdown.append('<option value="" disabled>No exercises found - start logging workouts!</option>');
                return;
            }
            
            // Build dropdown with optgroups by body part
            let hasAvailable = false;
            let totalAvailable = 0;
            
            Object.keys(exercisesByBodyPart).sort().forEach(bodyPart => {
                const exercises = exercisesByBodyPart[bodyPart];
                const available = exercises.filter(ex => !trackedNames.has(ex.exercise_name));
                
                if (available.length > 0) {
                    hasAvailable = true;
                    totalAvailable += available.length;
                    const $optgroup = $(`<optgroup label="${bodyPart}"></optgroup>`);
                    
                    available.forEach(ex => {
                        $optgroup.append(`<option value="${ex.exercise_name}">${ex.exercise_name} (${ex.times_performed}x)</option>`);
                    });
                    
                    $dropdown.append($optgroup);
                }
            });
            
            if (!hasAvailable) {
                $dropdown.append('<option value="" disabled>All exercises are already being tracked!</option>');
            }
            
        }).catch(error => {
            console.error('❌ Error loading available exercises:', error);
            $dropdown.empty().append('<option value="">Error loading exercises</option>');
        });
    },

    addExerciseFromDropdown() {
        const $dropdown = $('#addExerciseDropdown');
        const exerciseName = $dropdown.val();
        
        if (!exerciseName) return;
        
        // Check current count before adding
        const currentCount = parseInt($('#trackedCountLabel').text()) || 0;
        if (currentCount >= 6) {
            ProgressUtils.showNotification('Maximum of 6 tracked exercises allowed. Please remove one first.', 'error');
            $dropdown.val(''); // Reset dropdown
            return;
        }
        
        const csrfToken = this.getCsrfToken();

        $.ajax({
            url: '/metrics/api/tracked-exercises',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                exercise_name: exerciseName,
                csrf_token: csrfToken
            }),
            beforeSend: function(xhr) {
                if (csrfToken) {
                    xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                }
            },
            success: (response) => {
                ProgressUtils.showNotification(`Added ${exerciseName} to tracked lifts!`, 'success');
                this.refreshTrackedList();
                this.refreshAvailableDropdown();
                this.loadTrackedExercises();
            },
            error: (xhr) => {
                const error = xhr.responseJSON?.error || 'Failed to add exercise';
                ProgressUtils.showNotification(error, 'error');
            }
        });
    },

    showDeleteModal(trackedId, exerciseName) {
        
        // Store pending delete info
        this.pendingDelete = { trackedId, exerciseName };
        
        // Update modal content
        $('#deleteExerciseName').text(exerciseName);
        
        // Show modal
        $('#deleteConfirmModal').removeClass('hidden');
        
    },
    
    confirmDelete() {
        if (!this.pendingDelete) return;
        
        const { trackedId, exerciseName } = this.pendingDelete;
        
        const csrfToken = this.getCsrfToken();

        $.ajax({
            url: `/metrics/api/tracked-exercises/${trackedId}`,
            method: 'DELETE',
            contentType: 'application/json',
            data: JSON.stringify({ csrf_token: csrfToken }),
            beforeSend: function(xhr) {
                if (csrfToken) {
                    xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                }
            },
            success: () => {
                ProgressUtils.showNotification(`Removed ${exerciseName}`, 'success');
                $('#deleteConfirmModal').addClass('hidden');
                this.pendingDelete = null;
                this.refreshTrackedList();
                this.refreshAvailableDropdown();
                this.loadTrackedExercises();
            },
            error: (xhr) => {
                const error = xhr.responseJSON?.error || 'Failed to remove exercise';
                ProgressUtils.showNotification(error, 'error');
            }
        });
    },
    
    cancelDelete() {
        $('#deleteConfirmModal').addClass('hidden');
        this.pendingDelete = null;
    },

    setupEventHandlers() {
        // Open manage modal
        $('#manageTrackedBtn, #addFirstTrackedBtn').on('click', () => {
            this.loadManageModal();
        });
        
        // Close modal
        $('#closeTrackedModal, #closeTrackedModalBtn').on('click', () => {
            $('#manageTrackedModal').addClass('hidden');
        });
        
        // Add exercise when dropdown changes
        $('#addExerciseDropdown').on('change', () => {
            if ($('#addExerciseDropdown').val()) {
                this.addExerciseFromDropdown();
            }
        });
        
        // Delete tracked exercise (delegated event) - show modal instead of browser confirm
        $(document).on('click', '.delete-tracked-btn', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const trackedId = $(e.currentTarget).data('tracked-id');
            const exerciseName = $(e.currentTarget).data('exercise-name');
            this.showDeleteModal(trackedId, exerciseName);
        });
        
        // Delete confirmation modal handlers
        $('#confirmDeleteBtn').on('click', () => {
            this.confirmDelete();
        });
        
        $('#cancelDeleteBtn').on('click', () => {
            this.cancelDelete();
        });
        
        // Close delete modal when clicking outside
        $('#deleteConfirmModal').on('click', (e) => {
            if ($(e.target).attr('id') === 'deleteConfirmModal') {
                this.cancelDelete();
            }
        });

        // Custom exercise selection
        $('#customExerciseSelect').on('change', function () {
            const selectedExercise = $(this).val();
            
            if (selectedExercise) {
                $('#customChartContainer').removeClass('hidden').addClass('animate__animated animate__fadeIn');
                $('#customChartTitle').text(selectedExercise);
                ProgressUtils.loadExerciseProgression(selectedExercise, 'customExerciseChart');
            } else {
                $('#customChartContainer').addClass('hidden');
            }
        });
        
        // Add exercise button (for custom section)
        $('#addExerciseBtn').on('click', () => {
            $('#addExerciseModal').removeClass('hidden');
            this.loadAvailableExercises();
        });
        
        // Close add exercise modal
        $('#closeModal, #closeModalBtn').on('click', () => {
            $('#addExerciseModal').addClass('hidden');
        });
    },

    loadAvailableExercises() {
        $.get('/metrics/api/available-exercises', (data) => {
            const $exerciseList = $('#availableExercisesList');
            $exerciseList.empty();
            
            const exercisesByBodyPart = data.exercises_by_body_part;
            
            if (Object.keys(exercisesByBodyPart).length === 0) {
                $exerciseList.html(`
                    <div class="text-center py-12">
                        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                        </svg>
                        <p class="text-gray-600 text-lg">No exercises found</p>
                        <p class="text-gray-500 text-sm mt-2">Start logging workouts to track your progress!</p>
                    </div>
                `);
                return;
            }
            
            Object.keys(exercisesByBodyPart).sort().forEach(bodyPart => {
                const exercises = exercisesByBodyPart[bodyPart];
                
                if (exercises.length > 0) {
                    $exerciseList.append(`
                        <div class="mb-6">
                            <div class="flex items-center mb-3">
                                <div class="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                                    ${bodyPart}
                                </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                ${exercises.map(ex => `
                                    <button 
                                        class="exercise-btn group text-left px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/50 dark:hover:to-purple-900/50 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                                        onclick="MainLiftsTab.selectExerciseToTrack('${ex.exercise_name}')"
                                    >
                                        <div class="flex items-center justify-between">
                                            <span class="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">${ex.exercise_name}</span>
                                            <span class="bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-xs font-bold text-gray-600 dark:text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900">${ex.times_performed}x</span>
                                        </div>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    `);
                }
            });
        }).fail((error) => {
            console.error('Failed to load available exercises:', error);
            $('#availableExercisesList').html(`
                <div class="text-center py-12">
                    <svg class="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p class="text-red-600 text-lg">Error loading exercises</p>
                    <p class="text-gray-500 text-sm mt-2">Please try again later</p>
                </div>
            `);
        });
    },

    selectExerciseToTrack(exerciseName) {
        $('#addExerciseModal').addClass('hidden');
        $('#customExerciseSelect').val(exerciseName).trigger('change');
        ProgressUtils.showNotification(`Now tracking: ${exerciseName}`, 'success');
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MainLiftsTab;
}

