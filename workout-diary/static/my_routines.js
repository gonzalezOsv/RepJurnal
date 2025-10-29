$(document).ready(function() {
    let routines = [];
    let allBodyParts = [];
    let currentEditingRoutineId = null;
    let exerciseCounter = 0;
    let routineDate = new Date();

    // Initialize date picker with today's date
    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Set today's date in the date picker
    $('#routineDate').val(formatDateForInput(routineDate));

    // Today button handler
    $('#todayRoutineBtn').on('click', function() {
        routineDate = new Date();
        $('#routineDate').val(formatDateForInput(routineDate));
    });

    // Load routines and body parts on page load
    // Initialize tab switching
    initTabSwitching();
    
    // Load data
    loadRoutines();
    loadBodyParts();

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
            showError('Please select a routine to load');
            return;
        }
        
        const routine = routines.find(r => r.routine_id === routineId);
        if (!routine) {
            showError('Routine not found');
            return;
        }
        
        // Load routine data into form
        $('#routineName').val(routine.routine_name + ' (Modified)'); // Add suffix to indicate it's modified
        $('#routineDescription').val(routine.description || '');
        
        // Clear existing exercises and add loaded ones
        $('#exercisesList').empty();
        exerciseCounter = 0;
        currentEditingRoutineId = null; // Treat as new routine since we're modifying
        
        if (routine.exercises && routine.exercises.length > 0) {
            routine.exercises.forEach(ex => {
                addExerciseRow(ex);
            });
            expandExercisesSection();
            showSuccess(`Loaded "${routine.routine_name}" with ${routine.exercises.length} exercises. You can now modify or add more exercises.`);
        } else {
            showSuccess(`Loaded "${routine.routine_name}". No exercises found. Add exercises to customize.`);
            expandExercisesSection();
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
            renderRoutines();
        } catch (error) {
            console.error('Error loading routines:', error);
            showError('Error loading routines. Please refresh the page.');
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

    // Render routine cards into a container
    function renderRoutineCards(routinesToRender, container) {
        routinesToRender.forEach(routine => {
            const exerciseCount = routine.exercises ? routine.exercises.length : 0;
            const createdDate = routine.created_at ? new Date(routine.created_at).toLocaleDateString() : 'Unknown';
            const isImported = routine.is_imported || false;
            const importedFromUsername = routine.imported_from_username || null;
            
            // Different card styling for imported routines
            const cardBgClass = isImported 
                ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30' 
                : 'bg-white dark:bg-gray-800';
            const cardBorderClass = isImported
                ? 'border-2 border-blue-300 dark:border-blue-600 hover:border-blue-400 dark:hover:border-blue-500'
                : 'border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600';
            
            container.append(`
                <div class="routine-card ${cardBgClass} rounded-2xl shadow-lg ${cardBorderClass} hover:shadow-xl transition-all overflow-hidden">
                    <div class="p-6">
                        <!-- Routine Header - Clickable for expand/collapse -->
                        <div class="routine-header cursor-pointer flex items-start justify-between mb-4 pb-3 border-b-2 ${isImported ? 'border-blue-200 dark:border-blue-700' : 'border-gray-200 dark:border-gray-700'} hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors" data-routine-id="${routine.routine_id}">
                            <div class="flex-1 flex items-center gap-3">
                                <svg class="routine-arrow w-5 h-5 ${isImported ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} transition-transform duration-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                </svg>
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-2">
                                        <h3 class="text-xl font-bold ${isImported ? 'text-blue-900 dark:text-blue-100' : 'text-gray-800 dark:text-gray-100'}">${escapeHtml(routine.routine_name)}</h3>
                                        ${isImported ? `<span class="px-2.5 py-1 text-xs font-bold bg-blue-500 dark:bg-blue-600 text-white rounded-full shadow-sm">Imported</span>` : ''}
                                    </div>
                                    ${routine.description ? `<p class="text-sm ${isImported ? 'text-blue-800 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400'} mb-2">${escapeHtml(routine.description)}</p>` : ''}
                                    ${isImported && importedFromUsername ? `
                                        <div class="mb-2 p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-700">
                                            <div class="flex items-center gap-2">
                                                <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                                </svg>
                                                <span class="text-sm font-semibold text-blue-900 dark:text-blue-200">From:</span>
                                                <span class="text-base font-bold text-blue-700 dark:text-blue-300">${escapeHtml(importedFromUsername)}</span>
                                            </div>
                                        </div>
                                    ` : ''}
                                    <p class="text-xs ${isImported ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}">${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''} • Created ${createdDate}</p>
                                </div>
                            </div>
                            <div class="flex gap-2" onclick="event.stopPropagation()">
                                <button class="edit-routine-btn p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all" data-routine-id="${routine.routine_id}" title="Edit">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                </button>
                                <button class="delete-routine-btn p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all" data-routine-id="${routine.routine_id}" title="Delete">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <!-- Exercise Preview - Collapsible -->
                        <div class="routine-content hidden">
                            <div class="mb-4">
                                <p class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Exercises (${exerciseCount})</p>
                                <div class="space-y-2 max-h-64 overflow-y-auto">
                                    ${routine.exercises && routine.exercises.length > 0 ? 
                                        routine.exercises.map(ex => `
                                            <div class="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                                                <span class="text-blue-600 dark:text-blue-400 font-bold">${ex.exercise_order + 1}.</span>
                                                <span class="text-gray-700 dark:text-gray-300">${escapeHtml(ex.exercise_name)}</span>
                                                ${ex.exercise_type === 'strength' && ex.sets && ex.reps ? 
                                                    `<span class="text-gray-500 dark:text-gray-400 ml-auto">${ex.sets}×${ex.reps} ${ex.weight ? `@ ${ex.weight}${ex.unit || 'lbs'}` : ''}</span>` : ''}
                                                ${ex.exercise_type === 'cardio' && ex.duration_minutes ? 
                                                    `<span class="text-gray-500 dark:text-gray-400 ml-auto">${ex.duration_minutes} min</span>` : ''}
                                            </div>
                                        `).join('') : 
                                        '<p class="text-sm text-gray-500 dark:text-gray-400">No exercises</p>'
                                    }
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button class="share-routine-btn flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-500 dark:to-purple-600 hover:from-purple-700 hover:to-purple-800 dark:hover:from-purple-600 dark:hover:to-purple-700 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2" data-routine-id="${routine.routine_id}" title="Generate Code">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                                    </svg>
                                    Generate Code
                                </button>
                                <button class="start-routine-btn flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 dark:from-green-500 dark:to-green-600 hover:from-green-700 hover:to-green-800 dark:hover:from-green-600 dark:hover:to-green-700 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2" data-routine-id="${routine.routine_id}">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    Start Workout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        });
        
        // Attach event handlers to the newly rendered cards
        container.find('.edit-routine-btn').on('click', function() {
            const routineId = $(this).data('routine-id');
            editRoutine(routineId);
        });

        container.find('.delete-routine-btn').on('click', function() {
            const routineId = $(this).data('routine-id');
            deleteRoutine(routineId);
        });

        container.find('.start-routine-btn').on('click', function() {
            const routineId = $(this).data('routine-id');
            startRoutine(routineId);
        });

        container.find('.share-routine-btn').on('click', function() {
            const routineId = $(this).data('routine-id');
            shareRoutine(routineId);
        });
        
        // Collapsible routine cards
        container.find('.routine-header').on('click', function() {
            const routineCard = $(this).closest('.routine-card');
            const routineContent = routineCard.find('.routine-content');
            const arrow = $(this).find('.routine-arrow');
            
            if (routineContent.hasClass('hidden')) {
                // Expand
                routineContent.removeClass('hidden').slideDown(300);
                arrow.css('transform', 'rotate(90deg)');
            } else {
                // Collapse
                routineContent.slideUp(300, function() {
                    $(this).addClass('hidden');
                });
                arrow.css('transform', 'rotate(0deg)');
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
        
        // Reset date to today if creating new, or keep current if editing
        if (!routine) {
            routineDate = new Date();
            $('#routineDate').val(formatDateForInput(routineDate));
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
        $('#routineModal').removeClass('hidden');
    }
    
    // Populate load routine dropdown
    function populateLoadRoutineDropdown() {
        const $select = $('#loadRoutineSelect');
        $select.empty().append('<option value="">Select a routine to load...</option>');
        
        routines.forEach(routine => {
            // Don't include the routine we're currently editing
            if (routine.routine_id !== currentEditingRoutineId) {
                const exerciseCount = routine.exercises ? routine.exercises.length : 0;
                $select.append(`<option value="${routine.routine_id}">${escapeHtml(routine.routine_name)} (${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''})</option>`);
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
    
    // Collapse exercises section
    function collapseExercisesSection() {
        $('#exercisesListContainer').slideUp(300, function() {
            $(this).addClass('hidden');
        });
        $('.exercises-arrow').css('transform', 'rotate(0deg)');
    }

    // Close routine modal
    function closeRoutineModal() {
        $('#routineModal').addClass('hidden');
        currentEditingRoutineId = null;
        $('#routineForm')[0].reset();
        $('#exercisesList').empty();
        exerciseCounter = 0;
        $('#emptyExercises').show();
        routineDate = new Date();
        $('#routineDate').val(formatDateForInput(routineDate));
        $('#loadRoutineSelect').val('');
        resetCollapsibleSections();
    }

    // Add exercise row to form
    async function addExerciseRow(existingExercise = null) {
        exerciseCounter++;
        const exerciseId = `exercise-${exerciseCounter}`;
        const isCardio = existingExercise ? existingExercise.exercise_type === 'cardio' : false;
        const selectedBodyPart = existingExercise ? existingExercise.body_part : '';
        
        // Get body parts filtered by workout type (if needed)
        const bodyPartsOptions = allBodyParts.map(bp => 
            `<option value="${bp}" ${selectedBodyPart === bp ? 'selected' : ''}>${bp}</option>`
        ).join('');

        const exerciseRow = $(`
            <div class="exercise-row bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-600" data-exercise-id="${exerciseId}">
                <div class="flex items-start justify-between mb-3">
                    <span class="text-sm font-bold text-gray-700 dark:text-gray-300">Exercise ${exerciseCounter}</span>
                    <button type="button" class="remove-exercise-btn p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all" data-exercise-id="${exerciseId}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <div class="space-y-3">
                    <!-- Body Part -->
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Body Part</label>
                        <select class="exercise-body-part w-full px-3 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-base text-gray-900 dark:text-gray-100">
                            <option value="">Select Body Part</option>
                            ${bodyPartsOptions}
                        </select>
                    </div>

                    <!-- Exercise Name Dropdown (like repLogger) -->
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Exercise Name</label>
                        <select class="exercise-name-select w-full px-3 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-base text-gray-900 dark:text-gray-100" ${selectedBodyPart ? '' : 'disabled'}>
                            <option value="">Select Exercise</option>
                        </select>
                        <!-- Custom Exercise Input (hidden by default) -->
                        <input type="text" class="exercise-name-custom hidden w-full px-3 py-2.5 mt-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-base text-gray-900 dark:text-gray-100" 
                               placeholder="Enter custom exercise name">
                    </div>

                    <!-- Strength Fields -->
                    <div class="strength-fields ${isCardio ? 'hidden' : ''}">
                        <div class="space-y-3">
                            <!-- Sets and Reps on one row (stacked on mobile) -->
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Sets</label>
                                    <input type="number" class="exercise-sets w-full px-3 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-base text-center text-gray-900 dark:text-gray-100" 
                                           value="${existingExercise && existingExercise.sets ? existingExercise.sets : ''}" 
                                           placeholder="0"
                                           min="1">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Reps</label>
                                    <input type="number" class="exercise-reps w-full px-3 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-base text-center text-gray-900 dark:text-gray-100" 
                                           value="${existingExercise && existingExercise.reps ? existingExercise.reps : ''}" 
                                           placeholder="0"
                                           min="1">
                                </div>
                            </div>
                            <!-- Weight on its own row for better visibility -->
                            <div>
                                <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Weight</label>
                                <div class="flex gap-2">
                                    <input type="number" step="0.5" class="exercise-weight flex-1 px-3 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-base text-center text-gray-900 dark:text-gray-100" 
                                           value="${existingExercise && existingExercise.weight ? existingExercise.weight : ''}" 
                                           min="0" placeholder="0">
                                    <select class="exercise-unit w-20 px-2 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm font-bold text-gray-900 dark:text-gray-100">
                                        <option value="lb" ${existingExercise && existingExercise.unit === 'lb' ? 'selected' : ''}>lbs</option>
                                        <option value="kg" ${existingExercise && existingExercise.unit === 'kg' ? 'selected' : ''}>kg</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Cardio Fields -->
                    <div class="cardio-fields ${!isCardio ? 'hidden' : ''}">
                        <div class="space-y-3">
                            <div>
                                <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Duration (minutes)</label>
                                <input type="number" step="0.5" class="exercise-duration w-full px-3 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-base text-center text-gray-900 dark:text-gray-100" 
                                       value="${existingExercise && existingExercise.duration_minutes ? existingExercise.duration_minutes : ''}" 
                                       placeholder="0"
                                       min="0">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Intensity Level</label>
                                <select class="exercise-intensity w-full px-3 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-base text-gray-900 dark:text-gray-100">
                                    <option value="">Select Intensity</option>
                                    <option value="Low" ${existingExercise && existingExercise.intensity === 'Low' ? 'selected' : ''}>Low</option>
                                    <option value="Moderate" ${existingExercise && existingExercise.intensity === 'Moderate' ? 'selected' : ''}>Moderate</option>
                                    <option value="High" ${existingExercise && existingExercise.intensity === 'High' ? 'selected' : ''}>High</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `);

        $('#exercisesList').append(exerciseRow);
        $('#emptyExercises').hide();

        const row = exerciseRow;
        const bodyPartSelect = row.find('.exercise-body-part');
        const exerciseSelect = row.find('.exercise-name-select');
        const exerciseCustomInput = row.find('.exercise-name-custom');

        // Load exercises when body part changes
        bodyPartSelect.on('change', async function() {
            const bodyPart = $(this).val();
            const isCardio = bodyPart === 'Cardio';
            
            // Toggle fields based on body part
            row.find('.strength-fields').toggle(!isCardio);
            row.find('.cardio-fields').toggle(isCardio);
            
            // Load exercises if body part is selected
            if (bodyPart) {
                exerciseSelect.prop('disabled', false);
                exerciseSelect.empty().append('<option value="">Loading exercises...</option>');
                
                const exercises = await loadExercises(bodyPart);
                exerciseSelect.empty().append('<option value="">Select Exercise</option>');
                
                if (exercises.standardExercises && exercises.standardExercises.length > 0) {
                    const standardGroup = $('<optgroup label="Standard Exercises">');
                    exercises.standardExercises.forEach(exercise => {
                        const option = $(`<option value="standard_${exercise.standard_exercise_id}">${exercise.exercise_name}</option>`);
                        if (exercise.description) {
                            option.attr('title', exercise.description);
                        }
                        standardGroup.append(option);
                    });
                    exerciseSelect.append(standardGroup);
                }
                
                if (exercises.customExercises && exercises.customExercises.length > 0) {
                    const customGroup = $('<optgroup label="Your Custom Exercises">');
                    exercises.customExercises.forEach(exercise => {
                        customGroup.append(`<option value="custom_${exercise.custom_exercise_id}">${exercise.exercise_name}</option>`);
                    });
                    exerciseSelect.append(customGroup);
                }
                
                exerciseSelect.append('<option value="new_custom">+ Add Custom Exercise</option>');
                
                // If editing with existing exercise name, try to select it
                if (existingExercise && existingExercise.exercise_name) {
                    exerciseSelect.find('option').each(function() {
                        if ($(this).text() === existingExercise.exercise_name) {
                            $(this).prop('selected', true);
                        }
                    });
                }
            } else {
                exerciseSelect.prop('disabled', true);
                exerciseSelect.empty().append('<option value="">Select Body Part first</option>');
            }
        });

        // Handle exercise selection (including custom exercise input)
        exerciseSelect.on('change', function() {
            const selectedValue = $(this).val();
            if (selectedValue === 'new_custom') {
                exerciseCustomInput.removeClass('hidden');
                exerciseSelect.prop('disabled', true);
            } else {
                exerciseCustomInput.addClass('hidden');
                exerciseCustomInput.val('');
            }
        });

        // If editing with existing exercise, trigger body part change to load exercises
        if (existingExercise && selectedBodyPart) {
            bodyPartSelect.trigger('change');
        }

        // Remove exercise button
        row.find('.remove-exercise-btn').on('click', function() {
            row.remove();
            if ($('#exercisesList').children().length === 0) {
                $('#emptyExercises').show();
            }
        });
    }

    // Save routine
    async function saveRoutine() {
        const routineName = $('#routineName').val().trim();
        if (!routineName) {
            showError('Please enter a routine name');
            return;
        }

        const routineDateValue = $('#routineDate').val();
        if (!routineDateValue) {
            showError('Please select a routine date');
            return;
        }

        const exercises = [];
        $('.exercise-row').each(function() {
            const row = $(this);
            const bodyPart = row.find('.exercise-body-part').val();
            const exerciseSelect = row.find('.exercise-name-select');
            const exerciseCustomInput = row.find('.exercise-name-custom');
            
            let exerciseName = '';
            const selectedExerciseValue = exerciseSelect.val();
            
            if (selectedExerciseValue === 'new_custom') {
                exerciseName = exerciseCustomInput.val().trim();
            } else if (selectedExerciseValue) {
                // Extract exercise name from selected option text
                exerciseName = exerciseSelect.find('option:selected').text();
            }
            
            if (!bodyPart || !exerciseName) {
                return; // Skip incomplete exercises
            }

            const isCardio = bodyPart === 'Cardio';
            const exercise = {
                body_part: bodyPart,
                exercise_name: exerciseName,
                exercise_type: isCardio ? 'cardio' : 'strength'
            };

            if (isCardio) {
                exercise.duration_minutes = parseFloat(row.find('.exercise-duration').val()) || null;
                exercise.intensity = row.find('.exercise-intensity').val() || null;
            } else {
                exercise.sets = parseInt(row.find('.exercise-sets').val()) || null;
                exercise.reps = parseInt(row.find('.exercise-reps').val()) || null;
                exercise.weight = parseFloat(row.find('.exercise-weight').val()) || null;
                exercise.unit = row.find('.exercise-unit').val() || 'lb';
            }

            exercises.push(exercise);
        });

        if (exercises.length === 0) {
            showError('Please add at least one exercise');
            return;
        }

        const routineData = {
            routine_name: routineName,
            description: $('#routineDescription').val().trim() || null,
            routine_date: routineDateValue, // Include the date in the request
            exercises: exercises
        };

        try {
            if (currentEditingRoutineId) {
                // Update existing routine
                await $.ajax({
                    url: `/api/routines/${currentEditingRoutineId}`,
                    method: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify(routineData)
                });
                showSuccess('Routine updated successfully!');
            } else {
                // Create new routine
                await $.ajax({
                    url: '/api/routines',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(routineData)
                });
                showSuccess('Routine created successfully!');
            }
            
            closeRoutineModal();
            loadRoutines();
        } catch (error) {
            console.error('Error saving routine:', error);
            showError(error.responseJSON?.error || 'Error saving routine. Please try again.');
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

        if (!confirm(`Are you sure you want to delete "${routine.routine_name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await $.ajax({
                url: `/api/routines/${routineId}`,
                method: 'DELETE'
            });
            showSuccess('Routine deleted successfully!');
            loadRoutines();
        } catch (error) {
            console.error('Error deleting routine:', error);
            showError('Error deleting routine. Please try again.');
        }
    }

    // Start routine workout session
    function startRoutine(routineId) {
        const routine = routines.find(r => r.routine_id === routineId);
        if (!routine || !routine.exercises || routine.exercises.length === 0) {
            showError('This routine has no exercises');
            return;
        }

        // Open workout session modal
        openWorkoutSessionModal(routine);
    }

    // Open workout session modal
    function openWorkoutSessionModal(routine) {
        // Get today's date
        const today = formatDateForInput(new Date());
        
        // Create modal HTML
        const modalHtml = `
            <div id="workoutSessionModal" class="fixed inset-0 bg-black bg-opacity-60 dark:bg-black dark:bg-opacity-70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div class="bg-white dark:bg-gray-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl transform transition-all animate__animated animate__fadeInUp my-8">
                    <!-- Modal Header -->
                    <div class="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 dark:from-green-500 dark:to-green-600 px-6 py-5 flex justify-between items-center z-10">
                        <div class="flex items-center gap-3">
                            <div class="bg-white bg-opacity-20 p-2 rounded-lg">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </div>
                            <div>
                                <h3 class="text-2xl font-bold text-white">${escapeHtml(routine.routine_name)}</h3>
                                <p class="text-green-100 text-sm">Workout Session</p>
                            </div>
                        </div>
                        <button id="closeWorkoutSession" class="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-all">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    <!-- Modal Content -->
                    <div class="p-6 overflow-y-auto max-h-[calc(90vh-180px)] bg-white dark:bg-gray-800">
                        <!-- Progress Bar -->
                        <div class="mb-6">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-sm font-bold text-gray-700 dark:text-gray-300">Progress</span>
                                <span id="workoutProgress" class="text-sm font-bold text-green-600 dark:text-green-400">0/${routine.exercises.length}</span>
                            </div>
                            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                <div id="workoutProgressBar" class="bg-gradient-to-r from-green-600 to-green-700 dark:from-green-500 dark:to-green-600 h-3 rounded-full transition-all duration-300" style="width: 0%"></div>
                            </div>
                        </div>

                        <!-- Exercises List -->
                        <div id="workoutExercisesList" class="space-y-4">
                            ${routine.exercises.map((ex, index) => renderWorkoutExercise(ex, index)).join('')}
                        </div>
                    </div>

                    <!-- Modal Footer -->
                    <div class="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3">
                        <button id="finishWorkoutBtn" type="button" class="flex-1 px-6 py-3 bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                            </svg>
                            Finish Workout
                        </button>
                        <button id="cancelWorkoutSession" type="button" class="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold rounded-xl transition-all">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        $('body').append(modalHtml);
        
        // Initialize workout session - use closure to maintain state
        let completedExercises = 0;
        const totalExercises = routine.exercises.length;
        
        // Handle exercise completion
        $('#workoutExercisesList').off('change', '.exercise-complete-checkbox').on('change', '.exercise-complete-checkbox', async function() {
            const checkbox = $(this);
            const exerciseRow = checkbox.closest('.workout-exercise-row');
            const exerciseId = exerciseRow.data('exercise-id');
            const isComplete = checkbox.is(':checked');
            
            if (isComplete) {
                // Validate that exercise has required data
                const exerciseData = exerciseRow.data('exercise-data');
                const isCardio = exerciseData.exercise_type === 'cardio';
                
                if (isCardio) {
                    const durationInput = exerciseRow.find('.workout-duration').val();
                    const duration = durationInput ? parseFloat(durationInput) : exerciseData.duration_minutes;
                    if (!duration || duration <= 0) {
                        showError('Please enter duration before marking as complete');
                        checkbox.prop('checked', false);
                        return;
                    }
                } else {
                    // Validate sets and reps - use edited values or fall back to routine defaults
                    const setsInput = exerciseRow.find('.workout-sets').val();
                    const repsInput = exerciseRow.find('.workout-reps').val();
                    const sets = setsInput ? parseInt(setsInput) : exerciseData.sets;
                    const reps = repsInput ? parseInt(repsInput) : exerciseData.reps;
                    
                    if (!sets || sets < 1 || !reps || reps < 1) {
                        showError('Please enter sets and reps before marking as complete');
                        checkbox.prop('checked', false);
                        return;
                    }
                }
                
                // Save exercise to workout log
                try {
                    await saveExerciseToWorkout(exerciseRow, today);
                    exerciseRow.addClass('opacity-60');
                    exerciseRow.find('.workout-edit-btn').prop('disabled', true);
                    exerciseRow.css('background-color', 'rgba(240, 253, 244, 0.5)');
                    completedExercises++;
                    updateWorkoutProgress(completedExercises, totalExercises);
                    showSuccess('Exercise logged!');
                } catch (error) {
                    console.error('Error saving exercise:', error);
                    showError(error.responseJSON?.error || 'Error saving exercise. Please try again.');
                    checkbox.prop('checked', false);
                    return;
                }
            } else {
                exerciseRow.removeClass('opacity-60');
                exerciseRow.find('.workout-edit-btn').prop('disabled', false);
                exerciseRow.css('background-color', '');
                completedExercises--;
                updateWorkoutProgress(completedExercises, totalExercises);
            }
        });
        
        // Handle edit button
        $('#workoutExercisesList').off('click', '.workout-edit-btn').on('click', '.workout-edit-btn', function() {
            const exerciseRow = $(this).closest('.workout-exercise-row');
            const editBtn = $(this);
            const fieldsContainer = exerciseRow.find('.workout-fields-container');
            const isDisabled = editBtn.prop('disabled');
            
            if (isDisabled) return; // Don't allow editing if already completed
            
            if (fieldsContainer.hasClass('hidden')) {
                // Show edit fields
                fieldsContainer.removeClass('hidden');
                editBtn.html('<span class="text-xs font-bold">Done</span>');
            } else {
                // Hide edit fields
                fieldsContainer.addClass('hidden');
                editBtn.html('<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>');
            }
        });
        
        // Handle finish workout
        $('#finishWorkoutBtn').off('click').on('click', function() {
            // Check if all exercises are completed
            const totalExercises = routine.exercises.length;
            const completedCount = $('#workoutSessionModal .exercise-complete-checkbox:checked').length;
            const notCompleted = totalExercises - completedCount;
            
            // If not all exercises are completed, show confirmation
            if (notCompleted > 0) {
                const confirmMessage = `You have ${notCompleted} exercise${notCompleted > 1 ? 's' : ''} remaining. Finish workout anyway?`;
                if (!confirm(confirmMessage)) {
                    return; // User cancelled
                }
            }
            
            // Close modal and show success message
            closeWorkoutSessionModal();
            const message = completedCount === totalExercises 
                ? 'Workout completed! Great job!'
                : `Workout finished! You completed ${completedCount} of ${totalExercises} exercises.`;
            showSuccess(message);
            setTimeout(() => {
                window.location.href = '/repLog';
            }, 1500);
        });
        
        // Handle cancel
        $('#closeWorkoutSession, #cancelWorkoutSession').off('click').on('click', function() {
            if (confirm('Cancel workout session? Progress will not be saved.')) {
                closeWorkoutSessionModal();
            }
        });
        
        // Close on backdrop click
        $('#workoutSessionModal').off('click').on('click', function(e) {
            if (e.target === this) {
                if (confirm('Cancel workout session? Progress will not be saved.')) {
                    closeWorkoutSessionModal();
                }
            }
        });
    }
    
    // Render workout exercise row
    function renderWorkoutExercise(exercise, index) {
        const isCardio = exercise.exercise_type === 'cardio';
        
        return `
            <div class="workout-exercise-row bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-600 transition-all" data-exercise-id="${index}" data-exercise-data='${JSON.stringify(exercise)}'>
                <div class="flex items-start gap-4">
                    <!-- Checkbox -->
                    <div class="flex-shrink-0 pt-1">
                        <input type="checkbox" class="exercise-complete-checkbox w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-green-500" />
                    </div>
                    
                    <!-- Exercise Info -->
                    <div class="flex-1">
                        <div class="flex items-start justify-between mb-3">
                            <div>
                                <h4 class="text-lg font-bold text-gray-800 dark:text-gray-100">${escapeHtml(exercise.exercise_name)}</h4>
                                <p class="text-sm text-gray-600 dark:text-gray-400">${escapeHtml(exercise.body_part)}</p>
                            </div>
                            <button class="workout-edit-btn p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </button>
                        </div>
                        
                        <!-- Display Mode (default) -->
                        <div class="workout-display-mode">
                            ${isCardio ? `
                                <div class="space-y-2">
                                    ${exercise.duration_minutes ? `<p class="text-sm text-gray-700 dark:text-gray-300"><span class="font-semibold">Duration:</span> <span class="workout-display-duration">${exercise.duration_minutes}</span> min</p>` : ''}
                                    ${exercise.intensity ? `<p class="text-sm text-gray-700 dark:text-gray-300"><span class="font-semibold">Intensity:</span> <span class="workout-display-intensity">${exercise.intensity}</span></p>` : ''}
                                </div>
                            ` : `
                                <div class="grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                        <span class="text-gray-600 dark:text-gray-400 font-semibold">Sets:</span>
                                        <span class="workout-display-sets ml-1 font-bold text-gray-800 dark:text-gray-200">${exercise.sets || '--'}</span>
                                    </div>
                                    <div>
                                        <span class="text-gray-600 dark:text-gray-400 font-semibold">Reps:</span>
                                        <span class="workout-display-reps ml-1 font-bold text-gray-800 dark:text-gray-200">${exercise.reps || '--'}</span>
                                    </div>
                                    <div>
                                        <span class="text-gray-600 dark:text-gray-400 font-semibold">Weight:</span>
                                        <span class="workout-display-weight ml-1 font-bold text-gray-800 dark:text-gray-200">${exercise.weight ? `${exercise.weight}${exercise.unit || 'lbs'}` : '--'}</span>
                                    </div>
                                </div>
                            `}
                        </div>
                        
                        <!-- Edit Mode (hidden by default) -->
                        <div class="workout-fields-container hidden mt-3 space-y-3">
                            ${isCardio ? `
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Duration (min)</label>
                                        <input type="number" step="0.5" class="workout-duration w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100" 
                                               value="${exercise.duration_minutes || ''}" min="0">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Intensity</label>
                                        <select class="workout-intensity w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100">
                                            <option value="">Select</option>
                                            <option value="Low" ${exercise.intensity === 'Low' ? 'selected' : ''}>Low</option>
                                            <option value="Moderate" ${exercise.intensity === 'Moderate' ? 'selected' : ''}>Moderate</option>
                                            <option value="High" ${exercise.intensity === 'High' ? 'selected' : ''}>High</option>
                                        </select>
                                    </div>
                                </div>
                            ` : `
                                <div class="grid grid-cols-3 gap-2">
                                    <div>
                                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Sets</label>
                                        <input type="number" class="workout-sets w-full px-2 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" 
                                               value="${exercise.sets || ''}" min="1" placeholder="${exercise.sets || 'Enter sets'}">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Reps</label>
                                        <input type="number" class="workout-reps w-full px-2 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" 
                                               value="${exercise.reps || ''}" min="1" placeholder="${exercise.reps || 'Enter reps'}">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Weight</label>
                                        <div class="flex gap-1">
                                            <input type="number" step="0.5" class="workout-weight flex-1 px-2 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" 
                                                   value="${exercise.weight || ''}" min="0" placeholder="${exercise.weight || '0'}">
                                            <select class="workout-unit px-2 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400">
                                                <option value="lb" ${exercise.unit === 'lb' ? 'selected' : ''}>lbs</option>
                                                <option value="kg" ${exercise.unit === 'kg' ? 'selected' : ''}>kg</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <button type="button" class="update-exercise-display-btn w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition-all mt-2">
                                    Update Display
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Update workout progress
    function updateWorkoutProgress(completed, total) {
        const percentage = (completed / total) * 100;
        $('#workoutProgress').text(`${completed}/${total}`);
        $('#workoutProgressBar').css('width', `${percentage}%`);
        
        // Button is always enabled - user can finish early if needed
        // Visual feedback will show completion status
    }
    
    // Save exercise to workout log
    async function saveExerciseToWorkout(exerciseRow, date) {
        const exerciseData = exerciseRow.data('exercise-data');
        const isCardio = exerciseData.exercise_type === 'cardio';
        const bodyPart = exerciseData.body_part;
        const exerciseName = exerciseData.exercise_name;
        
        // Resolve exercise to standard or custom exercise ID
        let standardExerciseId = null;
        let customExerciseId = null;
        
        try {
            // Fetch exercises for this body part
            const exercisesResponse = await $.ajax({
                url: `/workout/api/exercises/${bodyPart}`,
                method: 'GET'
            });
            
            // Check if it's a standard exercise
            const standardMatch = exercisesResponse.standardExercises.find(
                ex => ex.exercise_name === exerciseName
            );
            
            if (standardMatch) {
                standardExerciseId = standardMatch.standard_exercise_id;
            } else {
                // Check if it's an existing custom exercise
                const customMatch = exercisesResponse.customExercises.find(
                    ex => ex.exercise_name === exerciseName
                );
                
                if (customMatch) {
                    customExerciseId = customMatch.custom_exercise_id;
                } else {
                    // Create new custom exercise
                    const customResponse = await $.ajax({
                        url: '/workout/api/custom-exercise',
                        method: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            bodyPart: bodyPart,
                            exerciseName: exerciseName
                        })
                    });
                    customExerciseId = customResponse.customExerciseId;
                }
            }
        } catch (error) {
            console.error('Error resolving exercise:', error);
            // Fall back to creating custom exercise if lookup fails
            try {
                const customResponse = await $.ajax({
                    url: '/workout/api/custom-exercise',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        bodyPart: bodyPart,
                        exerciseName: exerciseName
                    })
                });
                customExerciseId = customResponse.customExerciseId;
            } catch (createError) {
                console.error('Error creating custom exercise:', createError);
                throw new Error('Failed to resolve exercise. Please try again.');
            }
        }
        
        let exerciseLogData = {
            date: date,
            bodyPart: bodyPart,
            exerciseName: exerciseName,
            exercise_type: exerciseData.exercise_type
        };
        
        // Add exercise IDs
        if (standardExerciseId) {
            exerciseLogData.standardExerciseId = standardExerciseId;
        } else if (customExerciseId) {
            exerciseLogData.customExerciseId = customExerciseId;
        }
        
        if (isCardio) {
            const durationInput = exerciseRow.find('.workout-duration').val();
            const intensity = exerciseRow.find('.workout-intensity').val();
            
            exerciseLogData.duration_minutes = durationInput ? parseFloat(durationInput) : (exerciseData.duration_minutes || null);
            exerciseLogData.intensity = intensity || exerciseData.intensity || null;
        } else {
            // Use edited values or fall back to routine defaults
            const setsInput = exerciseRow.find('.workout-sets').val();
            const repsInput = exerciseRow.find('.workout-reps').val();
            const weightInput = exerciseRow.find('.workout-weight').val();
            const unitInput = exerciseRow.find('.workout-unit').val();
            
            const sets = setsInput ? parseInt(setsInput) : (exerciseData.sets || 1);
            const reps = repsInput ? parseInt(repsInput) : (exerciseData.reps || 1);
            const weight = weightInput ? parseFloat(weightInput) : (exerciseData.weight || 0);
            const unit = unitInput || exerciseData.unit || 'lb';
            
            exerciseLogData.sets = sets;
            exerciseLogData.reps = reps;
            exerciseLogData.weight = weight;
            exerciseLogData.unit = unit;
        }
        
        await $.ajax({
            url: '/workout/api/exercise_log',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(exerciseLogData)
        });
    }
    
    // Close workout session modal
    function closeWorkoutSessionModal() {
        $('#workoutSessionModal').addClass('animate__fadeOut');
        setTimeout(() => {
            $('#workoutSessionModal').remove();
        }, 300);
    }
    
    // Handle update display button (delegated event)
    $(document).off('click', '#workoutSessionModal .update-exercise-display-btn').on('click', '#workoutSessionModal .update-exercise-display-btn', function() {
        const exerciseRow = $(this).closest('.workout-exercise-row');
        const sets = exerciseRow.find('.workout-sets').val();
        const reps = exerciseRow.find('.workout-reps').val();
        const weight = exerciseRow.find('.workout-weight').val();
        const unit = exerciseRow.find('.workout-unit').val();
        
        exerciseRow.find('.workout-display-sets').text(sets || '--');
        exerciseRow.find('.workout-display-reps').text(reps || '--');
        exerciseRow.find('.workout-display-weight').text(weight ? `${weight}${unit}` : '--');
        
        exerciseRow.find('.workout-fields-container').addClass('hidden');
        exerciseRow.find('.workout-edit-btn').html('<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>');
    });

    // Utility functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showError(message) {
        const notification = $(`
            <div class="fixed top-4 right-4 z-50 bg-red-100 dark:bg-red-900/50 border-2 border-red-400 dark:border-red-700 text-red-800 dark:text-red-200 px-6 py-4 rounded-xl shadow-lg animate__animated animate__fadeInDown">
                <div class="flex items-center gap-3">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span class="font-semibold">${escapeHtml(message)}</span>
                </div>
            </div>
        `);
        $('body').append(notification);
        setTimeout(() => {
            notification.fadeOut(() => notification.remove());
        }, 4000);
    }

    function showSuccess(message) {
        const notification = $(`
            <div class="fixed top-4 right-4 z-50 bg-green-100 dark:bg-green-900/50 border-2 border-green-400 dark:border-green-700 text-green-800 dark:text-green-200 px-6 py-4 rounded-xl shadow-lg animate__animated animate__fadeInDown">
                <div class="flex items-center gap-3">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    <span class="font-semibold">${escapeHtml(message)}</span>
                </div>
            </div>
        `);
        $('body').append(notification);
        setTimeout(() => {
            notification.fadeOut(() => notification.remove());
        }, 3000);
    }

    // ===================================
    // QR CODE SHARING FUNCTIONALITY
    // ===================================
    
    let currentSharingRoutineId = null;
    let pendingImportData = null;

    // Share Routine Function
    async function shareRoutine(routineId) {
        currentSharingRoutineId = routineId;
        const modal = $('#shareRoutineModal');
        modal.removeClass('hidden');
        
        // Show loading, hide content
        $('#shareLoading').removeClass('hidden');
        $('#shareContent').addClass('hidden');
        
        try {
            // Generate or get share token
            const response = await $.ajax({
                url: `/api/routines/${routineId}/share-token`,
                method: 'POST',
                contentType: 'application/json'
            });
            
            const shareUrl = response.share_url;
            
            // QR code generation hidden for now
            // Can be re-enabled later if needed
            
            // Set share URL in input
            $('#shareUrlInput').val(shareUrl);
            
            // Show content, hide loading
            $('#shareLoading').addClass('hidden');
            $('#shareContent').removeClass('hidden');
            
        } catch (error) {
            console.error('Error generating share token:', error);
            showError('Failed to generate share link. Please try again.');
            closeShareModal();
        }
    }

    // Close Share Modal
    function closeShareModal() {
        $('#shareRoutineModal').addClass('hidden');
        currentSharingRoutineId = null;
        $('#shareLoading').removeClass('hidden');
        $('#shareContent').addClass('hidden');
    }

    // Copy Share URL
    $('#copyShareUrlBtn').on('click', function() {
        const shareUrlInput = $('#shareUrlInput');
        shareUrlInput[0].select();
        shareUrlInput[0].setSelectionRange(0, 99999); // For mobile
        
        try {
            document.execCommand('copy');
            showSuccess('Share link copied to clipboard!');
        } catch (err) {
            // Fallback: Use Clipboard API
            navigator.clipboard.writeText(shareUrlInput.val()).then(() => {
                showSuccess('Share link copied to clipboard!');
            }).catch(() => {
                showError('Failed to copy link. Please copy manually.');
            });
        }
    });

    // Revoke Share Token
    $('#revokeShareBtn').on('click', async function() {
        if (!currentSharingRoutineId) return;
        
        if (!confirm('Are you sure you want to stop sharing this routine? Others will no longer be able to access it.')) {
            return;
        }
        
        try {
            await $.ajax({
                url: `/api/routines/${currentSharingRoutineId}/share-token`,
                method: 'DELETE'
            });
            
            showSuccess('Sharing stopped successfully');
            closeShareModal();
        } catch (error) {
            console.error('Error revoking share token:', error);
            showError('Failed to stop sharing. Please try again.');
        }
    });

    // Share Modal Close Handlers
    $('#closeShareModal, #shareRoutineModal').on('click', function(e) {
        if (e.target === this || $(e.target).closest('#closeShareModal').length) {
            closeShareModal();
        }
    });

    // ===================================
    // SCAN/IMPORT QR CODE FUNCTIONALITY
    // ===================================

    // Open Scan QR Modal
    $('#scanQRBtn').on('click', function() {
        $('#scanQRModal').removeClass('hidden');
        $('#shareUrlInputManual').val('');
        $('#importPreview').addClass('hidden');
        pendingImportData = null;
    });

    // Close Scan Modal
    function closeScanModal() {
        $('#scanQRModal').addClass('hidden');
        $('#shareUrlInputManual').val('');
        $('#importPreview').addClass('hidden');
        pendingImportData = null;
    }

    // Scan Modal Close Handlers
    $('#closeScanModal, #scanQRModal').on('click', function(e) {
        if (e.target === this || $(e.target).closest('#closeScanModal').length) {
            closeScanModal();
        }
    });

    // Import from URL
    async function importFromUrl(url) {
        // Extract token from URL
        const tokenMatch = url.match(/\/share\/routine\/([a-zA-Z0-9_-]{32})/);
        if (!tokenMatch) {
            showError('Invalid share URL format. Please check the URL.');
            return;
        }
        
        const token = tokenMatch[1];
        
        try {
            // Fetch shared routine data
            const response = await $.ajax({
                url: `/share/routine/${token}`,
                method: 'GET'
            });
            
            // Store for import (include creator username if available)
            pendingImportData = response;
            
            // Show preview
            $('#importPreviewName').text(response.routine_name);
            let previewDesc = response.description || 'No description';
            if (response.creator_username) {
                previewDesc += ` • Created by ${response.creator_username}`;
            }
            $('#importPreviewDesc').text(previewDesc);
            
            // Render exercises preview
            const exercisesHtml = response.exercises.map((ex, idx) => {
                let details = '';
                if (ex.exercise_type === 'strength') {
                    details = `${ex.sets || '--'}×${ex.reps || '--'} ${ex.weight ? `@ ${ex.weight}${ex.unit || 'lbs'}` : ''}`;
                } else {
                    details = ex.duration_minutes ? `${ex.duration_minutes} min` : 'Cardio';
                }
                return `
                    <div class="flex items-center gap-2 text-sm bg-white dark:bg-gray-800 rounded-lg p-2">
                        <span class="text-green-600 dark:text-green-400 font-bold">${idx + 1}.</span>
                        <span class="text-gray-700 dark:text-gray-300">${escapeHtml(ex.exercise_name)}</span>
                        <span class="text-gray-500 dark:text-gray-400 ml-auto">${details}</span>
                    </div>
                `;
            }).join('');
            
            $('#importPreviewExercises').html(exercisesHtml || '<p class="text-sm text-gray-500 dark:text-gray-400">No exercises</p>');
            $('#importPreview').removeClass('hidden');
            
        } catch (error) {
            console.error('Error fetching shared routine:', error);
            if (error.status === 404) {
                showError('Routine not found or no longer available');
            } else {
                showError('Failed to load shared routine. Please check the URL.');
            }
        }
    }

    // Import from URL Button
    $('#importFromUrlBtn').on('click', async function() {
        const url = $('#shareUrlInputManual').val().trim();
        if (!url) {
            showError('Please enter a share URL');
            return;
        }
        
        await importFromUrl(url);
    });

    // Allow Enter key to trigger import
    $('#shareUrlInputManual').on('keypress', function(e) {
        if (e.which === 13) { // Enter key
            $('#importFromUrlBtn').click();
        }
    });

    // Confirm Import
    $('#confirmImportBtn').on('click', async function() {
        if (!pendingImportData) {
            showError('No routine data to import');
            return;
        }
        
        try {
            const response = await $.ajax({
                url: '/api/routines/import',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(pendingImportData)
            });
            
            showSuccess(`Routine "${pendingImportData.routine_name}" imported successfully!`);
            closeScanModal();
            await loadRoutines(); // Reload routines list
            
        } catch (error) {
            console.error('Error importing routine:', error);
            const errorMsg = error.responseJSON?.error || 'Failed to import routine. Please try again.';
            showError(errorMsg);
        }
    });

    // Cancel Import
    $('#cancelImportBtn').on('click', function() {
        $('#importPreview').addClass('hidden');
        pendingImportData = null;
    });
});

