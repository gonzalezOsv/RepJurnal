$(document).ready(function() {
    let routines = [];
    let allBodyParts = [];
    let currentEditingRoutineId = null;
    let exerciseCounter = 0;
    let routineDate = new Date();
    let originalRoutineData = null; // Track original data for change detection

    // Note: Template helper functions now provided by TemplateHelpers module:
    // - TemplateHelpers.cloneRoutineCardTemplate()
    // - TemplateHelpers.createBadge(text, type)
    // - TemplateHelpers.populateRoutineCard($card, routine)
    // These are loaded via module script tags in my_routines.html
    
    function getCsrfToken() {
        if (window.CSRF && typeof window.CSRF.getToken === 'function') {
            const token = window.CSRF.getToken();
            if (token) {
                return token;
            }
        }
        const input = document.querySelector('input[name="csrf_token"]');
        return input ? input.value : null;
    }

    // ===================================
    // PRIVACY SETTINGS ENFORCEMENT
    // ===================================
    const userPrivacySettings = window.USER_PRIVACY_SETTINGS || {
        showRoutinesToPublic: false,
        profileVisibility: 'private',
        showStatsToFriends: false,
        showWorkoutsToFriends: false
    };
    
    console.log('User Privacy Settings:', userPrivacySettings);
    
    // Helper function to show error with HTML links (for privacy messages)
    function showPrivacyError(message, duration = 8000) {
        const $message = $('<div>')
            .addClass('fixed top-4 right-4 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-md')
            .html(`
                <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <span>${message}</span>
            `)
            .appendTo('body')
            .fadeIn(300);
        
        setTimeout(() => {
            $message.fadeOut(300, function() {
                $(this).remove();
            });
        }, duration);
    }
    
    // Handle visibility toggle click - enforce privacy settings
    $('#routineVisibility').on('click', function(e) {
        if (!userPrivacySettings.showRoutinesToPublic && $(this).is(':checked')) {
            // User tried to enable public but their privacy settings don't allow it
            e.preventDefault();
            $(this).prop('checked', false);
            
            // Show error with link to account settings
            showPrivacyError(
                'Public routines are disabled in your privacy settings. ' +
                '<a href="/account" class="underline font-bold hover:text-red-200">Change in Account Settings →</a>'
            );
            return false;
        }
    });

    // Set today's date in the date picker
    $('#routineDate').val(RoutineUtils.formatDateForInput(routineDate));

    // Today button handler
    $('#todayRoutineBtn').on('click', function() {
        routineDate = new Date();
        $('#routineDate').val(RoutineUtils.formatDateForInput(routineDate));
    });

    // Load routines and body parts on page load
    // Initialize tab switching
    initTabSwitching();
    
    // Load data
    loadRoutines();
    loadBodyParts();
    
    // Check if first-time user and show hint
    checkFirstTimeUser();

    // Dismiss duplicate warning
    $('#dismissDuplicateWarning').on('click', function() {
        $('#duplicateWarning').slideUp(300, function() {
            $(this).addClass('hidden');
        });
    });

    // Modal controls
    $('#createRoutineBtn').on('click', function() {
        openRoutineModal();
    });

    $('#closeModal, #cancelModalBtn').on('click', function() {
        closeRoutineModal();
    });

    $('#saveRoutineBtn').on('click', function() {
        saveRoutine();
    });

    // Add exercise button
    $('#addExerciseBtn').on('click', function() {
        // Expand exercises section if collapsed
        if ($('#exercisesListContainer').hasClass('hidden')) {
            expandExercisesSection();
        }
        addExerciseRow();
    });

    // Help Guide Modal controls
    $('#helpGuideBtn').on('click', function() {
        $('#helpGuideModal').removeClass('hidden');
    });

    $('#closeHelpGuide, #closeHelpGuideFooter').on('click', function() {
        $('#helpGuideModal').addClass('hidden');
    });

    // Close help modal on backdrop click
    $('#helpGuideModal').on('click', function(e) {
        if (e.target === this) {
            $('#helpGuideModal').addClass('hidden');
        }
    });
    
    // Collapsible load routine section
    $(document).on('click', '.load-routine-header', function() {
        const content = $('.load-routine-content');
        const arrow = $('.load-routine-arrow');
        
        if (content.hasClass('hidden')) {
            content.removeClass('hidden').slideDown(300);
            arrow.css('transform', 'rotate(180deg)');
        } else {
            content.slideUp(300, function() {
                $(this).addClass('hidden');
            });
            arrow.css('transform', 'rotate(0deg)');
        }
    });
    
    // Collapsible exercises section
    $(document).on('click', '.exercises-header', function() {
        if ($('#exercisesListContainer').hasClass('hidden')) {
            expandExercisesSection();
        } else {
            collapseExercisesSection();
        }
    });
    
    // Load routine button
    $('#loadRoutineBtn').on('click', async function() {
        const routineId = parseInt($('#loadRoutineSelect').val());
        if (!routineId) {
            UIHelpers.showError('Please select a routine to load');
            return;
        }
        
        const routine = routines.find(r => r.routine_id === routineId);
        if (!routine) {
            UIHelpers.showError('Routine not found');
            return;
        }
        
        // Ask user if they want to create a new routine or edit the existing one
        const userChoice = await UIHelpers.confirmAction(
            `Do you want to create a NEW routine based on "${routine.routine_name}"?\n\n` +
            `• Confirm: create a new copy (original stays unchanged)\n` +
            `• Cancel: edit the existing routine (changes overwrite the saved version)`,
            'Create Copy',
            'Edit Existing'
        );
        
        if (userChoice) {
            // Create NEW routine based on existing one
            $('#routineName').val(routine.routine_name + ' (Copy)');
            $('#routineDescription').val(routine.description || '');
            currentEditingRoutineId = null; // New routine
            
            if (routine.exercises && routine.exercises.length > 0) {
                $('#exercisesList').empty();
                exerciseCounter = 0;
                routine.exercises.forEach(ex => {
                    addExerciseRow(ex);
                });
                expandExercisesSection();
                UIHelpers.showSuccess(`Creating NEW routine based on "${routine.routine_name}". Original routine will not be changed.`);
            }
        } else {
            // EDIT existing routine
            $('#routineName').val(routine.routine_name);
            $('#routineDescription').val(routine.description || '');
            currentEditingRoutineId = routine.routine_id; // Edit mode
            
            if (routine.exercises && routine.exercises.length > 0) {
                $('#exercisesList').empty();
                exerciseCounter = 0;
                routine.exercises.forEach(ex => {
                    addExerciseRow(ex);
                });
                expandExercisesSection();
                UIHelpers.showSuccess(`Editing "${routine.routine_name}". Changes will UPDATE the saved routine.`);
            }
        }
        
        // Reset load routine dropdown
        $('#loadRoutineSelect').val('');
        // Collapse load routine section
        $('.load-routine-content').slideUp(300, function() {
            $(this).addClass('hidden');
        });
        $('.load-routine-arrow').css('transform', 'rotate(0deg)');
    });

    // Close modal on backdrop click
    $('#routineModal').on('click', function(e) {
        if (e.target === this) {
            closeRoutineModal();
        }
    });

    // Load routines from API
    async function loadRoutines() {
        try {
            const response = await $.get('/api/routines');
            routines = response.routines || [];
            
            // Check for duplicate names (from testing copy functionality)
            const nameCount = {};
            routines.forEach(r => {
                nameCount[r.routine_name] = (nameCount[r.routine_name] || 0) + 1;
            });
            const duplicateNames = Object.entries(nameCount).filter(([name, count]) => count > 1);
            if (duplicateNames.length > 0) {
                // Show warning banner
                showDuplicateWarning(duplicateNames);
            } else {
                // Hide warning if no duplicates
                $('#duplicateWarning').addClass('hidden');
            }
            
            renderRoutines();
        } catch (error) {
            console.error('Error loading routines:', error);
            UIHelpers.showError('Error loading routines. Please refresh the page.');
            $('#my-routines-container').html('<div class="col-span-full text-center py-12 text-red-600 dark:text-red-400">Error loading routines</div>');
            $('#imported-routines-container').html('');
        }
    }

    // Load body parts
    async function loadBodyParts() {
        try {
            const response = await $.get('/workout/api/bodyparts');
            allBodyParts = response;
        } catch (error) {
            console.error('Error loading body parts:', error);
        }
    }

    // Load exercises for a specific body part (like repLogger)
    async function loadExercises(bodyPart) {
        try {
            const response = await $.get(`/workout/api/exercises/${bodyPart}`);
            return response;
        } catch (error) {
            console.error('Error loading exercises:', error);
            return { standardExercises: [], customExercises: [] };
        }
    }

    // Tab switching functionality
    function initTabSwitching() {
        $('#myRoutinesTab').on('click', function() {
            switchToTab('my');
        });
        
        $('#importedRoutinesTab').on('click', function() {
            switchToTab('imported');
        });
    }

    function switchToTab(tabType) {
        if (tabType === 'my') {
            // Update My Routines Tab - active state
            $('#myRoutinesTab')
                .removeClass('bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 border-transparent')
                .addClass('bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 border-indigo-300 dark:border-indigo-600 shadow-sm');
            
            // Update Imported Routines Tab - inactive state
            $('#importedRoutinesTab')
                .removeClass('bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 border-indigo-300 dark:border-indigo-600 shadow-sm')
                .addClass('bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 border-transparent');
            
            // Show/hide sections
            $('#my-routines-section').removeClass('hidden');
            $('#imported-routines-section').addClass('hidden');
            
            // Update tab text colors
            $('#myRoutinesTab span').not('#myRoutinesCount').removeClass('text-gray-600 dark:text-gray-400').addClass('text-gray-800 dark:text-gray-100');
            $('#importedRoutinesTab span').not('#importedRoutinesCount').removeClass('text-gray-800 dark:text-gray-100').addClass('text-gray-600 dark:text-gray-400');
        } else {
            // Update Imported Routines Tab - active state
            $('#importedRoutinesTab')
                .removeClass('bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 border-transparent')
                .addClass('bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-300 dark:border-blue-600 shadow-sm');
            
            // Update My Routines Tab - inactive state
            $('#myRoutinesTab')
                .removeClass('bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 border-indigo-300 dark:border-indigo-600 shadow-sm')
                .addClass('bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 border-transparent');
            
            // Show/hide sections
            $('#imported-routines-section').removeClass('hidden');
            $('#my-routines-section').addClass('hidden');
            
            // Update tab text colors
            $('#importedRoutinesTab span').not('#importedRoutinesCount').removeClass('text-gray-600 dark:text-gray-400').addClass('text-gray-800 dark:text-gray-100');
            $('#myRoutinesTab span').not('#myRoutinesCount').removeClass('text-gray-800 dark:text-gray-100').addClass('text-gray-600 dark:text-gray-400');
        }
    }

    // Render routines list
    function renderRoutines() {
        const myRoutinesContainer = $('#my-routines-container');
        const importedRoutinesContainer = $('#imported-routines-container');
        
        // Separate routines into my routines and imported routines
        const myRoutines = routines.filter(r => !r.is_imported);
        const importedRoutines = routines.filter(r => r.is_imported);
        
        // Update count badges
        $('#myRoutinesCount').text(myRoutines.length);
        $('#importedRoutinesCount').text(importedRoutines.length);
        
        // Render My Routines
        if (myRoutines.length === 0) {
            myRoutinesContainer.html(`
                <div class="col-span-full text-center py-16">
                    <div class="inline-block p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-md mb-4">
                        <svg class="w-20 h-20 text-gray-400 dark:text-gray-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"/>
                        </svg>
                    </div>
                    <p class="text-lg sm:text-xl text-gray-700 dark:text-gray-300 font-bold mb-2">No Routines Yet</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Create your first workout routine to streamline your training</p>
                    <button id="createFirstRoutineBtn" class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-500 dark:to-blue-500 hover:from-indigo-700 hover:to-blue-700 dark:hover:from-indigo-600 dark:hover:to-blue-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Create Your First Routine
                    </button>
                </div>
            `);
            $('#createFirstRoutineBtn').on('click', function() {
                openRoutineModal();
            });
        } else {
            myRoutinesContainer.empty();
            renderRoutineCards(myRoutines, myRoutinesContainer);
        }
        
        // Render Imported Routines
        if (importedRoutines.length === 0) {
            importedRoutinesContainer.html(`
                <div class="col-span-full text-center py-12">
                    <div class="inline-block p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl shadow-md mb-4">
                        <svg class="w-16 h-16 text-blue-400 dark:text-blue-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                        </svg>
                    </div>
                    <p class="text-lg text-gray-600 dark:text-gray-400 mb-2">No Imported Routines</p>
                    <p class="text-sm text-gray-500 dark:text-gray-500">Import routines from other users using the "Import Code" button above</p>
                </div>
            `);
        } else {
            importedRoutinesContainer.empty();
            renderRoutineCards(importedRoutines, importedRoutinesContainer);
        }
    }

    // Render routine cards into a container (NEW TEMPLATE-BASED VERSION)
    function renderRoutineCards(routinesToRender, container) {
        routinesToRender.forEach(routine => {
            
            // Clone template and populate with data
            const $card = TemplateHelpers.cloneRoutineCardTemplate();
            TemplateHelpers.populateRoutineCard($card, routine);
            
            // Append to container
            container.append($card);
        });
        
        // Attach event handlers to the newly rendered cards
        attachRoutineCardEventHandlers(container);
    }
    
    /**
     * Attach event handlers to routine cards
     */
    function attachRoutineCardEventHandlers(container) {
        // Edit routine button
        container.find('.edit-routine-btn').off('click').on('click', function() {
            const routineId = $(this).data('routine-id');
            editRoutine(routineId);
        });

        // Delete routine button
        container.find('.delete-routine-btn').off('click').on('click', function() {
            const routineId = $(this).data('routine-id');
            deleteRoutine(routineId);
        });

        // Start workout button - Store routine in session then navigate
        container.find('.start-routine-btn').off('click').on('click', async function() {
            const routineId = $(this).data('routine-id');
            const $btn = $(this);
            
            // Disable button and show loading state
            $btn.prop('disabled', true).html(`
                <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <span>Loading...</span>
            `);
            
            try {
                const csrfToken = getCsrfToken();
                // Store routine in session (server-side, secure)
                await $.ajax({
                    url: `/api/routines/${routineId}/start-workout`,
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        csrf_token: csrfToken
                    }),
                    beforeSend: function(xhr) {
                        if (csrfToken) {
                            xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                        }
                    }
                });
                
                // Navigate to workout logger
                window.location.href = '/repLog';
            } catch (error) {
                console.error('Error starting workout:', error);
                UIHelpers.showError('Failed to start workout. Please try again.');
                
                // Re-enable button
                $btn.prop('disabled', false).html(`
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>Start Workout</span>
                `);
            }
        });
        
        // Collapsible routine cards
        container.find('.routine-header').off('click').on('click', function() {
            const $header = $(this);
            const $content = $header.closest('.routine-card').find('.routine-content');
            const $arrow = $header.find('.routine-arrow');
            
            if ($content.hasClass('hidden')) {
                // Expand
                $content.removeClass('hidden').slideDown(300);
                $arrow.css('transform', 'rotate(90deg)');
            } else {
                // Collapse
                $content.slideUp(300, function() {
                    $(this).addClass('hidden');
                });
                $arrow.css('transform', 'rotate(0deg)');
            }
        });
    }

    // Open routine modal (create or edit)
    function openRoutineModal(routine = null) {
        currentEditingRoutineId = routine ? routine.routine_id : null;
        $('#modalTitle').text(routine ? 'Edit Routine' : 'Create Routine');
        
        // Reset form
        $('#routineName').val(routine ? routine.routine_name : '');
        $('#routineDescription').val(routine ? (routine.description || '') : '');
        $('#exercisesList').empty();
        exerciseCounter = 0;
        
        // Set visibility checkbox (public = checked, private = unchecked)
        const isPublic = routine ? (routine.visibility === 'public') : false;
        $('#routineVisibility').prop('checked', isPublic);
        
        // Store original data for change detection
        originalRoutineData = {
            name: routine ? routine.routine_name : '',
            description: routine ? (routine.description || '') : '',
            visibility: isPublic,
            exerciseCount: routine && routine.exercises ? routine.exercises.length : 0
        };
        
        // Reset date to today if creating new, or keep current if editing
        if (!routine) {
            routineDate = new Date();
            $('#routineDate').val(RoutineUtils.formatDateForInput(routineDate));
        }
        
        // Populate load routine dropdown
        populateLoadRoutineDropdown();
        
        // Reset collapsible sections
        resetCollapsibleSections();
        
        // If editing, add existing exercises
        if (routine && routine.exercises) {
            routine.exercises.forEach(ex => {
                addExerciseRow(ex);
            });
            // Expand exercises section if editing
            expandExercisesSection();
        }
        
        $('#emptyExercises').toggle(!routine || !routine.exercises || routine.exercises.length === 0);
        
        // Disable save button initially if editing (no changes yet)
        if (currentEditingRoutineId) {
            $('#saveRoutineBtn').prop('disabled', true).addClass('opacity-50 cursor-not-allowed');
        } else {
            $('#saveRoutineBtn').prop('disabled', false).removeClass('opacity-50 cursor-not-allowed');
        }
        
        // Setup change listeners
        setupChangeDetection();
        
        $('#routineModal').removeClass('hidden');
    }
    
    // Setup change detection for modal fields
    function setupChangeDetection() {
        // Remove any existing listeners to avoid duplicates
        $('#routineName, #routineDescription, #routineVisibility').off('input change');
        
        function checkForChanges() {
            if (!currentEditingRoutineId || !originalRoutineData) {
                // Creating new routine - always enable save
                $('#saveRoutineBtn').prop('disabled', false).removeClass('opacity-50 cursor-not-allowed');
                return;
            }
            
            const currentName = $('#routineName').val().trim();
            const currentDesc = $('#routineDescription').val().trim();
            const currentVisibility = $('#routineVisibility').is(':checked');
            const currentExerciseCount = $('.exercise-row').length;
            
            let hasChanges = 
                currentName !== originalRoutineData.name ||
                currentDesc !== originalRoutineData.description ||
                currentVisibility !== originalRoutineData.visibility ||
                currentExerciseCount !== originalRoutineData.exerciseCount;
            
            // Check if any exercise field values have changed
            if (!hasChanges && originalRoutineData.exercises) {
                const currentExercises = [];
                $('.exercise-row').each(function() {
                    const $row = $(this);
                    const bodyPart = $row.find('.exercise-body-part').val();
                    const exerciseName = $row.find('.exercise-name-select').is(':visible') 
                        ? $row.find('.exercise-name-select option:selected').text()
                        : $row.find('.exercise-name-custom').val();
                    const sets = $row.find('.exercise-sets').val();
                    const reps = $row.find('.exercise-reps').val();
                    const weight = $row.find('.exercise-weight').val();
                    const unit = $row.find('.exercise-unit').val();
                    const duration = $row.find('.exercise-duration').val();
                    const intensity = $row.find('.exercise-intensity').val();
                    
                    currentExercises.push({
                        bodyPart,
                        exerciseName,
                        sets,
                        reps,
                        weight,
                        unit,
                        duration,
                        intensity
                    });
                });
                
                // Compare with original exercises
                if (currentExercises.length === originalRoutineData.exercises.length) {
                    for (let i = 0; i < currentExercises.length; i++) {
                        const current = currentExercises[i];
                        const original = originalRoutineData.exercises[i];
                        
                        if (current.bodyPart !== original.body_part ||
                            current.exerciseName !== original.exercise_name ||
                            current.sets !== String(original.sets || '') ||
                            current.reps !== String(original.reps || '') ||
                            current.weight !== String(original.weight || '') ||
                            current.unit !== (original.unit || 'lb') ||
                            current.duration !== String(original.duration_minutes || '') ||
                            current.intensity !== (original.intensity || '')) {
                            hasChanges = true;
                            break;
                        }
                    }
                }
            }
            
            if (hasChanges) {
                $('#saveRoutineBtn').prop('disabled', false).removeClass('opacity-50 cursor-not-allowed');
            } else {
                $('#saveRoutineBtn').prop('disabled', true).addClass('opacity-50 cursor-not-allowed');
            }
        }
        
        // Listen for changes on routine-level fields
        $('#routineName, #routineDescription').on('input', checkForChanges);
        $('#routineVisibility').on('change', checkForChanges);
        
        // Listen for changes on exercise fields (delegated to handle dynamically added rows)
        $('#exercisesList').on('input change', '.exercise-body-part, .exercise-name-select, .exercise-name-custom, .exercise-sets, .exercise-reps, .exercise-weight, .exercise-unit, .exercise-duration, .exercise-intensity', checkForChanges);
        
        // Also check when exercises are added/removed via MutationObserver
        const exerciseListObserver = new MutationObserver(checkForChanges);
        const exercisesList = document.getElementById('exercisesList');
        if (exercisesList) {
            exerciseListObserver.observe(exercisesList, { childList: true });
        }
    }
    
    // Populate load routine dropdown
    function populateLoadRoutineDropdown() {
        const $select = $('#loadRoutineSelect');
        $select.empty().append('<option value="">Select a routine to load...</option>');
        
        routines.forEach(routine => {
            // Don't include the routine we're currently editing
            if (routine.routine_id !== currentEditingRoutineId) {
                const exerciseCount = routine.exercises ? routine.exercises.length : 0;
                $select.append(`<option value="${routine.routine_id}">${RoutineUtils.escapeHtml(routine.routine_name)} (${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''})</option>`);
            }
        });
    }
    
    // Reset collapsible sections to collapsed state
    function resetCollapsibleSections() {
        // Load routine section - collapsed
        $('.load-routine-content').addClass('hidden').slideUp(0);
        $('.load-routine-arrow').css('transform', 'rotate(0deg)');
        
        // Exercises section - collapsed
        $('#exercisesListContainer').addClass('hidden').slideUp(0);
        $('.exercises-arrow').css('transform', 'rotate(0deg)');
    }
    
    // Expand exercises section
    function expandExercisesSection() {
        $('#exercisesListContainer').removeClass('hidden').slideDown(300);
        $('.exercises-arrow').css('transform', 'rotate(180deg)');
    }

    // Close routine modal
    function closeRoutineModal() {
        $('#routineModal').addClass('hidden');
        // Reset form
        $('#routineName').val('');
        $('#routineDescription').val('');
        $('#exercisesList').empty();
        currentEditingRoutineId = null;
    }

    // Add exercise row to the form
    function addExerciseRow(exercise = null) {
        exerciseCounter++;
        const exerciseId = `exercise-${exerciseCounter}`;
        const bodyPart = exercise ? exercise.body_part_id : '';
        const exerciseName = exercise ? exercise.exercise_name : '';
        const exerciseType = exercise ? exercise.exercise_type : 'strength';
        const isCardio = exerciseType === 'cardio';
        
        const exerciseRow = $(`
            <div class="exercise-row bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900/30 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-6 mb-4 shadow-md hover:shadow-lg transition-all" data-exercise-id="${exerciseId}">
                <!-- Exercise Header with Order Number -->
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-600">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-500 dark:from-indigo-600 dark:to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                            ${exerciseCounter}
                        </div>
                        <h4 class="text-base sm:text-lg font-bold text-gray-700 dark:text-gray-200">Exercise ${exerciseCounter}</h4>
                    </div>
                    <button type="button" class="remove-exercise-btn text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-all" data-exercise-id="${exerciseId}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>

                <!-- Body Part Selector -->
                <div class="mb-4">
                    <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Body Part / Type</label>
                    <select class="exercise-body-part w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-base text-gray-900 dark:text-gray-100" required>
                        <option value="">Select body part...</option>
                    </select>
                </div>

                <!-- Exercise Name -->
                <div class="mb-4">
                    <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Exercise Name</label>
                    <select class="exercise-name-select w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-base text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" disabled required>
                        <option value="">Select body part first...</option>
                    </select>
                    <input type="text" class="exercise-name-custom hidden w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-base text-gray-900 dark:text-gray-100" placeholder="Enter custom exercise name" disabled>
                </div>

                <!-- Strength Exercise Fields (Default) -->
                <div class="exercise-strength-fields ${isCardio ? 'hidden' : ''}">
                    <div class="grid grid-cols-2 gap-3 sm:gap-4 mb-3">
                        <div>
                            <label class="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sets</label>
                            <input type="number" class="exercise-sets w-full px-3 py-2 sm:px-4 sm:py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-base text-gray-900 dark:text-gray-100" min="1" value="${exercise?.sets || ''}">
                        </div>
                        <div>
                            <label class="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Reps</label>
                            <input type="number" class="exercise-reps w-full px-3 py-2 sm:px-4 sm:py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-base text-gray-900 dark:text-gray-100" min="1" value="${exercise?.reps || ''}">
                        </div>
                    </div>
                    <div class="w-full">
                        <label class="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Weight</label>
                        <div class="flex gap-2">
                            <input type="number" class="exercise-weight flex-1 px-3 py-2 sm:px-4 sm:py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-base text-gray-900 dark:text-gray-100" step="0.5" min="0" value="${exercise?.weight || ''}">
                            <select class="exercise-unit px-3 py-2 sm:px-4 sm:py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-base text-gray-900 dark:text-gray-100">
                                <option value="lb" ${exercise?.unit === 'lb' ? 'selected' : ''}>lbs</option>
                                <option value="kg" ${exercise?.unit === 'kg' ? 'selected' : ''}>kg</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Cardio Exercise Fields -->
                <div class="exercise-cardio-fields ${isCardio ? '' : 'hidden'}">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label class="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Duration (minutes)</label>
                            <input type="number" class="exercise-duration w-full px-3 py-2 sm:px-4 sm:py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-base text-gray-900 dark:text-gray-100" min="1" step="0.5" value="${exercise?.duration_minutes || ''}">
                        </div>
                        <div>
                            <label class="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Intensity</label>
                            <select class="exercise-intensity w-full px-3 py-2 sm:px-4 sm:py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-base text-gray-900 dark:text-gray-100">
                                <option value="">Select intensity...</option>
                                <option value="low" ${exercise?.intensity === 'low' ? 'selected' : ''}>Low</option>
                                <option value="moderate" ${exercise?.intensity === 'moderate' ? 'selected' : ''}>Moderate</option>
                                <option value="high" ${exercise?.intensity === 'high' ? 'selected' : ''}>High</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        $('#exercisesList').append(exerciseRow);
        $('#emptyExercises').hide();
        
        // Populate body parts dropdown
        populateBodyPartsDropdown(exerciseRow.find('.exercise-body-part'), bodyPart);
        
        // Attach event handlers for this row FIRST (before triggering changes)
        attachExerciseRowEventHandlers(exerciseRow);
        
        // If editing, pre-select body part and exercise (after handlers are attached)
        if (exercise) {
            // Set body part (use body_part name, not ID)
            exerciseRow.find('.exercise-body-part').val(exercise.body_part).trigger('change');
            
            // After body part is set, we need to wait for exercises to load, then set exercise name
            setTimeout(() => {
                const $exerciseSelect = exerciseRow.find('.exercise-name-select');
                
                // Try to find matching option (case-insensitive)
                let matchingOption = null;
                $exerciseSelect.find('option').each(function() {
                    const optionText = $(this).text().trim();
                    if (optionText.toLowerCase() === exerciseName.toLowerCase()) {
                        matchingOption = $(this);
                        return false; // break loop
                    }
                });
                
                if (matchingOption && matchingOption.length) {
                    // Found matching exercise, select it
                    $exerciseSelect.val(matchingOption.val());
                } else {
                    // Exercise not in list (custom exercise)
                    const $customInput = exerciseRow.find('.exercise-name-custom');
                    $exerciseSelect.val('new_custom').trigger('change');
                    $customInput.val(exerciseName)
                        .removeClass('hidden')
                        .prop('disabled', false);
                    $exerciseSelect.addClass('hidden');
                }
            }, 200); // Increased timeout to ensure exercises are loaded
        }
    }

    // Populate body parts dropdown for an exercise row
    function populateBodyPartsDropdown($select, selectedValue = '') {
        $select.empty().append('<option value="">Select body part...</option>');
        
        allBodyParts.forEach(bodyPartName => {
            // API returns array of strings (body part names)
            $select.append(`<option value="${RoutineUtils.escapeHtml(bodyPartName)}">${RoutineUtils.escapeHtml(bodyPartName)}</option>`);
        });
        
        if (selectedValue) {
            $select.val(selectedValue);
        }
    }

    // Attach event handlers for exercise row
    function attachExerciseRowEventHandlers($row) {
        // Body part change - load exercises for that body part
        $row.find('.exercise-body-part').on('change', function() {
            const bodyPartName = $(this).val();
            const $exerciseSelect = $row.find('.exercise-name-select');
            const $customInput = $row.find('.exercise-name-custom');
            
            // Toggle between strength and cardio fields
            if (bodyPartName === 'Cardio') {
                $row.find('.exercise-strength-fields').addClass('hidden');
                $row.find('.exercise-cardio-fields').removeClass('hidden');
            } else {
                $row.find('.exercise-strength-fields').removeClass('hidden');
                $row.find('.exercise-cardio-fields').addClass('hidden');
            }
            
            // Enable/disable exercise select based on body part selection
            if (bodyPartName) {
                // Body part selected - enable exercise select and load exercises
                $exerciseSelect.prop('disabled', false)
                    .removeClass('bg-gray-100 dark:bg-gray-800')
                    .addClass('bg-white dark:bg-gray-700');
                loadExercisesForBodyPart(bodyPartName, $exerciseSelect);
                
                // Hide and disable custom input if visible
                $customInput.addClass('hidden').prop('disabled', true);
                $exerciseSelect.removeClass('hidden');
            } else {
                // No body part selected - disable exercise select
                $exerciseSelect.prop('disabled', true)
                    .addClass('bg-gray-100 dark:bg-gray-800')
                    .removeClass('bg-white dark:bg-gray-700')
                    .empty()
                    .append('<option value="">Select body part first...</option>');
                
                // Hide and disable custom input
                $customInput.addClass('hidden').prop('disabled', true);
                $exerciseSelect.removeClass('hidden');
            }
        });
        
        // Exercise name select change - show custom input if needed
        $row.find('.exercise-name-select').on('change', function() {
            const value = $(this).val();
            const $customInput = $row.find('.exercise-name-custom');
            const bodyPartName = $row.find('.exercise-body-part').val();
            
            // Only allow custom input if body part is selected
            if (!bodyPartName) {
                $(this).val('');
                UIHelpers.showError('Please select a body part first');
                return;
            }
            
            if (value === 'new_custom') {
                // Show custom input and hide select
                $(this).addClass('hidden');
                $customInput.removeClass('hidden')
                    .prop('disabled', false)
                    .focus();
            } else {
                // Hide custom input if a standard/custom exercise is selected
                $customInput.addClass('hidden').prop('disabled', true);
            }
        });
        
        // Custom exercise name - allow going back to select
        $row.find('.exercise-name-custom').on('blur', function() {
            if (!$(this).val().trim()) {
                // If empty, go back to select
                $(this).addClass('hidden').prop('disabled', true);
                const $exerciseSelect = $row.find('.exercise-name-select');
                $exerciseSelect.removeClass('hidden').val('');
            }
        });
        
        // Prevent direct typing in custom input if body part not selected
        $row.find('.exercise-name-custom').on('focus', function() {
            const bodyPartName = $row.find('.exercise-body-part').val();
            if (!bodyPartName) {
                $(this).blur();
                UIHelpers.showError('Please select a body part first');
            }
        });
        
        // Remove exercise button
        $row.find('.remove-exercise-btn').on('click', function() {
            $row.fadeOut(300, function() {
                $(this).remove();
                // Show empty message if no exercises left
                if ($('#exercisesList').children().length === 0) {
                    $('#emptyExercises').show();
                }
            });
        });
    }

    // Load exercises for a specific body part
    async function loadExercisesForBodyPart(bodyPartName, $select) {
        try {
            const response = await $.ajax({
                url: `/workout/api/exercises/${encodeURIComponent(bodyPartName)}`,
                method: 'GET'
            });
            
            $select.empty().append('<option value="">Select exercise...</option>');
            
            // Add standard exercises
            if (response.standardExercises && response.standardExercises.length > 0) {
                const standardGroup = $('<optgroup label="Standard Exercises">');
                response.standardExercises.forEach(ex => {
                    standardGroup.append(`<option value="standard_${ex.standard_exercise_id}">${RoutineUtils.escapeHtml(ex.exercise_name)}</option>`);
                });
                $select.append(standardGroup);
            }
            
            // Add custom exercises
            if (response.customExercises && response.customExercises.length > 0) {
                const customGroup = $('<optgroup label="Your Custom Exercises">');
                response.customExercises.forEach(ex => {
                    customGroup.append(`<option value="custom_${ex.custom_exercise_id}">${RoutineUtils.escapeHtml(ex.exercise_name)}</option>`);
                });
                $select.append(customGroup);
            }
            
            // Add custom exercise option
            $select.append('<option value="new_custom">+ Add Custom Exercise</option>');
            
        } catch (error) {
            console.error('Error loading exercises for body part:', bodyPartName, error);
            UIHelpers.showError('Failed to load exercises');
        }
    }

    // Save routine
    async function saveRoutine() {
        // Clear previous validation errors
        FormValidation.clearAllErrors();
        
        const routineName = $('#routineName').val().trim();
        const routineDescription = $('#routineDescription').val().trim();
        const routineDateValue = $('#routineDate').val();
        
        // Validate routine name
        if (!routineName) {
            FormValidation.showFieldError('routineName', 'Routine name is required');
            UIHelpers.showError('Please enter a routine name');
            return;
        }
        
        if (routineName.length < 3) {
            FormValidation.showFieldError('routineName', 'Routine name must be at least 3 characters');
            UIHelpers.showError('Routine name is too short (min 3 characters)');
            return;
        }
        
        if (routineName.length > 100) {
            FormValidation.showFieldError('routineName', 'Routine name must not exceed 100 characters');
            UIHelpers.showError('Routine name is too long (max 100 characters)');
            return;
        }
        
        // Check for SQL injection/XSS in routine name
        const nameValidation = FormValidation.validateExerciseName(routineName);
        if (!nameValidation.isValid) {
            FormValidation.showFieldError('routineName', nameValidation.error);
            UIHelpers.showError(nameValidation.error);
            return;
        }
        
        // Validate routine description if provided
        if (routineDescription.length > 500) {
            FormValidation.showFieldError('routineDescription', 'Description must not exceed 500 characters');
            UIHelpers.showError('Description is too long (max 500 characters)');
            return;
        }
        
        // Check for XSS in description
        const xssPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe/i
        ];
        
        for (const pattern of xssPatterns) {
            if (pattern.test(routineDescription)) {
                FormValidation.showFieldError('routineDescription', 'Description contains invalid content');
                UIHelpers.showError('Description contains invalid characters');
                return;
            }
        }
        
        // Validate date
        if (!routineDateValue) {
            FormValidation.showFieldError('routineDate', 'Date is required');
            UIHelpers.showError('Please select a routine date');
            return;
        }
        
        const dateValidation = FormValidation.validateDate(routineDateValue);
        if (!dateValidation.isValid) {
            FormValidation.showFieldError('routineDate', dateValidation.error);
            UIHelpers.showError(dateValidation.error);
            return;
        }

        const exercises = [];
        let hasValidationError = false;
        
        $('.exercise-row').each(function(index) {
            const row = $(this);
            const bodyPart = row.find('.exercise-body-part').val();
            const exerciseSelect = row.find('.exercise-name-select');
            const exerciseCustomInput = row.find('.exercise-name-custom');
            
            let exerciseName = '';
            const selectedExerciseValue = exerciseSelect.val();
            
            if (selectedExerciseValue === 'new_custom') {
                exerciseName = exerciseCustomInput.val().trim();
                
                // Validate custom exercise name
                if (exerciseName) {
                    const nameValidation = FormValidation.validateExerciseName(exerciseName);
                    if (!nameValidation.isValid) {
                        UIHelpers.showError(`Exercise ${index + 1}: ${nameValidation.error}`);
                        hasValidationError = true;
                        return false; // Break loop
                    }
                    // Sanitize the name
                    exerciseName = FormValidation.sanitizeText(exerciseName, 100);
                }
            } else if (selectedExerciseValue) {
                // Extract exercise name from selected option text
                exerciseName = exerciseSelect.find('option:selected').text();
            }
            
            if (!bodyPart || !exerciseName) {
                return; // Skip incomplete exercises (optional in routines)
            }

            const isCardio = bodyPart === 'Cardio';
            const exercise = {
                body_part: bodyPart,
                exercise_name: exerciseName,
                exercise_type: isCardio ? 'cardio' : 'strength'
            };

            if (isCardio) {
                const duration = parseFloat(row.find('.exercise-duration').val()) || null;
                const intensity = row.find('.exercise-intensity').val() || null;
                
                // Validate cardio fields if provided
                if (duration !== null) {
                    const durationValidation = FormValidation.validateDuration(duration);
                    if (!durationValidation.isValid) {
                        UIHelpers.showError(`Exercise ${index + 1}: ${durationValidation.error}`);
                        hasValidationError = true;
                        return false; // Break loop
                    }
                }
                
                exercise.duration_minutes = duration;
                exercise.intensity = intensity;
            } else {
                const sets = parseInt(row.find('.exercise-sets').val()) || null;
                const reps = parseInt(row.find('.exercise-reps').val()) || null;
                const weight = parseFloat(row.find('.exercise-weight').val()) || null;
                const unit = row.find('.exercise-unit').val() || 'lb';
                
                // Validate strength fields if provided
                if (sets !== null) {
                    const setsValidation = FormValidation.validateSets(sets);
                    if (!setsValidation.isValid) {
                        UIHelpers.showError(`Exercise ${index + 1}: ${setsValidation.error}`);
                        hasValidationError = true;
                        return false;
                    }
                }
                
                if (reps !== null) {
                    const repsValidation = FormValidation.validateReps(reps);
                    if (!repsValidation.isValid) {
                        UIHelpers.showError(`Exercise ${index + 1}: ${repsValidation.error}`);
                        hasValidationError = true;
                        return false;
                    }
                }
                
                if (weight !== null) {
                    const weightValidation = FormValidation.validateWeight(weight, true);
                    if (!weightValidation.isValid) {
                        UIHelpers.showError(`Exercise ${index + 1}: ${weightValidation.error}`);
                        hasValidationError = true;
                        return false;
                    }
                }
                
                exercise.sets = sets;
                exercise.reps = reps;
                exercise.weight = weight;
                exercise.unit = unit;
            }

            exercises.push(exercise);
        });
        
        // Check if validation errors occurred
        if (hasValidationError) {
            return;
        }

        // When editing, allow updating metadata without exercises (exercises already in DB)
        // When creating, require at least one exercise
        if (exercises.length === 0 && !currentEditingRoutineId) {
            UIHelpers.showError('Please add at least one exercise');
            return;
        }

        // Sanitize all text inputs
        const sanitizedName = FormValidation.sanitizeText(routineName, 100);
        const sanitizedDescription = routineDescription ? FormValidation.sanitizeText(routineDescription, 500) : null;
        
        // ENFORCE PRIVACY SETTINGS - Final check before saving
        const wantsPublic = $('#routineVisibility').is(':checked');
        if (wantsPublic && !userPrivacySettings.showRoutinesToPublic) {
            showPrivacyError(
                'Cannot create public routine. Public routines are disabled in your privacy settings. ' +
                '<a href="/account" class="underline font-bold hover:text-red-200">Change in Account Settings →</a>'
            );
            return;
        }

        const routineData = {
            routine_name: sanitizedName,
            description: sanitizedDescription,
            routine_date: routineDateValue,
            visibility: wantsPublic ? 'public' : 'private'
        };
        
        // Only include exercises if we have any (for updates without exercise changes)
        if (exercises.length > 0) {
            routineData.exercises = exercises;
        }

        const csrfToken = getCsrfToken();
        if (csrfToken) {
            routineData.csrf_token = csrfToken;
        }

        try {
            if (currentEditingRoutineId) {
                // Update existing routine
                await $.ajax({
                    url: `/api/routines/${currentEditingRoutineId}`,
                    method: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify(routineData),
                    beforeSend: function(xhr) {
                        if (csrfToken) {
                            xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                        }
                    }
                });
                UIHelpers.showSuccess('Routine updated successfully!');
            } else {
                // Create new routine
                await $.ajax({
                    url: '/api/routines',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(routineData),
                    beforeSend: function(xhr) {
                        if (csrfToken) {
                            xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                        }
                    }
                });
                UIHelpers.showSuccess('Routine created successfully!');
            }
            
            closeRoutineModal();
            
            // Reload routines to refresh the UI with updated visibility
            await loadRoutines();
        } catch (error) {
            console.error('Error saving routine:', error);
            
            // Handle privacy restriction error specially
            if (error.responseJSON?.privacy_restriction) {
                showPrivacyError(
                    (error.responseJSON?.error || 'Cannot create public routine due to privacy settings.') +
                    ' <a href="/account" class="underline font-bold hover:text-red-200">Change in Account Settings →</a>'
                );
            } else {
                UIHelpers.showError(error.responseJSON?.error || 'Error saving routine. Please try again.');
            }
        }
    }

    // Edit routine
    function editRoutine(routineId) {
        const routine = routines.find(r => r.routine_id === routineId);
        if (routine) {
            openRoutineModal(routine);
        }
    }

    // Delete routine
    async function deleteRoutine(routineId) {
        const routine = routines.find(r => r.routine_id === routineId);
        if (!routine) return;
        
        const confirmed = await UIHelpers.confirmAction(
            `Are you sure you want to delete "${routine.routine_name}"?\nThis action cannot be undone.`,
            'Delete Routine',
            'Cancel'
        );
        if (!confirmed) {
            return;
        }

        try {
            const csrfToken = getCsrfToken();
            await $.ajax({
                url: `/api/routines/${routineId}`,
                method: 'DELETE',
                contentType: 'application/json',
                data: JSON.stringify({
                    csrf_token: csrfToken
                }),
                beforeSend: function(xhr) {
                    if (csrfToken) {
                        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                    }
                }
            });
            
            UIHelpers.showSuccess('Routine deleted successfully!');
            loadRoutines();
        } catch (error) {
            console.error('Error deleting routine:', error);
            UIHelpers.showError('Failed to delete routine. Please try again.');
        }
    }

    // Note: Start Workout button is now a direct link in the template
    // No JavaScript function needed for navigation
    
    // Note: Utility functions now provided by shared modules:
    // - RoutineUtils.escapeHtml(text)
    // - RoutineUtils.formatDateForInput(date)
    // - UIHelpers.showSuccess(message)
    // - UIHelpers.showError(message)
    // Loaded in my_routines.html via module script tags

    // Check if first time user and show hint
    function checkFirstTimeUser() {
        const hasSeenGuide = localStorage.getItem('routines_guide_seen');
        if (!hasSeenGuide) {
            // Show help guide modal automatically
            setTimeout(() => {
                $('#helpGuideModal').removeClass('hidden');
                localStorage.setItem('routines_guide_seen', 'true');
            }, 1000);
        }
    }

    // Detect duplicate routine names
    function detectDuplicateRoutines() {
        const routineNames = {};
        const duplicates = [];
        
        routines.forEach(r => {
            const name = r.routine_name.toLowerCase().trim();
            if (routineNames[name]) {
                if (!duplicates.includes(name)) {
                    duplicates.push(name);
                }
            } else {
                routineNames[name] = true;
            }
        });
        
        if (duplicates.length > 0) {
            $('#duplicateWarning').removeClass('hidden');
            const $list = $('#duplicateList');
            $list.empty();
            duplicates.forEach(name => {
                $list.append(`<div>• ${RoutineUtils.escapeHtml(name)}</div>`);
            });
        }
    }

    // Initialize tab switching
    function initTabSwitching() {
        $('.routine-tab').on('click', function() {
            const tabId = $(this).attr('id');
            
            // Update tab styling
            $('.routine-tab').removeClass('bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 border-2 border-indigo-300 dark:border-indigo-600 shadow-sm')
                            .addClass('bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 border-2 border-transparent');
            $('.routine-tab span:last-child').removeClass('bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300')
                                             .addClass('bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300');
            $('.routine-tab span:nth-child(2)').removeClass('text-gray-800 dark:text-gray-100')
                                               .addClass('text-gray-600 dark:text-gray-400');
            
            $(this).removeClass('bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 border-2 border-transparent')
                   .addClass('bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 border-2 border-indigo-300 dark:border-indigo-600 shadow-sm');
            $(this).find('span:last-child').removeClass('bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300')
                                            .addClass('bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300');
            $(this).find('span:nth-child(2)').removeClass('text-gray-600 dark:text-gray-400')
                                             .addClass('text-gray-800 dark:text-gray-100');
            
            // Show/hide sections
            $('.routine-section').addClass('hidden');
            if (tabId === 'myRoutinesTab') {
                $('#my-routines-section').removeClass('hidden');
            } else if (tabId === 'importedRoutinesTab') {
                $('#imported-routines-section').removeClass('hidden');
            }
        });
    }

    // Load routines from API
    async function loadRoutines() {
        try {
            const response = await $.ajax({
                url: '/api/routines',
                method: 'GET'
            });
            
            routines = response.routines || [];
            console.log('DEBUG: Loaded routines from API:', routines.length, 'routines');
            console.log('DEBUG: Routine IDs:', routines.map(r => r.routine_id));
            
            renderRoutines();
            detectDuplicateRoutines();
        } catch (error) {
            console.error('Error loading routines:', error);
            UIHelpers.showError('Failed to load routines');
        }
    }

    // Load body parts from API
    // Note: loadBodyParts() function is defined earlier (line 208)
    // Duplicate function removed to prevent conflicts

    // Render routines (separates my routines from imported)
    function renderRoutines() {
        console.log('DEBUG: renderRoutines() called with', routines.length, 'total routines');
        
        const myRoutinesContainer = $('#my-routines-container');
        const importedRoutinesContainer = $('#imported-routines-container');
        
        // Separate routines into my routines and imported routines
        const myRoutines = routines.filter(r => !r.is_imported);
        const importedRoutines = routines.filter(r => r.is_imported);
        
        console.log('DEBUG: Separated into:', myRoutines.length, 'my routines,', importedRoutines.length, 'imported');
        
        // Update count badges
        $('#myRoutinesCount').text(myRoutines.length);
        $('#importedRoutinesCount').text(importedRoutines.length);
        
        // Render My Routines
        if (myRoutines.length === 0) {
            myRoutinesContainer.html(`
                <div class="col-span-full text-center py-16">
                    <div class="inline-block p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-md mb-4">
                        <svg class="w-20 h-20 text-gray-400 dark:text-gray-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"/>
                        </svg>
                    </div>
                    <p class="text-lg sm:text-xl text-gray-700 dark:text-gray-300 font-bold mb-2">No Routines Yet</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Create your first workout routine to streamline your training</p>
                    <button id="createFirstRoutineBtn" class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-500 dark:to-blue-500 hover:from-indigo-700 hover:to-blue-700 dark:hover:from-indigo-600 dark:hover:to-blue-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Create Your First Routine
                    </button>
                </div>
            `);
            $('#createFirstRoutineBtn').on('click', function() {
                openRoutineModal();
            });
        } else {
            myRoutinesContainer.empty();
            renderRoutineCards(myRoutines, myRoutinesContainer);
        }
        
        // Render Imported Routines
        if (importedRoutines.length === 0) {
            importedRoutinesContainer.html(`
                <div class="col-span-full text-center py-12">
                    <div class="inline-block p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl shadow-md mb-4">
                        <svg class="w-16 h-16 text-blue-400 dark:text-blue-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                        </svg>
                    </div>
                    <p class="text-lg text-gray-600 dark:text-gray-400 mb-2">No Imported Routines</p>
                    <p class="text-sm text-gray-500 dark:text-gray-500">Import routines from other users using the "Import Code" button above</p>
                </div>
            `);
        } else {
            importedRoutinesContainer.empty();
            renderRoutineCards(importedRoutines, importedRoutinesContainer);
        }
    }

    // Render routine cards into a container (NEW TEMPLATE-BASED VERSION)
    function renderRoutineCards(routinesToRender, container) {
        routinesToRender.forEach(routine => {
            
            // Clone template and populate with data
            const $card = TemplateHelpers.cloneRoutineCardTemplate();
            TemplateHelpers.populateRoutineCard($card, routine);
            
            // Append to container
            container.append($card);
        });
        
        // Attach event handlers to the newly rendered cards
        attachRoutineCardEventHandlers(container);
    }
    
    /**
     * Attach event handlers to routine cards
     */
    function attachRoutineCardEventHandlers(container) {
        // Edit routine button
        container.find('.edit-routine-btn').off('click').on('click', function() {
            const routineId = $(this).data('routine-id');
            editRoutine(routineId);
        });

        // Delete routine button
        container.find('.delete-routine-btn').off('click').on('click', function() {
            const routineId = $(this).data('routine-id');
            deleteRoutine(routineId);
        });

        // Start workout button - Store routine in session then navigate
        container.find('.start-routine-btn').off('click').on('click', async function() {
            const routineId = $(this).data('routine-id');
            const $btn = $(this);
            
            // Disable button and show loading state
            $btn.prop('disabled', true).html(`
                <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <span>Loading...</span>
            `);
            
            try {
                const csrfToken = getCsrfToken();
                // Store routine in session (server-side, secure)
                await $.ajax({
                    url: `/api/routines/${routineId}/start-workout`,
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        csrf_token: csrfToken
                    }),
                    beforeSend: function(xhr) {
                        if (csrfToken) {
                            xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                        }
                    }
                });
                
                // Navigate to workout logger
                window.location.href = '/repLog';
            } catch (error) {
                console.error('Error starting workout:', error);
                UIHelpers.showError('Failed to start workout. Please try again.');
                
                // Re-enable button
                $btn.prop('disabled', false).html(`
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>Start Workout</span>
                `);
            }
        });
        
        // Collapsible routine cards
        container.find('.routine-header').off('click').on('click', function() {
            const $header = $(this);
            const $content = $header.closest('.routine-card').find('.routine-content');
            const $arrow = $header.find('.routine-arrow');
            
            if ($content.hasClass('hidden')) {
                // Expand
                $content.removeClass('hidden').slideDown(300);
                $arrow.css('transform', 'rotate(90deg)');
            } else {
                // Collapse
                $content.slideUp(300, function() {
                    $(this).addClass('hidden');
                });
                $arrow.css('transform', 'rotate(0deg)');
            }
        });
    }

    // Open routine modal (create or edit)
    function openRoutineModal(routine = null) {
        currentEditingRoutineId = routine ? routine.routine_id : null;
        $('#modalTitle').text(routine ? 'Edit Routine' : 'Create Routine');
        
        // Reset form
        $('#routineName').val(routine ? routine.routine_name : '');
        $('#routineDescription').val(routine ? (routine.description || '') : '');
        $('#exercisesList').empty();
        exerciseCounter = 0;
        
        // Set visibility checkbox (public = checked, private = unchecked)
        const isPublic = routine ? (routine.visibility === 'public') : false;
        $('#routineVisibility').prop('checked', isPublic);
        
        // Store original data for change detection
        originalRoutineData = {
            name: routine ? routine.routine_name : '',
            description: routine ? (routine.description || '') : '',
            visibility: isPublic,
            exerciseCount: routine && routine.exercises ? routine.exercises.length : 0
        };
        
        // Reset date to today if creating new, or keep current if editing
        if (!routine) {
            routineDate = new Date();
            $('#routineDate').val(RoutineUtils.formatDateForInput(routineDate));
        }
        
        // Populate load routine dropdown
        populateLoadRoutineDropdown();
        
        // Reset collapsible sections
        resetCollapsibleSections();
        
        // If editing, add existing exercises
        if (routine && routine.exercises) {
            routine.exercises.forEach(ex => {
                addExerciseRow(ex);
            });
            // Expand exercises section if editing
            expandExercisesSection();
        }
        
        $('#emptyExercises').toggle(!routine || !routine.exercises || routine.exercises.length === 0);
        
        // Disable save button initially if editing (no changes yet)
        if (currentEditingRoutineId) {
            $('#saveRoutineBtn').prop('disabled', true).addClass('opacity-50 cursor-not-allowed');
        } else {
            $('#saveRoutineBtn').prop('disabled', false).removeClass('opacity-50 cursor-not-allowed');
        }
        
        // Setup change listeners
        setupChangeDetection();
        
        $('#routineModal').removeClass('hidden');
    }
    
    // Setup change detection for modal fields
    function setupChangeDetection() {
        // Remove any existing listeners to avoid duplicates
        $('#routineName, #routineDescription, #routineVisibility').off('input change');
        
        function checkForChanges() {
            if (!currentEditingRoutineId || !originalRoutineData) {
                // Creating new routine - always enable save
                $('#saveRoutineBtn').prop('disabled', false).removeClass('opacity-50 cursor-not-allowed');
                return;
            }
            
            const currentName = $('#routineName').val().trim();
            const currentDesc = $('#routineDescription').val().trim();
            const currentVisibility = $('#routineVisibility').is(':checked');
            const currentExerciseCount = $('.exercise-row').length;
            
            let hasChanges = 
                currentName !== originalRoutineData.name ||
                currentDesc !== originalRoutineData.description ||
                currentVisibility !== originalRoutineData.visibility ||
                currentExerciseCount !== originalRoutineData.exerciseCount;
            
            // Check if any exercise field values have changed
            if (!hasChanges && originalRoutineData.exercises) {
                const currentExercises = [];
                $('.exercise-row').each(function() {
                    const $row = $(this);
                    const bodyPart = $row.find('.exercise-body-part').val();
                    const exerciseName = $row.find('.exercise-name-select').is(':visible') 
                        ? $row.find('.exercise-name-select option:selected').text()
                        : $row.find('.exercise-name-custom').val();
                    const sets = $row.find('.exercise-sets').val();
                    const reps = $row.find('.exercise-reps').val();
                    const weight = $row.find('.exercise-weight').val();
                    const unit = $row.find('.exercise-unit').val();
                    const duration = $row.find('.exercise-duration').val();
                    const intensity = $row.find('.exercise-intensity').val();
                    
                    currentExercises.push({
                        bodyPart,
                        exerciseName,
                        sets,
                        reps,
                        weight,
                        unit,
                        duration,
                        intensity
                    });
                });
                
                // Compare with original exercises
                if (currentExercises.length === originalRoutineData.exercises.length) {
                    for (let i = 0; i < currentExercises.length; i++) {
                        const current = currentExercises[i];
                        const original = originalRoutineData.exercises[i];
                        
                        if (current.bodyPart !== original.body_part ||
                            current.exerciseName !== original.exercise_name ||
                            current.sets !== String(original.sets || '') ||
                            current.reps !== String(original.reps || '') ||
                            current.weight !== String(original.weight || '') ||
                            current.unit !== (original.unit || 'lb') ||
                            current.duration !== String(original.duration_minutes || '') ||
                            current.intensity !== (original.intensity || '')) {
                            hasChanges = true;
                            break;
                        }
                    }
                }
            }
            
            if (hasChanges) {
                $('#saveRoutineBtn').prop('disabled', false).removeClass('opacity-50 cursor-not-allowed');
            } else {
                $('#saveRoutineBtn').prop('disabled', true).addClass('opacity-50 cursor-not-allowed');
            }
        }
        
        // Listen for changes on routine-level fields
        $('#routineName, #routineDescription').on('input', checkForChanges);
        $('#routineVisibility').on('change', checkForChanges);
        
        // Listen for changes on exercise fields (delegated to handle dynamically added rows)
        $('#exercisesList').on('input change', '.exercise-body-part, .exercise-name-select, .exercise-name-custom, .exercise-sets, .exercise-reps, .exercise-weight, .exercise-unit, .exercise-duration, .exercise-intensity', checkForChanges);
        
        // Also check when exercises are added/removed via MutationObserver
        const exerciseListObserver = new MutationObserver(checkForChanges);
        const exercisesList = document.getElementById('exercisesList');
        if (exercisesList) {
            exerciseListObserver.observe(exercisesList, { childList: true });
        }
    }
    
    // Populate load routine dropdown
    function populateLoadRoutineDropdown() {
        const $select = $('#loadRoutineSelect');
        $select.empty().append('<option value="">Select a routine to load...</option>');
        
        routines.forEach(routine => {
            // Don't include the routine we're currently editing
            if (routine.routine_id !== currentEditingRoutineId) {
                const exerciseCount = routine.exercises ? routine.exercises.length : 0;
                $select.append(`<option value="${routine.routine_id}">${RoutineUtils.escapeHtml(routine.routine_name)} (${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''})</option>`);
            }
        });
    }
    
    // Reset collapsible sections to collapsed state
    function resetCollapsibleSections() {
        // Load routine section - collapsed
        $('.load-routine-content').addClass('hidden').slideUp(0);
        $('.load-routine-arrow').css('transform', 'rotate(0deg)');
        
        // Exercises section - collapsed
        $('#exercisesListContainer').addClass('hidden').slideUp(0);
        $('.exercises-arrow').css('transform', 'rotate(0deg)');
    }
    
    // Expand exercises section
    function expandExercisesSection() {
        $('#exercisesListContainer').removeClass('hidden').slideDown(300);
        $('.exercises-arrow').css('transform', 'rotate(180deg)');
    }

    // Close routine modal
    function closeRoutineModal() {
        $('#routineModal').addClass('hidden');
        // Reset form
        $('#routineName').val('');
        $('#routineDescription').val('');
        $('#exercisesList').empty();
        currentEditingRoutineId = null;
    }

    // Add exercise row to the form
    function addExerciseRow(exercise = null) {
        exerciseCounter++;
        const exerciseId = `exercise-${exerciseCounter}`;
        const bodyPart = exercise ? exercise.body_part_id : '';
        const exerciseName = exercise ? exercise.exercise_name : '';
        const exerciseType = exercise ? exercise.exercise_type : 'strength';
        const isCardio = exerciseType === 'cardio';
        
        const exerciseRow = $(`
            <div class="exercise-row bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900/30 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-6 mb-4 shadow-md hover:shadow-lg transition-all" data-exercise-id="${exerciseId}">
                <!-- Exercise Header with Order Number -->
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-600">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-500 dark:from-indigo-600 dark:to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                            ${exerciseCounter}
                        </div>
                        <h4 class="text-base sm:text-lg font-bold text-gray-700 dark:text-gray-200">Exercise ${exerciseCounter}</h4>
                    </div>
                    <button type="button" class="remove-exercise-btn text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-all" data-exercise-id="${exerciseId}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>

                <!-- Body Part Selector -->
                <div class="mb-4">
                    <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Body Part / Type</label>
                    <select class="exercise-body-part w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-base text-gray-900 dark:text-gray-100" required>
                        <option value="">Select body part...</option>
                    </select>
                </div>

                <!-- Exercise Name -->
                <div class="mb-4">
                    <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Exercise Name</label>
                    <select class="exercise-name-select w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-base text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" disabled required>
                        <option value="">Select body part first...</option>
                    </select>
                    <input type="text" class="exercise-name-custom hidden w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-base text-gray-900 dark:text-gray-100" placeholder="Enter custom exercise name" disabled>
                </div>

                <!-- Strength Exercise Fields (Default) -->
                <div class="exercise-strength-fields ${isCardio ? 'hidden' : ''}">
                    <div class="grid grid-cols-2 gap-3 sm:gap-4 mb-3">
                        <div>
                            <label class="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sets</label>
                            <input type="number" class="exercise-sets w-full px-3 py-2 sm:px-4 sm:py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-base text-gray-900 dark:text-gray-100" min="1" value="${exercise?.sets || ''}">
                        </div>
                        <div>
                            <label class="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Reps</label>
                            <input type="number" class="exercise-reps w-full px-3 py-2 sm:px-4 sm:py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-base text-gray-900 dark:text-gray-100" min="1" value="${exercise?.reps || ''}">
                        </div>
                    </div>
                    <div class="w-full">
                        <label class="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Weight</label>
                        <div class="flex gap-2">
                            <input type="number" class="exercise-weight flex-1 px-3 py-2 sm:px-4 sm:py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-base text-gray-900 dark:text-gray-100" step="0.5" min="0" value="${exercise?.weight || ''}">
                            <select class="exercise-unit px-3 py-2 sm:px-4 sm:py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-base text-gray-900 dark:text-gray-100">
                                <option value="lb" ${exercise?.unit === 'lb' ? 'selected' : ''}>lbs</option>
                                <option value="kg" ${exercise?.unit === 'kg' ? 'selected' : ''}>kg</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Cardio Exercise Fields -->
                <div class="exercise-cardio-fields ${isCardio ? '' : 'hidden'}">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label class="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Duration (minutes)</label>
                            <input type="number" class="exercise-duration w-full px-3 py-2 sm:px-4 sm:py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-base text-gray-900 dark:text-gray-100" min="1" step="0.5" value="${exercise?.duration_minutes || ''}">
                        </div>
                        <div>
                            <label class="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Intensity</label>
                            <select class="exercise-intensity w-full px-3 py-2 sm:px-4 sm:py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-base text-gray-900 dark:text-gray-100">
                                <option value="">Select intensity...</option>
                                <option value="low" ${exercise?.intensity === 'low' ? 'selected' : ''}>Low</option>
                                <option value="moderate" ${exercise?.intensity === 'moderate' ? 'selected' : ''}>Moderate</option>
                                <option value="high" ${exercise?.intensity === 'high' ? 'selected' : ''}>High</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        $('#exercisesList').append(exerciseRow);
        $('#emptyExercises').hide();
        
        // Populate body parts dropdown
        populateBodyPartsDropdown(exerciseRow.find('.exercise-body-part'), bodyPart);
        
        // Attach event handlers for this row FIRST (before triggering changes)
        attachExerciseRowEventHandlers(exerciseRow);
        
        // If editing, pre-select body part and exercise (after handlers are attached)
        if (exercise) {
            // Set body part (use body_part name, not ID)
            exerciseRow.find('.exercise-body-part').val(exercise.body_part).trigger('change');
            
            // After body part is set, we need to wait for exercises to load, then set exercise name
            setTimeout(() => {
                const $exerciseSelect = exerciseRow.find('.exercise-name-select');
                
                // Try to find matching option (case-insensitive)
                let matchingOption = null;
                $exerciseSelect.find('option').each(function() {
                    const optionText = $(this).text().trim();
                    if (optionText.toLowerCase() === exerciseName.toLowerCase()) {
                        matchingOption = $(this);
                        return false; // break loop
                    }
                });
                
                if (matchingOption && matchingOption.length) {
                    // Found matching exercise, select it
                    $exerciseSelect.val(matchingOption.val());
                } else {
                    // Exercise not in list (custom exercise)
                    const $customInput = exerciseRow.find('.exercise-name-custom');
                    $exerciseSelect.val('new_custom').trigger('change');
                    $customInput.val(exerciseName)
                        .removeClass('hidden')
                        .prop('disabled', false);
                    $exerciseSelect.addClass('hidden');
                }
            }, 200); // Increased timeout to ensure exercises are loaded
        }
    }

    // Populate body parts dropdown for an exercise row
    function populateBodyPartsDropdown($select, selectedValue = '') {
        $select.empty().append('<option value="">Select body part...</option>');
        
        allBodyParts.forEach(bodyPartName => {
            // API returns array of strings (body part names)
            $select.append(`<option value="${RoutineUtils.escapeHtml(bodyPartName)}">${RoutineUtils.escapeHtml(bodyPartName)}</option>`);
        });
        
        if (selectedValue) {
            $select.val(selectedValue);
        }
    }

    // Attach event handlers for exercise row
    function attachExerciseRowEventHandlers($row) {
        // Body part change - load exercises for that body part
        $row.find('.exercise-body-part').on('change', function() {
            const bodyPartName = $(this).val();
            const $exerciseSelect = $row.find('.exercise-name-select');
            const $customInput = $row.find('.exercise-name-custom');
            
            // Toggle between strength and cardio fields
            if (bodyPartName === 'Cardio') {
                $row.find('.exercise-strength-fields').addClass('hidden');
                $row.find('.exercise-cardio-fields').removeClass('hidden');
            } else {
                $row.find('.exercise-strength-fields').removeClass('hidden');
                $row.find('.exercise-cardio-fields').addClass('hidden');
            }
            
            // Enable/disable exercise select based on body part selection
            if (bodyPartName) {
                // Body part selected - enable exercise select and load exercises
                $exerciseSelect.prop('disabled', false)
                    .removeClass('bg-gray-100 dark:bg-gray-800')
                    .addClass('bg-white dark:bg-gray-700');
                loadExercisesForBodyPart(bodyPartName, $exerciseSelect);
                
                // Hide and disable custom input if visible
                $customInput.addClass('hidden').prop('disabled', true);
                $exerciseSelect.removeClass('hidden');
            } else {
                // No body part selected - disable exercise select
                $exerciseSelect.prop('disabled', true)
                    .addClass('bg-gray-100 dark:bg-gray-800')
                    .removeClass('bg-white dark:bg-gray-700')
                    .empty()
                    .append('<option value="">Select body part first...</option>');
                
                // Hide and disable custom input
                $customInput.addClass('hidden').prop('disabled', true);
                $exerciseSelect.removeClass('hidden');
            }
        });
        
        // Exercise name select change - show custom input if needed
        $row.find('.exercise-name-select').on('change', function() {
            const value = $(this).val();
            const $customInput = $row.find('.exercise-name-custom');
            const bodyPartName = $row.find('.exercise-body-part').val();
            
            // Only allow custom input if body part is selected
            if (!bodyPartName) {
                $(this).val('');
                UIHelpers.showError('Please select a body part first');
                return;
            }
            
            if (value === 'new_custom') {
                // Show custom input and hide select
                $(this).addClass('hidden');
                $customInput.removeClass('hidden')
                    .prop('disabled', false)
                    .focus();
            } else {
                // Hide custom input if a standard/custom exercise is selected
                $customInput.addClass('hidden').prop('disabled', true);
            }
        });
        
        // Custom exercise name - allow going back to select
        $row.find('.exercise-name-custom').on('blur', function() {
            if (!$(this).val().trim()) {
                // If empty, go back to select
                $(this).addClass('hidden').prop('disabled', true);
                const $exerciseSelect = $row.find('.exercise-name-select');
                $exerciseSelect.removeClass('hidden').val('');
            }
        });
        
        // Prevent direct typing in custom input if body part not selected
        $row.find('.exercise-name-custom').on('focus', function() {
            const bodyPartName = $row.find('.exercise-body-part').val();
            if (!bodyPartName) {
                $(this).blur();
                UIHelpers.showError('Please select a body part first');
            }
        });
        
        // Remove exercise button
        $row.find('.remove-exercise-btn').on('click', function() {
            $row.fadeOut(300, function() {
                $(this).remove();
                // Show empty message if no exercises left
                if ($('#exercisesList').children().length === 0) {
                    $('#emptyExercises').show();
                }
            });
        });
    }

    // Load exercises for a specific body part
    async function loadExercisesForBodyPart(bodyPartName, $select) {
        try {
            const response = await $.ajax({
                url: `/workout/api/exercises/${encodeURIComponent(bodyPartName)}`,
                method: 'GET'
            });
            
            $select.empty().append('<option value="">Select exercise...</option>');
            
            // Add standard exercises
            if (response.standardExercises && response.standardExercises.length > 0) {
                const standardGroup = $('<optgroup label="Standard Exercises">');
                response.standardExercises.forEach(ex => {
                    standardGroup.append(`<option value="standard_${ex.standard_exercise_id}">${RoutineUtils.escapeHtml(ex.exercise_name)}</option>`);
                });
                $select.append(standardGroup);
            }
            
            // Add custom exercises
            if (response.customExercises && response.customExercises.length > 0) {
                const customGroup = $('<optgroup label="Your Custom Exercises">');
                response.customExercises.forEach(ex => {
                    customGroup.append(`<option value="custom_${ex.custom_exercise_id}">${RoutineUtils.escapeHtml(ex.exercise_name)}</option>`);
                });
                $select.append(customGroup);
            }
            
            // Add custom exercise option
            $select.append('<option value="new_custom">+ Add Custom Exercise</option>');
            
        } catch (error) {
            console.error('Error loading exercises for body part:', bodyPartName, error);
            UIHelpers.showError('Failed to load exercises');
        }
    }

    // Save routine
    async function saveRoutine() {
        // Clear previous validation errors
        FormValidation.clearAllErrors();
        
        const routineName = $('#routineName').val().trim();
        const routineDescription = $('#routineDescription').val().trim();
        const routineDateValue = $('#routineDate').val();
        
        // Validate routine name
        if (!routineName) {
            FormValidation.showFieldError('routineName', 'Routine name is required');
            UIHelpers.showError('Please enter a routine name');
            return;
        }
        
        if (routineName.length < 3) {
            FormValidation.showFieldError('routineName', 'Routine name must be at least 3 characters');
            UIHelpers.showError('Routine name is too short (min 3 characters)');
            return;
        }
        
        if (routineName.length > 100) {
            FormValidation.showFieldError('routineName', 'Routine name must not exceed 100 characters');
            UIHelpers.showError('Routine name is too long (max 100 characters)');
            return;
        }
        
        // Check for SQL injection/XSS in routine name
        const nameValidation = FormValidation.validateExerciseName(routineName);
        if (!nameValidation.isValid) {
            FormValidation.showFieldError('routineName', nameValidation.error);
            UIHelpers.showError(nameValidation.error);
            return;
        }
        
        // Validate routine description if provided
        if (routineDescription.length > 500) {
            FormValidation.showFieldError('routineDescription', 'Description must not exceed 500 characters');
            UIHelpers.showError('Description is too long (max 500 characters)');
            return;
        }
        
        // Check for XSS in description
        const xssPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe/i
        ];
        
        for (const pattern of xssPatterns) {
            if (pattern.test(routineDescription)) {
                FormValidation.showFieldError('routineDescription', 'Description contains invalid content');
                UIHelpers.showError('Description contains invalid characters');
                return;
            }
        }
        
        // Validate date
        if (!routineDateValue) {
            FormValidation.showFieldError('routineDate', 'Date is required');
            UIHelpers.showError('Please select a routine date');
            return;
        }
        
        const dateValidation = FormValidation.validateDate(routineDateValue);
        if (!dateValidation.isValid) {
            FormValidation.showFieldError('routineDate', dateValidation.error);
            UIHelpers.showError(dateValidation.error);
            return;
        }

        const exercises = [];
        let hasValidationError = false;
        
        $('.exercise-row').each(function(index) {
            const row = $(this);
            const bodyPart = row.find('.exercise-body-part').val();
            const exerciseSelect = row.find('.exercise-name-select');
            const exerciseCustomInput = row.find('.exercise-name-custom');
            
            let exerciseName = '';
            const selectedExerciseValue = exerciseSelect.val();
            
            if (selectedExerciseValue === 'new_custom') {
                exerciseName = exerciseCustomInput.val().trim();
                
                // Validate custom exercise name
                if (exerciseName) {
                    const nameValidation = FormValidation.validateExerciseName(exerciseName);
                    if (!nameValidation.isValid) {
                        UIHelpers.showError(`Exercise ${index + 1}: ${nameValidation.error}`);
                        hasValidationError = true;
                        return false; // Break loop
                    }
                    // Sanitize the name
                    exerciseName = FormValidation.sanitizeText(exerciseName, 100);
                }
            } else if (selectedExerciseValue) {
                // Extract exercise name from selected option text
                exerciseName = exerciseSelect.find('option:selected').text();
            }
            
            if (!bodyPart || !exerciseName) {
                return; // Skip incomplete exercises (optional in routines)
            }

            const isCardio = bodyPart === 'Cardio';
            const exercise = {
                body_part: bodyPart,
                exercise_name: exerciseName,
                exercise_type: isCardio ? 'cardio' : 'strength'
            };

            if (isCardio) {
                const duration = parseFloat(row.find('.exercise-duration').val()) || null;
                const intensity = row.find('.exercise-intensity').val() || null;
                
                // Validate cardio fields if provided
                if (duration !== null) {
                    const durationValidation = FormValidation.validateDuration(duration);
                    if (!durationValidation.isValid) {
                        UIHelpers.showError(`Exercise ${index + 1}: ${durationValidation.error}`);
                        hasValidationError = true;
                        return false; // Break loop
                    }
                }
                
                exercise.duration_minutes = duration;
                exercise.intensity = intensity;
            } else {
                const sets = parseInt(row.find('.exercise-sets').val()) || null;
                const reps = parseInt(row.find('.exercise-reps').val()) || null;
                const weight = parseFloat(row.find('.exercise-weight').val()) || null;
                const unit = row.find('.exercise-unit').val() || 'lb';
                
                // Validate strength fields if provided
                if (sets !== null) {
                    const setsValidation = FormValidation.validateSets(sets);
                    if (!setsValidation.isValid) {
                        UIHelpers.showError(`Exercise ${index + 1}: ${setsValidation.error}`);
                        hasValidationError = true;
                        return false;
                    }
                }
                
                if (reps !== null) {
                    const repsValidation = FormValidation.validateReps(reps);
                    if (!repsValidation.isValid) {
                        UIHelpers.showError(`Exercise ${index + 1}: ${repsValidation.error}`);
                        hasValidationError = true;
                        return false;
                    }
                }
                
                if (weight !== null) {
                    const weightValidation = FormValidation.validateWeight(weight, true);
                    if (!weightValidation.isValid) {
                        UIHelpers.showError(`Exercise ${index + 1}: ${weightValidation.error}`);
                        hasValidationError = true;
                        return false;
                    }
                }
                
                exercise.sets = sets;
                exercise.reps = reps;
                exercise.weight = weight;
                exercise.unit = unit;
            }

            exercises.push(exercise);
        });
        
        // Check if validation errors occurred
        if (hasValidationError) {
            return;
        }

        // When editing, allow updating metadata without exercises (exercises already in DB)
        // When creating, require at least one exercise
        if (exercises.length === 0 && !currentEditingRoutineId) {
            UIHelpers.showError('Please add at least one exercise');
            return;
        }

        // Sanitize all text inputs
        const sanitizedName = FormValidation.sanitizeText(routineName, 100);
        const sanitizedDescription = routineDescription ? FormValidation.sanitizeText(routineDescription, 500) : null;
        
        // ENFORCE PRIVACY SETTINGS - Final check before saving
        const wantsPublic = $('#routineVisibility').is(':checked');
        if (wantsPublic && !userPrivacySettings.showRoutinesToPublic) {
            showPrivacyError(
                'Cannot create public routine. Public routines are disabled in your privacy settings. ' +
                '<a href="/account" class="underline font-bold hover:text-red-200">Change in Account Settings →</a>'
            );
            return;
        }

        const routineData = {
            routine_name: sanitizedName,
            description: sanitizedDescription,
            routine_date: routineDateValue,
            visibility: wantsPublic ? 'public' : 'private'
        };
        
        // Only include exercises if we have any (for updates without exercise changes)
        if (exercises.length > 0) {
            routineData.exercises = exercises;
        }

        const csrfToken = getCsrfToken();
        if (csrfToken) {
            routineData.csrf_token = csrfToken;
        }

        try {
            if (currentEditingRoutineId) {
                // Update existing routine
                await $.ajax({
                    url: `/api/routines/${currentEditingRoutineId}`,
                    method: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify(routineData),
                    beforeSend: function(xhr) {
                        if (csrfToken) {
                            xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                        }
                    }
                });
                UIHelpers.showSuccess('Routine updated successfully!');
            } else {
                // Create new routine
                await $.ajax({
                    url: '/api/routines',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(routineData),
                    beforeSend: function(xhr) {
                        if (csrfToken) {
                            xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                        }
                    }
                });
                UIHelpers.showSuccess('Routine created successfully!');
            }
            
            closeRoutineModal();
            
            // Reload routines to refresh the UI with updated visibility
            await loadRoutines();
        } catch (error) {
            console.error('Error saving routine:', error);
            
            // Handle privacy restriction error specially
            if (error.responseJSON?.privacy_restriction) {
                showPrivacyError(
                    (error.responseJSON?.error || 'Cannot create public routine due to privacy settings.') +
                    ' <a href="/account" class="underline font-bold hover:text-red-200">Change in Account Settings →</a>'
                );
            } else {
                UIHelpers.showError(error.responseJSON?.error || 'Error saving routine. Please try again.');
            }
        }
    }

    // Edit routine
    function editRoutine(routineId) {
        const routine = routines.find(r => r.routine_id === routineId);
        if (routine) {
            openRoutineModal(routine);
        }
    }

    // Delete routine
    async function deleteRoutine(routineId) {
        const routine = routines.find(r => r.routine_id === routineId);
        if (!routine) return;
        
        const confirmed = await UIHelpers.confirmAction(
            `Are you sure you want to delete "${routine.routine_name}"?\nThis action cannot be undone.`,
            'Delete Routine',
            'Cancel'
        );
        if (!confirmed) {
            return;
        }

        try {
            const csrfToken = getCsrfToken();
            await $.ajax({
                url: `/api/routines/${routineId}`,
                method: 'DELETE',
                contentType: 'application/json',
                data: JSON.stringify({
                    csrf_token: csrfToken
                }),
                beforeSend: function(xhr) {
                    if (csrfToken) {
                        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                    }
                }
            });
            
            UIHelpers.showSuccess('Routine deleted successfully!');
            loadRoutines();
        } catch (error) {
            console.error('Error deleting routine:', error);
            UIHelpers.showError('Failed to delete routine. Please try again.');
        }
    }

    // Note: Start Workout button is now a direct link in the template
    // No JavaScript function needed for navigation
    
    // Note: Utility functions now provided by shared modules:
    // - RoutineUtils.escapeHtml(text)
    // - RoutineUtils.formatDateForInput(date)
    // - UIHelpers.showSuccess(message)
    // - UIHelpers.showError(message)
    // Loaded in my_routines.html via module script tags

    // Check if first time user and show hint
    function checkFirstTimeUser() {
        const hasSeenGuide = localStorage.getItem('routines_guide_seen');
        if (!hasSeenGuide) {
            // Show help guide modal automatically
            setTimeout(() => {
                $('#helpGuideModal').removeClass('hidden');
                localStorage.setItem('routines_guide_seen', 'true');
            }, 1000);
        }
    }

    // Detect duplicate routine names
    function detectDuplicateRoutines() {
        const routineNames = {};
        const duplicates = [];
        
        routines.forEach(r => {
            const name = r.routine_name.toLowerCase().trim();
            if (routineNames[name]) {
                if (!duplicates.includes(name)) {
                    duplicates.push(name);
                }
            } else {
                routineNames[name] = true;
            }
        });
        
        if (duplicates.length > 0) {
            $('#duplicateWarning').removeClass('hidden');
            const $list = $('#duplicateList');
            $list.empty();
            duplicates.forEach(name => {
                $list.append(`<div>• ${RoutineUtils.escapeHtml(name)}</div>`);
            });
        }
    }

    // Initialize tab switching
    function initTabSwitching() {
        $('.routine-tab').on('click', function() {
            const tabId = $(this).attr('id');
            
            // Update tab styling
            $('.routine-tab').removeClass('bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 border-2 border-indigo-300 dark:border-indigo-600 shadow-sm')
                            .addClass('bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 border-2 border-transparent');
            $('.routine-tab span:last-child').removeClass('bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300')
                                             .addClass('bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300');
            $('.routine-tab span:nth-child(2)').removeClass('text-gray-800 dark:text-gray-100')
                                               .addClass('text-gray-600 dark:text-gray-400');
            
            $(this).removeClass('bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 border-2 border-transparent')
                   .addClass('bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 border-2 border-indigo-300 dark:border-indigo-600 shadow-sm');
            $(this).find('span:last-child').removeClass('bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300')
                                            .addClass('bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300');
            $(this).find('span:nth-child(2)').removeClass('text-gray-600 dark:text-gray-400')
                                             .addClass('text-gray-800 dark:text-gray-100');
            
            // Show/hide sections
            $('.routine-section').addClass('hidden');
            if (tabId === 'myRoutinesTab') {
                $('#my-routines-section').removeClass('hidden');
            } else if (tabId === 'importedRoutinesTab') {
                $('#imported-routines-section').removeClass('hidden');
            }
        });
    }

    // Load routines from API
    async function loadRoutines() {
        try {
            const response = await $.ajax({
                url: '/api/routines',
                method: 'GET'
            });
            
            routines = response.routines || [];
            console.log('DEBUG: Loaded routines from API:', routines.length, 'routines');
            console.log('DEBUG: Routine IDs:', routines.map(r => r.routine_id));
            
            renderRoutines();
            detectDuplicateRoutines();
        } catch (error) {
            console.error('Error loading routines:', error);
            UIHelpers.showError('Failed to load routines');
        }
    }

    // Load body parts from API
    // Note: loadBodyParts() function is defined earlier (line 208)
    // Duplicate function removed to prevent conflicts

    // Render routines (separates my routines from imported)
    function renderRoutines() {
        console.log('DEBUG: renderRoutines() called with', routines.length, 'total routines');
        
        const myRoutinesContainer = $('#my-routines-container');
        const importedRoutinesContainer = $('#imported-routines-container');
        
        // Separate routines into my routines and imported routines
        const myRoutines = routines.filter(r => !r.is_imported);
        const importedRoutines = routines.filter(r => r.is_imported);
        
        console.log('DEBUG: Separated into:', myRoutines.length, 'my routines,', importedRoutines.length, 'imported');
        
        // Update count badges
        $('#myRoutinesCount').text(myRoutines.length);
        $('#importedRoutinesCount').text(importedRoutines.length);
        
        // Render My Routines
        if (myRoutines.length === 0) {
            myRoutinesContainer.html(`
                <div class="col-span-full text-center py-16">
                    <div class="inline-block p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-md mb-4">
                        <svg class="w-20 h-20 text-gray-400 dark:text-gray-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"/>
                        </svg>
                    </div>
                    <p class="text-lg sm:text-xl text-gray-700 dark:text-gray-300 font-bold mb-2">No Routines Yet</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Create your first workout routine to streamline your training</p>
                    <button id="createFirstRoutineBtn" class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-500 dark:to-blue-500 hover:from-indigo-700 hover:to-blue-700 dark:hover:from-indigo-600 dark:hover:to-blue-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Create Your First Routine
                    </button>
                </div>
            `);
            $('#createFirstRoutineBtn').on('click', function() {
                openRoutineModal();
            });
        } else {
            myRoutinesContainer.empty();
            renderRoutineCards(myRoutines, myRoutinesContainer);
        }
        
        // Render Imported Routines
        if (importedRoutines.length === 0) {
            importedRoutinesContainer.html(`
                <div class="col-span-full text-center py-12">
                    <div class="inline-block p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl shadow-md mb-4">
                        <svg class="w-16 h-16 text-blue-400 dark:text-blue-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                        </svg>
                    </div>
                    <p class="text-lg text-gray-600 dark:text-gray-400 mb-2">No Imported Routines</p>
                    <p class="text-sm text-gray-500 dark:text-gray-500">Import routines from other users using the "Import Code" button above</p>
                </div>
            `);
        } else {
            importedRoutinesContainer.empty();
            renderRoutineCards(importedRoutines, importedRoutinesContainer);
        }
    }

    // Render routine cards into a container (NEW TEMPLATE-BASED VERSION)
    function renderRoutineCards(routinesToRender, container) {
        routinesToRender.forEach(routine => {
            
            // Clone template and populate with data
            const $card = TemplateHelpers.cloneRoutineCardTemplate();
            TemplateHelpers.populateRoutineCard($card, routine);
            
            // Append to container
            container.append($card);
        });
        
        // Attach event handlers to the newly rendered cards
        attachRoutineCardEventHandlers(container);
    }
    
    /**
     * Attach event handlers to routine cards
     */
    function attachRoutineCardEventHandlers(container) {
        // Edit routine button
        container.find('.edit-routine-btn').off('click').on('click', function() {
            const routineId = $(this).data('routine-id');
            editRoutine(routineId);
        });

        // Delete routine button
        container.find('.delete-routine-btn').off('click').on('click', function() {
            const routineId = $(this).data('routine-id');
            deleteRoutine(routineId);
        });

        // Start workout button - Store routine in session then navigate
        container.find('.start-routine-btn').off('click').on('click', async function() {
            const routineId = $(this).data('routine-id');
            const $btn = $(this);
            
            // Disable button and show loading state
            $btn.prop('disabled', true).html(`
                <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <span>Loading...</span>
            `);
            
            try {
                const csrfToken = getCsrfToken();
                // Store routine in session (server-side, secure)
                await $.ajax({
                    url: `/api/routines/${routineId}/start-workout`,
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        csrf_token: csrfToken
                    }),
                    beforeSend: function(xhr) {
                        if (csrfToken) {
                            xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                        }
                    }
                });
                
                // Navigate to workout logger
                window.location.href = '/repLog';
            } catch (error) {
                console.error('Error starting workout:', error);
                UIHelpers.showError('Failed to start workout. Please try again.');
                
                // Re-enable button
                $btn.prop('disabled', false).html(`
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>Start Workout</span>
                `);
            }
        });
        
        // Collapsible routine cards
        container.find('.routine-header').off('click').on('click', function() {
            const $header = $(this);
            const $content = $header.closest('.routine-card').find('.routine-content');
            const $arrow = $header.find('.routine-arrow');
            
            if ($content.hasClass('hidden')) {
                // Expand
                $content.removeClass('hidden').slideDown(300);
                $arrow.css('transform', 'rotate(90deg)');
            } else {
                // Collapse
                $content.slideUp(300, function() {
                    $(this).addClass('hidden');
                });
                $arrow.css('transform', 'rotate(0deg)');
            }
        });
    }

    // Open routine modal (create or edit)
    // Note: openRoutineModal() function is defined earlier (line 411)
    // Duplicate function removed to prevent conflicts
    
    // Load routine from existing
    $('#loadRoutineBtn').on('click', async function() {
        const selectedRoutineId = parseInt($('#loadRoutineSelect').val());
        if (!selectedRoutineId) {
            UIHelpers.showError('Please select a routine to load');
            return;
        }
        
        const selectedRoutine = routines.find(r => r.routine_id === selectedRoutineId);
        if (!selectedRoutine) {
            UIHelpers.showError('Routine not found');
            return;
        }
        
        // Ask user if they want to edit the existing routine or create a new copy
        const userChoice = await UIHelpers.confirmAction(
            `Do you want to:\n\n` +
            `• Confirm: create a NEW routine (recommended)\n` +
            `• Cancel: edit the existing "${selectedRoutine.routine_name}" routine`,
            'Create Copy',
            'Edit Existing'
        );
        
        if (userChoice) {
            // Create new copy
            $('#routineName').val(`${selectedRoutine.routine_name} (Copy)`);
            $('#routineDescription').val(selectedRoutine.description || '');
            $('#routineVisibility').prop('checked', false); // Default to private for copies
            currentEditingRoutineId = null; // Important: This makes it create a NEW routine
        } else {
            // Edit existing
            currentEditingRoutineId = selectedRoutine.routine_id;
            $('#routineName').val(selectedRoutine.routine_name);
            $('#routineDescription').val(selectedRoutine.description || '');
            $('#routineVisibility').prop('checked', selectedRoutine.visibility === 'public');
        }
        
        // Clear existing exercises
        $('#exercisesList').empty();
        exerciseCounter = 0;
        
        // Load routine's exercises
        if (selectedRoutine.exercises && selectedRoutine.exercises.length > 0) {
            selectedRoutine.exercises.forEach(ex => {
                addExerciseRow(ex);
            });
            expandExercisesSection();
        }
        
        $('#emptyExercises').toggle(selectedRoutine.exercises.length === 0);
    });
    
    // Scan QR / Import Code modal
    $('#scanQRBtn').on('click', function() {
        $('#scanQRModal').removeClass('hidden');
    });

    $('#closeScanModal').on('click', function() {
        closeScanModal();
    });

    function closeScanModal() {
        $('#scanQRModal').addClass('hidden');
        $('#shareUrlInputManual').val('');
        $('#importPreview').addClass('hidden');
        pendingImportData = null;
    }

    // Pending import data
    let pendingImportData = null;

    // Import from URL
    $('#importFromUrlBtn').on('click', async function() {
        const shareUrl = $('#shareUrlInputManual').val().trim();
        if (!shareUrl) {
            UIHelpers.showError('Please enter a share URL');
            return;
        }

        // Extract share token from URL
        const urlParts = shareUrl.split('/');
        const shareToken = urlParts[urlParts.length - 1];

        try {
            const response = await $.ajax({
                url: `/api/routines/import/${shareToken}`,
                method: 'GET'
            });

            // Show import preview
            pendingImportData = response.routine;
            displayImportPreview(pendingImportData);

        } catch (error) {
            console.error('Error fetching routine:', error);
            const errorMsg = error.responseJSON?.error || 'Invalid share URL. Please check and try again.';
            UIHelpers.showError(errorMsg);
        }
    });

    function displayImportPreview(routine) {
        $('#importPreviewName').text(routine.routine_name);
        $('#importPreviewDesc').text(routine.description || 'No description');
        
        const $exercisesContainer = $('#importPreviewExercises');
        $exercisesContainer.empty();
        
        if (routine.exercises && routine.exercises.length > 0) {
            routine.exercises.forEach((ex, idx) => {
                const exerciseHtml = `
                    <div class="flex items-center gap-2 text-sm bg-white dark:bg-green-800/20 rounded-lg p-2">
                        <span class="text-green-700 dark:text-green-400 font-bold">${idx + 1}.</span>
                        <span class="text-green-800 dark:text-green-300">${RoutineUtils.escapeHtml(ex.exercise_name)}</span>
                        ${ex.sets && ex.reps ? 
                            `<span class="text-green-600 dark:text-green-400 ml-auto text-xs">${ex.sets}×${ex.reps}</span>` :
                            ex.duration_minutes ?
                            `<span class="text-green-600 dark:text-green-400 ml-auto text-xs">${ex.duration_minutes} min</span>` :
                            ''
                        }
                    </div>
                `;
                $exercisesContainer.append(exerciseHtml);
            });
        }
        
        $('#importPreview').removeClass('hidden');
    }

    // Confirm Import
    $('#confirmImportBtn').on('click', async function() {
        if (!pendingImportData || !pendingImportData.share_token) {
            UIHelpers.showError('No routine to import');
            return;
        }

        try {
            const csrfToken = getCsrfToken();
            await $.ajax({
                url: `/api/routines/import/${pendingImportData.share_token}`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    csrf_token: csrfToken
                }),
                beforeSend: function(xhr) {
                    if (csrfToken) {
                        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                    }
                }
            });

            UIHelpers.showSuccess(`Routine "${pendingImportData.routine_name}" imported successfully!`);
            closeScanModal();
            await loadRoutines(); // Reload routines list
            
        } catch (error) {
            console.error('Error importing routine:', error);
            const errorMsg = error.responseJSON?.error || 'Failed to import routine. Please try again.';
            UIHelpers.showError(errorMsg);
        }
    });

    // Cancel Import
    $('#cancelImportBtn').on('click', function() {
        $('#importPreview').addClass('hidden');
        pendingImportData = null;
    });

    // END OF TEMPLATE-BASED IMPLEMENTATION
}); 
