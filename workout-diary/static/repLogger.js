$(document).ready(function () {
    const workoutTypeSelect = $('#workout-type');
    const bodyPartSelect = $('#body-part');
    const exerciseSelect = $('#exercise');
    let customExerciseInput = null;
    let selectedDate = new Date();
    let allBodyParts = []; // Store all body parts for filtering
    let routines = []; // Store loaded routines
    let loadedRoutine = null; // Currently loaded routine
    let routineCompletedCount = 0; // Count of completed routine exercises

    // Set today's date in the date picker
    const datePicker = $('#workout-date-picker');
    datePicker.val(formatDateForInput(selectedDate));
    updateDisplayDate();

    // Load body parts, routines, and logged sets on page load
    loadBodyParts();
    loadRoutines();
    loadLoggedSets();
    
    // Initialize scroll-to-add-exercise button
    initScrollToAddExerciseButton();
    
    // Collapsible sections
    initCollapsibleSections();
    
    // Routine loading functionality
    initRoutineLoading();

    // Handle date picker change
    datePicker.on('change', function() {
        selectedDate = new Date($(this).val() + 'T00:00:00');
        updateDisplayDate();
        loadLoggedSets();
    });

    // Handle "Today" button click
    $('#today-btn').on('click', function(e) {
        e.preventDefault();
        selectedDate = new Date();
        datePicker.val(formatDateForInput(selectedDate));
        updateDisplayDate();
        loadLoggedSets();
    });

    function updateDisplayDate() {
        const displayDate = selectedDate.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
        $('#display-date').text(displayDate);
    }

    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getSelectedDate() {
        return selectedDate;
    }

    async function loadBodyParts() {
        try {
            const response = await $.get('/workout/api/bodyparts');
            allBodyParts = response; // Store all body parts
            // Body parts will be filtered based on workout type selection
            filterBodyPartsByWorkoutType();
        } catch (error) {
            console.error('Error loading body parts:', error);
            showError('Error loading body parts. Please refresh the page.');
        }
    }
    
    // Define workout type categories
    const workoutTypeCategories = {
        strength: [
            'Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 
            'Forearms', 'Abs', 'Glutes', 'Calves', 'Neck', 'Traps', 
            'Lats', 'Quads', 'Hamstrings', 'Deltoids', 'Obliques', 
            'Lower Back', 'Upper Back', 'Inner Thighs', 'Outer Thighs', 
            'Serratus Anterior', 'Erector Spinae', 'Rotator Cuff', 
            'Adductors', 'Abductors', 'Full Body', 'Core', 'Compound', 
            'Rear Delts', 'Pecs'
        ],
        cardio: [
            'Cardio'
        ],
        flexibility: [
            'Flexibility', 'Mobility', 'Core'  // Core can be in both
        ],
        other: []  // Show all if "Other" is selected
    };
    
    // Filter body parts based on selected workout type
    function filterBodyPartsByWorkoutType() {
        const selectedWorkoutType = workoutTypeSelect.val();
        bodyPartSelect.empty();
        
        if (!selectedWorkoutType) {
            bodyPartSelect.append('<option value="">Select Body Part</option>');
            bodyPartSelect.prop('disabled', true);
            if (!bodyPartSelect.next('p').length) {
                bodyPartSelect.after('<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Select workout type first</p>');
            }
            return;
        }
        
        bodyPartSelect.prop('disabled', false);
        bodyPartSelect.next('p').remove(); // Remove helper text
        
        bodyPartSelect.append('<option value="">Select Body Part</option>');
        
        let filteredBodyParts;
        if (selectedWorkoutType === 'other') {
            // Show all body parts for "Other"
            filteredBodyParts = allBodyParts;
        } else {
            // Filter based on workout type category
            const allowedParts = workoutTypeCategories[selectedWorkoutType] || [];
            filteredBodyParts = allBodyParts.filter(part => allowedParts.includes(part));
        }
        
        filteredBodyParts.forEach(bodyPart => {
            bodyPartSelect.append(`<option value="${bodyPart}">${bodyPart}</option>`);
        });
        
        // If workout type is cardio, automatically set body part to "Cardio"
        if (selectedWorkoutType === 'cardio' && filteredBodyParts.includes('Cardio')) {
            bodyPartSelect.val('Cardio');
            bodyPartSelect.trigger('change');
        }
        
        // Reset exercise select when body parts change
        resetExerciseSelect();
    }
    
    // Handle workout type selection
    workoutTypeSelect.on('change', function() {
        const selectedType = $(this).val();
        filterBodyPartsByWorkoutType();
        
        // Clear existing selections
        if (selectedType !== 'cardio') {
            bodyPartSelect.val('');
        }
        resetExerciseSelect();
        
        // Reset field visibility based on new workout type
        if (selectedType === 'cardio') {
            toggleExerciseFields('Cardio');
        } else {
            toggleExerciseFields(''); // Reset field visibility
        }
    });

    async function loadLoggedSets() {
        try {
            const dateStr = formatDateForInput(selectedDate);
            const response = await $.get(`/workout/api/logged-sets?date=${dateStr}`);
            const loggedSets = response.logged_sets;

            // Clear the logged sets container
            $('#logged-sets').empty();

            if (loggedSets.length === 0) {
                showEmptyState();
                return;
            }

            // Group exercises by exercise_name and type
            const groupedByExercise = {};
            loggedSets.forEach(set => {
                const exerciseName = set.exercise_name;
                const isCardio = set.exercise_type === 'cardio';
                
                if (!groupedByExercise[exerciseName]) {
                    groupedByExercise[exerciseName] = {
                        exercise_type: set.exercise_type || 'strength',
                        variations: []
                    };
                }
                
                if (isCardio) {
                    // Group cardio exercises by duration/distance/intensity combination
                    const existingVariation = groupedByExercise[exerciseName].variations.find(
                        v => v.duration_minutes === set.duration_minutes && 
                             v.distance_miles === set.distance_miles &&
                             v.distance_km === set.distance_km &&
                             v.intensity === set.intensity
                    );
                    
                    if (existingVariation) {
                        existingVariation.count += 1;
                        existingVariation.ids.push(set.id);
                    } else {
                        groupedByExercise[exerciseName].variations.push({
                            duration_minutes: set.duration_minutes,
                            distance_miles: set.distance_miles,
                            distance_km: set.distance_km,
                            intensity: set.intensity,
                            calories_burned: set.calories_burned,
                            count: 1,
                            ids: [set.id]
                        });
                    }
                } else {
                    // Group strength exercises by weight/reps/unit combination
                    const existingVariation = groupedByExercise[exerciseName].variations.find(
                        v => v.weight === set.weight && v.reps === set.reps && v.unit === set.unit
                    );
                    
                    if (existingVariation) {
                        existingVariation.sets += set.sets;
                        existingVariation.ids.push(set.id);
                    } else {
                        groupedByExercise[exerciseName].variations.push({
                            weight: set.weight,
                            unit: set.unit,
                            reps: set.reps,
                            sets: set.sets,
                            ids: [set.id]
                        });
                    }
                }
            });

            // Display grouped exercises
            Object.keys(groupedByExercise).forEach(exerciseName => {
                const exerciseData = groupedByExercise[exerciseName];
                addExerciseCard(exerciseName, exerciseData.variations, exerciseData.exercise_type);
            });

        } catch (error) {
            console.error('Error loading logged sets:', error);
            showError('Error loading logged sets. Please refresh the page.');
        }
    }

    function showEmptyState() {
        $('#logged-sets').html(`
            <div class="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500" id="empty-state">
                <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <p class="text-base sm:text-lg font-semibold dark:text-gray-300">No exercises logged yet</p>
                <p class="text-xs sm:text-sm mt-1 dark:text-gray-400">Start tracking your workout!</p>
            </div>
        `);
    }

    // Toggle Tips Section
    $("#tips-toggle").click(function () {
        $("#tips-content").slideToggle(300);
        const arrow = $("#tips-arrow");
        if (arrow.text() === "▼") {
            arrow.text("▲").css("transform", "rotate(180deg)");
        } else {
            arrow.text("▼").css("transform", "rotate(0deg)");
        }
    });

    // Example: Dynamically update tips based on exercise selection
    $("#exercise").change(function () {
        const selectedExercise = $(this).val();
        if (selectedExercise) {
            const recommendations = {
                "bench-press": "Try 3 sets of 8-12 reps at 70-80% of your max.",
                squats: "Aim for 4 sets of 6-10 reps with progressive overload.",
                "pull-ups": "Start with 3 sets of 5-8 reps, increasing reps weekly.",
                custom: "Custom exercises require personalized recommendations.",
            };

            const tip = recommendations[selectedExercise] || "No specific recommendations for this exercise.";
            $("#tips-recommendation").html(`<p class="text-gray-600">${tip}</p>`);
        } else {
            $("#tips-recommendation").html('<p class="text-gray-600">Select an exercise to see recommendations.</p>');
        }
    });

    // Handle body part selection
    bodyPartSelect.on('change', async function () {
        const selectedBodyPart = $(this).val();
        
        // Toggle between strength and cardio fields
        toggleExerciseFields(selectedBodyPart);
        
        if (selectedBodyPart) {
            await loadExercises(selectedBodyPart);
        } else {
            resetExerciseSelect();
        }
    });
    
    // Also check workout type when determining if it's cardio
    function getIsCardioFromSelection() {
        const selectedBodyPart = bodyPartSelect.val();
        const selectedWorkoutType = workoutTypeSelect.val();
        
        // If workout type is explicitly cardio, or body part is Cardio, it's cardio
        return selectedWorkoutType === 'cardio' || selectedBodyPart === 'Cardio';
    }
    
    // Toggle between strength and cardio fields based on body part and workout type
    function toggleExerciseFields(bodyPart) {
        const strengthFields = $('#strength-fields');
        const cardioFields = $('#cardio-fields');
        const selectedWorkoutType = workoutTypeSelect.val();
        
        // Check if it's cardio based on workout type or body part
        const isCardio = selectedWorkoutType === 'cardio' || bodyPart === 'Cardio';
        
        if (isCardio) {
            // Show cardio fields, hide strength fields
            strengthFields.addClass('hidden');
            cardioFields.removeClass('hidden');
            
            // Clear strength field values
            $('#weight').val('');
            $('#reps').val('');
            $('#sets').val('1');
        } else {
            // Show strength fields, hide cardio fields
            strengthFields.removeClass('hidden');
            cardioFields.addClass('hidden');
            
            // Clear cardio field values
            $('#duration').val('');
            $('#distance-value').val('');
            $('#intensity').val('');
            $('#calories').val('');
        }
    }

    async function loadExercises(bodyPart) {
        try {
            const response = await $.get(`/workout/api/exercises/${bodyPart}`);
            exerciseSelect.empty();
            exerciseSelect.append('<option value="">Select Exercise</option>');

            if (response.standardExercises.length > 0) {
                const standardGroup = $('<optgroup label="Standard Exercises">');
                response.standardExercises.forEach(exercise => {
                    const option = $(`<option value="standard_${exercise.standard_exercise_id}">${exercise.exercise_name}</option>`);
                    if (exercise.description) {
                        option.attr('title', exercise.description);
                    }
                    standardGroup.append(option);
                });
                exerciseSelect.append(standardGroup);
            }

            if (response.customExercises.length > 0) {
                const customGroup = $('<optgroup label="Your Custom Exercises">');
                response.customExercises.forEach(exercise => {
                    customGroup.append(`<option value="custom_${exercise.custom_exercise_id}">${exercise.exercise_name}</option>`);
                });
                exerciseSelect.append(customGroup);
            }

            exerciseSelect.append('<option value="new_custom">+ Add Custom Exercise</option>');

        } catch (error) {
            console.error('Error loading exercises:', error);
            showError('Error loading exercises. Please try again.');
        }
    }

    exerciseSelect.on('change', function () {
        const selectedValue = $(this).val();
        handleCustomExerciseInput(selectedValue);
    });

    function handleCustomExerciseInput(selectedValue) {
        if (customExerciseInput) {
            customExerciseInput.remove();
            customExerciseInput = null;
        }

        if (selectedValue === 'new_custom') {
            customExerciseInput = $(`
                <div class="mt-4">
                    <label class="block text-lg font-medium text-gray-700 mb-2">Custom Exercise Name</label>
                    <input type="text" 
                           id="custom-exercise-name"
                           class="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" 
                           placeholder="Enter exercise name">
                </div>
            `);
            exerciseSelect.after(customExerciseInput);
        }
    }

    // Edit individual variation
    $('#logged-sets').on('click', '.edit-variation-btn', function (e) {
        e.stopPropagation();
        const variationRow = $(this).closest('.variation-row');
        
        // Check if already in edit mode
        if (variationRow.hasClass('editing')) {
            return;
        }
        
        // Get the variation data
        const variationData = JSON.parse(variationRow.attr('data-variation-data'));
        const isCardio = variationData.exercise_type === 'cardio';
        
        // Mark as editing
        variationRow.addClass('editing');
        
        let editForm;
        
        if (isCardio) {
            // Cardio edit form
            const originalDuration = variationData.duration_minutes || '';
            const originalDistanceMiles = variationData.distance_miles || '';
            const originalDistanceKm = variationData.distance_km || '';
            const originalDistance = originalDistanceMiles || originalDistanceKm || '';
            const originalDistanceUnit = originalDistanceMiles ? 'miles' : (originalDistanceKm ? 'km' : 'miles');
            const originalIntensity = variationData.intensity || '';
            const originalCalories = variationData.calories_burned || '';
            
            editForm = `
                <div class="flex-1 space-y-3 bg-white dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                    <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <div class="flex items-center gap-2">
                            <label class="text-xs text-gray-700 dark:text-gray-200 font-bold whitespace-nowrap">Duration:</label>
                            <input type="number" 
                                   class="edit-duration w-20 px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 text-sm font-bold text-center"
                                   value="${originalDuration}" 
                                   step="0.5" 
                                   min="0">
                        </div>
                        <span class="text-gray-400 dark:text-gray-500">|</span>
                        <div class="flex items-center gap-2">
                            <label class="text-xs text-gray-700 dark:text-gray-200 font-bold whitespace-nowrap">Distance:</label>
                            <input type="number" 
                                   class="edit-distance-value w-20 px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400 text-sm font-bold text-center"
                                   value="${originalDistance}" 
                                   step="0.01" 
                                   min="0">
                            <select class="edit-distance-unit px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400 text-sm font-bold">
                                <option value="miles" ${originalDistanceUnit === 'miles' ? 'selected' : ''}>mi</option>
                                <option value="km" ${originalDistanceUnit === 'km' ? 'selected' : ''}>km</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <div class="flex items-center gap-2">
                            <label class="text-xs text-gray-700 dark:text-gray-200 font-bold whitespace-nowrap">Intensity:</label>
                            <select class="edit-intensity px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 text-sm font-bold">
                                <option value="">Select</option>
                                <option value="Low" ${originalIntensity === 'Low' ? 'selected' : ''}>Low</option>
                                <option value="Moderate" ${originalIntensity === 'Moderate' ? 'selected' : ''}>Moderate</option>
                                <option value="High" ${originalIntensity === 'High' ? 'selected' : ''}>High</option>
                            </select>
                        </div>
                        <span class="text-gray-400 dark:text-gray-500">|</span>
                        <div class="flex items-center gap-2">
                            <label class="text-xs text-gray-700 dark:text-gray-200 font-bold whitespace-nowrap">Calories:</label>
                            <input type="number" 
                                   class="edit-calories w-20 px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500 dark:focus:border-orange-400 text-sm font-bold text-center"
                                   value="${originalCalories}" 
                                   min="0">
                        </div>
                    </div>
                    <div class="flex items-center gap-2 pt-2">
                        <button class="save-edit-btn px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                            </svg>
                            Save
                        </button>
                        <button class="cancel-edit-btn px-4 py-2 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-all shadow-md hover:shadow-lg">
                            Cancel
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Strength edit form
            const originalSets = variationData.sets;
            const originalReps = variationData.reps;
            const originalWeight = variationData.weight;
            const originalUnit = variationData.unit || 'lb';
            
            editForm = `
                <div class="flex-1 space-y-3 bg-white dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                    <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <div class="flex items-center gap-2">
                            <label class="text-xs text-gray-700 dark:text-gray-200 font-bold whitespace-nowrap">Sets:</label>
                            <input type="number" 
                                   class="edit-sets w-16 px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:ring-amber-400 focus:border-amber-500 dark:focus:border-amber-400 text-sm font-bold text-center"
                                   value="${originalSets}" 
                                   min="1" 
                                   required>
                        </div>
                        <span class="text-gray-400 dark:text-gray-500">×</span>
                        <div class="flex items-center gap-2">
                            <label class="text-xs text-gray-700 dark:text-gray-200 font-bold whitespace-nowrap">Reps:</label>
                            <input type="number" 
                                   class="edit-reps w-16 px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400 text-sm font-bold text-center"
                                   value="${originalReps}" 
                                   min="1" 
                                   required>
                        </div>
                        <span class="text-gray-400 dark:text-gray-500">@</span>
                        <div class="flex items-center gap-2">
                            <label class="text-xs text-gray-700 dark:text-gray-200 font-bold whitespace-nowrap">Weight:</label>
                            <input type="number" 
                                   class="edit-weight w-20 px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 text-sm font-bold text-center"
                                   value="${originalWeight}" 
                                   step="0.5" 
                                   min="0" 
                                   required>
                            <select class="edit-unit px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 text-sm font-bold">
                                <option value="lb" ${originalUnit === 'lb' ? 'selected' : ''}>lbs</option>
                                <option value="kg" ${originalUnit === 'kg' ? 'selected' : ''}>kg</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 pt-2">
                        <button class="save-edit-btn px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                            </svg>
                            Save
                        </button>
                        <button class="cancel-edit-btn px-4 py-2 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-all shadow-md hover:shadow-lg">
                            Cancel
                        </button>
                    </div>
                </div>
            `;
        }
        
        // Replace content with edit form
        variationRow.find('.variation-content').hide();
        variationRow.find('.variation-actions').hide();
        variationRow.prepend(editForm);
        
        // Change styling to indicate edit mode
        variationRow.removeClass('hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-600')
                   .addClass('bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 shadow-md');
        
        // Focus on first input
        const firstInput = isCardio ? variationRow.find('.edit-duration') : variationRow.find('.edit-sets');
        if (firstInput.length) {
            firstInput.focus().select();
        }
    });
    
    // Save edit
    $('#logged-sets').on('click', '.save-edit-btn', async function (e) {
        e.stopPropagation();
        const variationRow = $(this).closest('.variation-row');
        const variationData = JSON.parse(variationRow.attr('data-variation-data'));
        const isCardio = variationData.exercise_type === 'cardio';
        const ids = variationData.ids;
        const firstId = Array.isArray(ids) ? ids[0] : ids;
        
        let updateData = {
            variation_ids: ids
        };
        
        if (isCardio) {
            // Cardio validation and data
            const duration = variationRow.find('.edit-duration').val() ? parseFloat(variationRow.find('.edit-duration').val()) : null;
            const distanceValue = variationRow.find('.edit-distance-value').val() ? parseFloat(variationRow.find('.edit-distance-value').val()) : null;
            const distanceUnit = variationRow.find('.edit-distance-unit').val();
            const intensity = variationRow.find('.edit-intensity').val() || null;
            const calories = variationRow.find('.edit-calories').val() ? parseInt(variationRow.find('.edit-calories').val()) : null;
            
            if (!duration && !distanceValue) {
                showError('Please enter at least duration or distance');
                return;
            }
            
            updateData.duration_minutes = duration;
            if (distanceValue) {
                if (distanceUnit === 'miles') {
                    updateData.distance_miles = distanceValue;
                    updateData.distance_km = null;
                } else {
                    updateData.distance_km = distanceValue;
                    updateData.distance_miles = null;
                }
            } else {
                updateData.distance_miles = null;
                updateData.distance_km = null;
            }
            updateData.intensity = intensity;
            updateData.calories_burned = calories;
            updateData.exercise_type = 'cardio';
            updateData.sets = 1;
            updateData.reps = 1;
            updateData.weight = 0;
        } else {
            // Strength validation and data
            const sets = parseInt(variationRow.find('.edit-sets').val());
            const reps = parseInt(variationRow.find('.edit-reps').val());
            const weight = parseFloat(variationRow.find('.edit-weight').val());
            const unit = variationRow.find('.edit-unit').val();
            
            // Validate
            if (!sets || sets < 1 || !reps || reps < 1 || weight < 0) {
                showError('Please enter valid values for all fields');
                return;
            }
            
            updateData.weight = weight;
            updateData.reps = reps;
            updateData.sets = sets;
            updateData.unit = unit;
            updateData.exercise_type = 'strength';
        }
        
        try {
            // Update all sets in the variation - only need one request as backend handles all IDs
            await $.ajax({
                url: `/workout/api/logged-sets/${firstId}`,
                method: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify(updateData)
            });
            
            // Reload logged sets to show updated data
            await loadLoggedSets();
            
            showSuccessNotification('Exercise updated successfully! ✨');
        } catch (error) {
            console.error('Error updating variation:', error);
            showError('Failed to update the exercise. Please try again.');
            
            // Cancel edit on error
            cancelEdit(variationRow);
        }
    });
    
    // Cancel edit
    $('#logged-sets').on('click', '.cancel-edit-btn', function (e) {
        e.stopPropagation();
        const variationRow = $(this).closest('.variation-row');
        cancelEdit(variationRow);
    });
    
    // Function to cancel edit and restore original view
    function cancelEdit(variationRow) {
        variationRow.removeClass('editing');
        variationRow.removeClass('bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 shadow-md')
                   .addClass('hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-600')
                   .removeAttr('style');
        
        // Remove edit form (works for both cardio and strength)
        const editForm = variationRow.find('.flex-1').first();
        if (editForm.length) {
            editForm.remove();
        }
        
        // Show original content
        variationRow.find('.variation-content').show();
        variationRow.find('.variation-actions').show();
    }
    
    // Delete individual variation
    $('#logged-sets').on('click', '.delete-variation-btn', async function (e) {
        e.stopPropagation(); // Prevent card expansion
        const liftIds = $(this).data('ids');
        const idsArray = Array.isArray(liftIds) ? liftIds : [liftIds];
        const variationRow = $(this).closest('.variation-row');
        const exerciseCard = $(this).closest('.exercise-card');
        
        try {
            // Delete all sets in this variation
            const deletePromises = idsArray.map(id => 
                $.ajax({
                    url: `/workout/api/logged-sets/${id}`,
                    method: 'DELETE',
                })
            );
            
            await Promise.all(deletePromises);
    
            // Remove the variation row with animation
            variationRow.addClass('opacity-0 scale-95 transition-all duration-300');
            setTimeout(() => {
                variationRow.remove();
                
                // Check if there are any variations left
                const remainingVariations = exerciseCard.find('.variation-row').length;
                if (remainingVariations === 0) {
                    // Remove the entire exercise card if no variations left
                    exerciseCard.addClass('opacity-0 scale-95 transition-all duration-300');
                    setTimeout(() => {
                        exerciseCard.remove();
                        if ($('#logged-sets').children('.exercise-card').length === 0) {
                            showEmptyState();
                        }
                    }, 300);
                } else {
                    // Reload to update totals
                    loadLoggedSets();
                }
            }, 300);
            
            showSuccessNotification('Set variation deleted successfully');
        } catch (error) {
            console.error('Error deleting variation:', error);
            showError('Failed to delete the set variation. Please try again.');
        }
    });

    // Toggle collapse/expand exercise card
    $('#logged-sets').on('click', '.exercise-header', function (e) {
        // Don't toggle if clicking the delete button
        if ($(e.target).closest('.delete-exercise-btn').length) {
            return;
        }
        
        const exerciseCard = $(this).closest('.exercise-card');
        const setsContainer = exerciseCard.find('.exercise-sets-container');
        const collapseArrow = $(this).find('.collapse-arrow');
        
        // Toggle collapsed class
        if (exerciseCard.hasClass('collapsed')) {
            // Expand
            exerciseCard.removeClass('collapsed');
            setsContainer.slideDown(300);
            collapseArrow.css('transform', 'rotate(0deg)');
        } else {
            // Collapse
            exerciseCard.addClass('collapsed');
            setsContainer.slideUp(300);
            collapseArrow.css('transform', 'rotate(-90deg)');
        }
    });
    
    // Delete entire exercise
    $('#logged-sets').on('click', '.delete-exercise-btn', function (e) {
        e.stopPropagation(); // Prevent card expansion
        const exerciseCard = $(this).closest('.exercise-card');
        const exerciseName = exerciseCard.find('.exercise-header h3').text().trim();
        const variations = exerciseCard.find('.variation-row');
        
        // Count total sets
        let totalSets = 0;
        variations.each(function() {
            const ids = $(this).find('.delete-variation-btn').data('ids');
            const idsArray = Array.isArray(ids) ? ids : [ids];
            totalSets += idsArray.length;
        });
        
        // Show confirmation dialog
        showDeleteConfirmation(exerciseName, totalSets, exerciseCard);
    });
    
    // Confirmation dialog for deleting entire exercise
    function showDeleteConfirmation(exerciseName, totalSets, exerciseCard) {
        // Remove existing confirmation modal if any
        $('#delete-exercise-confirmation-modal').remove();
        
        const confirmationModal = $(`
            <div id="delete-exercise-confirmation-modal" class="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50 p-4 animate__animated animate__fadeIn">
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 transform transition-all animate__animated animate__zoomIn">
                    <!-- Warning Icon -->
                    <div class="flex justify-center mb-4">
                        <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                            <svg class="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                            </svg>
                        </div>
                    </div>
                    
                    <!-- Title -->
                    <h3 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-3">
                        Delete Exercise?
                    </h3>
                    
                    <!-- Message -->
                    <div class="mb-6 text-center">
                        <p class="text-gray-700 dark:text-gray-300 text-base sm:text-lg mb-2">
                            This will permanently delete <span class="font-bold text-red-600 dark:text-red-400">${exerciseName}</span> and all its sets.
                        </p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            ${totalSets} ${totalSets === 1 ? 'set' : 'sets'} will be removed. This action cannot be undone.
                        </p>
                    </div>
                    
                    <!-- Buttons -->
                    <div class="flex flex-col sm:flex-row gap-3">
                        <button 
                            id="confirm-delete-exercise-btn"
                            class="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white font-bold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                            Yes, Delete All
                        </button>
                        <button 
                            id="cancel-delete-exercise-btn"
                            class="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `);
        
        $('body').append(confirmationModal);
        
        // Handle confirm button
        $('#confirm-delete-exercise-btn').on('click', async function() {
            const btn = $(this);
            btn.prop('disabled', true).html(`
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
            `);
            
            const variations = exerciseCard.find('.variation-row');
            
            // Collect all IDs from all variations
            const allIds = [];
            variations.each(function() {
                const ids = $(this).find('.delete-variation-btn').data('ids');
                const idsArray = Array.isArray(ids) ? ids : [ids];
                allIds.push(...idsArray);
            });
            
            try {
                // Delete all sets in all variations
                const deletePromises = allIds.map(id => 
                    $.ajax({
                        url: `/workout/api/logged-sets/${id}`,
                        method: 'DELETE',
                    })
                );
                
                await Promise.all(deletePromises);
        
                // Close modal
                confirmationModal.addClass('animate__fadeOut');
                setTimeout(() => confirmationModal.remove(), 300);
        
                // Remove the card from the DOM with animation
                exerciseCard.addClass('opacity-0 scale-95 transition-all duration-300');
                setTimeout(() => {
                    exerciseCard.remove();
                    if ($('#logged-sets').children('.exercise-card').length === 0) {
                        showEmptyState();
                    }
                }, 300);
                
                showSuccessNotification('Exercise deleted successfully');
            } catch (error) {
                console.error('Error deleting exercise:', error);
                btn.prop('disabled', false).html(`
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Yes, Delete All
                `);
                showError('Failed to delete the exercise. Please try again.');
            }
        });
        
        // Handle cancel button
        $('#cancel-delete-exercise-btn').on('click', function() {
            confirmationModal.addClass('animate__fadeOut');
            setTimeout(() => confirmationModal.remove(), 300);
        });
        
        // Close on backdrop click
        confirmationModal.on('click', function(e) {
            if ($(e.target).attr('id') === 'delete-exercise-confirmation-modal') {
                confirmationModal.addClass('animate__fadeOut');
                setTimeout(() => confirmationModal.remove(), 300);
            }
        });
        
        // Close on Escape key
        $(document).on('keydown.deleteExerciseModal', function(e) {
            if (e.key === 'Escape' && $('#delete-exercise-confirmation-modal').length) {
                $('#cancel-delete-exercise-btn').click();
                $(document).off('keydown.deleteExerciseModal');
            }
        });
    }
    

    $('#workout-form').on('submit', async function (e) {
        e.preventDefault();

        const workoutType = workoutTypeSelect.val();
        const bodyPart = bodyPartSelect.val();
        const exerciseValue = exerciseSelect.val();
        const isCardio = getIsCardioFromSelection();
        
        // Validate workout type and body part
        if (!workoutType || !bodyPart || !exerciseValue) {
            showError('Please select workout type, body part, and exercise');
            return;
        }

        if (isCardio) {
            // Cardio validation
            if (!$('#duration').val() && !$('#distance-value').val()) {
                showError('Please enter at least duration or distance');
                return;
            }
        } else {
            // Strength validation
            if (!$('#weight').val() || !$('#reps').val()) {
                showError('Please fill in all required fields');
                return;
            }
        }

        try {
            let exerciseData = {
                bodyPart: bodyPart,
                exercise_type: isCardio ? 'cardio' : 'strength',
                workout_type: workoutType,
                date: formatDateForInput(selectedDate)
            };

            if (isCardio) {
                // Cardio data
                exerciseData.duration_minutes = $('#duration').val() ? parseFloat($('#duration').val()) : null;
                const distanceValue = $('#distance-value').val() ? parseFloat($('#distance-value').val()) : null;
                const distanceUnit = $('#distance-unit').val();
                
                if (distanceValue) {
                    if (distanceUnit === 'miles') {
                        exerciseData.distance_miles = distanceValue;
                    } else {
                        exerciseData.distance_km = distanceValue;
                    }
                }
                
                exerciseData.intensity = $('#intensity').val() || null;
                exerciseData.calories_burned = $('#calories').val() ? parseInt($('#calories').val()) : null;
                exerciseData.sets = 1; // Cardio exercises are logged as single entries
                exerciseData.reps = 1;
                exerciseData.weight = 0;
            } else {
                // Strength data
                exerciseData.weight = $('#weight').val() || 0;
                exerciseData.unit = $('#unit').val();
                exerciseData.reps = $('#reps').val();
                exerciseData.sets = $('#sets').val() || 1;
            }

            if (exerciseValue === 'new_custom') {
                const customName = $('#custom-exercise-name').val().trim();
                if (!customName) {
                    showError('Please enter a custom exercise name');
                    return;
                }

                const customResponse = await $.ajax({
                    url: '/workout/api/custom-exercise',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        bodyPart: bodyPart,
                        exerciseName: customName
                    })
                });
                exerciseData.customExerciseId = customResponse.customExerciseId;
                exerciseData.exerciseName = customName;
            } else {
                const [type, id] = exerciseValue.split('_');
                if (type === 'standard') {
                    exerciseData.standardExerciseId = id;
                } else if (type === 'custom') {
                    exerciseData.customExerciseId = id;
                }
            }

            await $.ajax({
                url: '/workout/api/exercise_log',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(exerciseData)
            });

            showSuccessNotification('Exercise logged successfully!');
            resetForm();
            
            // Reload logged sets to show grouped data
            await loadLoggedSets();

        } catch (error) {
            console.error('Error logging exercise:', error);
            showError('Error logging exercise. Please try again.');
        }
    });

function addExerciseCard(exerciseName, variations, exerciseType = 'strength') {
    const isCardio = exerciseType === 'cardio';
    
    // Build set variations HTML
    const variationsHTML = variations.map((variation) => {
        if (isCardio) {
            // Cardio display
            const durationDisplay = variation.duration_minutes ? `${variation.duration_minutes} min` : '';
            const distanceDisplay = variation.distance_miles ? `${variation.distance_miles} mi` : 
                                    (variation.distance_km ? `${variation.distance_km} km` : '');
            const intensityDisplay = variation.intensity ? ` • ${variation.intensity}` : '';
            const caloriesDisplay = variation.calories_burned ? `${variation.calories_burned} cal` : '';
            const countDisplay = variation.count > 1 ? ` (${variation.count}x)` : '';
            
            return `
                <div class="variation-row flex items-center justify-between py-3 px-3 sm:px-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-600 transition-all" data-variation-data='${JSON.stringify({ids: variation.ids, duration_minutes: variation.duration_minutes, distance_miles: variation.distance_miles, distance_km: variation.distance_km, intensity: variation.intensity, calories_burned: variation.calories_burned, exercise_type: 'cardio'})}'>
                    <div class="variation-content flex items-center gap-2 sm:gap-3 flex-wrap flex-1">
                        ${durationDisplay ? `<div class="flex items-center gap-1.5">
                            <span class="text-xs text-gray-600 dark:text-gray-300 font-semibold">Duration:</span>
                            <span class="text-sm sm:text-base font-bold text-blue-700 dark:text-blue-300">${durationDisplay}</span>
                        </div>` : ''}
                        ${distanceDisplay ? `<div class="flex items-center gap-1.5">
                            <span class="text-xs text-gray-600 dark:text-gray-300 font-semibold">Distance:</span>
                            <span class="text-sm sm:text-base font-bold text-green-700 dark:text-green-300">${distanceDisplay}</span>
                        </div>` : ''}
                        ${intensityDisplay ? `<span class="text-sm sm:text-base font-bold text-purple-700 dark:text-purple-300">${intensityDisplay}</span>` : ''}
                        ${caloriesDisplay ? `<div class="flex items-center gap-1.5">
                            <span class="text-xs text-gray-600 dark:text-gray-300 font-semibold">Calories:</span>
                            <span class="text-sm sm:text-base font-bold text-orange-700 dark:text-orange-300">${caloriesDisplay}</span>
                        </div>` : ''}
                        ${countDisplay ? `<span class="text-xs text-gray-600 dark:text-gray-400 font-semibold">${countDisplay}</span>` : ''}
                    </div>
                    <div class="variation-actions flex items-center gap-1 sm:gap-2">
                        <button 
                            class="edit-variation-btn flex-shrink-0 p-2 sm:p-2.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg transition-all border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
                            data-ids='${JSON.stringify(variation.ids)}'
                            title="Edit this set">
                            <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <button 
                            class="delete-variation-btn flex-shrink-0 p-2 sm:p-2.5 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 rounded-lg transition-all border border-red-200 dark:border-red-700 hover:border-red-300 dark:hover:border-red-600"
                            data-ids='${JSON.stringify(variation.ids)}'
                            title="Delete this set">
                            <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Strength display
            return `
                <div class="variation-row flex items-center justify-between py-3 px-3 sm:px-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-600 transition-all" data-variation-data='${JSON.stringify({ids: variation.ids, sets: variation.sets, reps: variation.reps, weight: variation.weight, unit: variation.unit})}'>
                    <div class="variation-content flex items-center gap-2 sm:gap-3 flex-wrap flex-1">
                        <div class="flex items-center gap-1.5">
                            <span class="text-xs text-gray-600 dark:text-gray-300 font-semibold">Sets:</span>
                            <span class="variation-sets text-sm sm:text-base font-bold text-blue-700 dark:text-blue-300">${variation.sets}</span>
                        </div>
                        <span class="text-gray-400 dark:text-gray-500">×</span>
                        <div class="flex items-center gap-1.5">
                            <span class="text-xs text-gray-600 dark:text-gray-300 font-semibold">Reps:</span>
                            <span class="variation-reps text-sm sm:text-base font-bold text-green-700 dark:text-green-300">${variation.reps}</span>
                        </div>
                        <span class="text-gray-400 dark:text-gray-500">@</span>
                        <div class="flex items-center gap-1.5">
                            <span class="text-xs text-gray-600 dark:text-gray-300 font-semibold">Weight:</span>
                            <span class="variation-weight text-sm sm:text-base font-bold text-purple-700 dark:text-purple-300">${variation.weight} <span class="variation-unit">${variation.unit}</span></span>
                        </div>
                    </div>
                    <div class="variation-actions flex items-center gap-1 sm:gap-2">
                        <button 
                            class="edit-variation-btn flex-shrink-0 p-2 sm:p-2.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg transition-all border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
                            data-ids='${JSON.stringify(variation.ids)}'
                            title="Edit this set">
                            <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <button 
                            class="delete-variation-btn flex-shrink-0 p-2 sm:p-2.5 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 rounded-lg transition-all border border-red-200 dark:border-red-700 hover:border-red-300 dark:hover:border-red-600"
                            data-ids='${JSON.stringify(variation.ids)}'
                            title="Delete this set">
                            <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }
    }).join('');
    
    const exerciseCard = $(`
        <div class="exercise-card bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-700 border-2 border-blue-200 dark:border-blue-700 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
            <!-- Exercise Header -->
            <div class="exercise-header bg-white dark:bg-gray-800 border-b-2 border-blue-200 dark:border-blue-700 p-3 sm:p-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors" data-exercise="${exerciseName}">
                <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2 flex-1">
                        <div class="collapse-arrow flex-shrink-0 transform transition-transform duration-200">
                            <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </div>
                        <h3 class="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 truncate flex-1">${exerciseName}</h3>
                    </div>
                    <button 
                        class="delete-exercise-btn flex-shrink-0 p-2 sm:p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-all border border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-600"
                        data-exercise="${exerciseName}"
                        title="Delete entire exercise">
                        <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <!-- Exercise Sets -->
            <div class="exercise-sets-container p-3 sm:p-4 space-y-2">
                ${variationsHTML}
            </div>
        </div>
    `);
    
    $('#logged-sets').append(exerciseCard);
    exerciseCard.hide().fadeIn(300);
}

    function resetForm() {
        // Reset strength fields
        $('#weight').val('');
        $('#reps').val('');
        $('#sets').val('1');
        
        // Reset cardio fields
        $('#duration').val('');
        $('#distance-value').val('');
        $('#intensity').val('');
        $('#calories').val('');
        
        if (customExerciseInput) {
            customExerciseInput.remove();
            customExerciseInput = null;
        }
        
        // Reset field visibility based on current selections
        const currentBodyPart = bodyPartSelect.val();
        toggleExerciseFields(currentBodyPart || '');
    }

    function resetExerciseSelect() {
        exerciseSelect.empty();
        exerciseSelect.append('<option value="">Select Exercise</option>');
        if (customExerciseInput) {
            customExerciseInput.remove();
            customExerciseInput = null;
        }
    }

    function showError(message) {
        const errorDiv = $(`
            <div class="fixed top-4 right-4 bg-white dark:bg-gray-800 border-l-4 border-red-500 dark:border-red-600 text-gray-800 dark:text-gray-200 px-6 py-4 rounded-lg shadow-xl z-50 flex items-center gap-3 animate__animated animate__fadeInRight">
                <svg class="w-5 h-5 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span class="font-medium">${message}</span>
            </div>
        `);
        $('body').append(errorDiv);
        setTimeout(() => {
            errorDiv.addClass('animate__fadeOutRight');
            setTimeout(() => errorDiv.remove(), 1000);
        }, 3000);
    }

    function showSuccessNotification(message) {
        const successDiv = $(`
            <div class="fixed top-4 right-4 bg-white dark:bg-gray-800 border-l-4 border-green-500 dark:border-green-600 text-gray-800 dark:text-gray-200 px-6 py-4 rounded-lg shadow-xl z-50 flex items-center gap-3 animate__animated animate__fadeInRight">
                <svg class="w-5 h-5 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span class="font-medium">${message}</span>
            </div>
        `);
        $('body').append(successDiv);
        setTimeout(() => {
            successDiv.addClass('animate__fadeOutRight');
            setTimeout(() => successDiv.remove(), 1000);
        }, 2000);
    }
    
    // Alias for consistency
    function showSuccess(message) {
        showSuccessNotification(message);
    }
    
    // Initialize scroll-to-add-exercise button
    function initScrollToAddExerciseButton() {
        const scrollButton = $('#back-to-add-exercise-btn');
        const addExerciseForm = $('#add-exercise-form');
        
        if (!scrollButton.length || !addExerciseForm.length) {
            return;
        }
        
        // Function to check scroll position and show/hide button
        function checkScrollPosition() {
            const scrollTop = $(window).scrollTop();
            const formOffset = addExerciseForm.offset().top;
            const windowHeight = $(window).height();
            
            // Show button if scrolled past the form (with some threshold)
            // Threshold: show when form is 300px above viewport bottom on desktop, 150px on mobile
            const threshold = window.innerWidth >= 768 ? 300 : 150;
            
            if (scrollTop > formOffset - windowHeight + threshold) {
                scrollButton.removeClass('opacity-0 pointer-events-none translate-y-4')
                           .addClass('opacity-100 pointer-events-auto translate-y-0');
            } else {
                scrollButton.removeClass('opacity-100 pointer-events-auto translate-y-0')
                           .addClass('opacity-0 pointer-events-none translate-y-4');
            }
        }
        
        // Check on scroll
        $(window).on('scroll', checkScrollPosition);
        
        // Check on initial load
        checkScrollPosition();
        
        // Handle button click - smooth scroll to form
        scrollButton.on('click', function(e) {
            e.preventDefault();
            
            const formTop = addExerciseForm.offset().top;
            const headerOffset = 80; // Account for fixed headers if any
            
            $('html, body').animate({
                scrollTop: formTop - headerOffset
            }, 600, 'swing');
            
            // Focus on first input for better UX
            setTimeout(() => {
                $('#workout-date-picker').focus();
            }, 650);
        });
    }
    
    // Initialize collapsible sections
    function initCollapsibleSections() {
        // Collapsible Add Exercise section - starts expanded
        $('.add-exercise-arrow').css('transform', 'rotate(180deg)'); // Set arrow to expanded state
        
        $('.add-exercise-header').on('click', function() {
            const content = $('#add-exercise-content');
            const arrow = $('.add-exercise-arrow');
            
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
        
        // Collapsible Load Routine section
        $('.routine-card-header').on('click', function() {
            const content = $('#routine-card-content');
            const arrow = $('.routine-card-arrow');
            
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
    }
    
    // Load routines from API
    async function loadRoutines() {
        try {
            const response = await $.get('/api/routines');
            routines = response.routines || [];
            populateRoutineSelect();
        } catch (error) {
            console.error('Error loading routines:', error);
        }
    }
    
    // Populate routine select dropdown
    function populateRoutineSelect() {
        const $select = $('#routine-select');
        $select.empty().append('<option value="">Select a routine...</option>');
        
        routines.forEach(routine => {
            const exerciseCount = routine.exercises ? routine.exercises.length : 0;
            $select.append(`<option value="${routine.routine_id}">${escapeHtml(routine.routine_name)} (${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''})</option>`);
        });
    }
    
    // Initialize routine loading functionality
    function initRoutineLoading() {
        const loadBtn = $('#load-routine-btn');
        const routineSelect = $('#routine-select');
        
        // Update button state when routine selection changes
        routineSelect.on('change', function() {
            const routineId = parseInt($(this).val());
            if (routineId) {
                // Enable button
                loadBtn.prop('disabled', false)
                    .removeClass('bg-gray-400 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed opacity-60')
                    .addClass('bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white cursor-pointer');
            } else {
                // Disable button
                loadBtn.prop('disabled', true)
                    .removeClass('bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white cursor-pointer')
                    .addClass('bg-gray-400 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed opacity-60');
            }
        });
        
        // Load routine button
        loadBtn.on('click', function() {
            const routineId = parseInt(routineSelect.val());
            if (!routineId) {
                showError('Please select a routine to load');
                return;
            }
            
            const routine = routines.find(r => r.routine_id === routineId);
            if (!routine) {
                showError('Routine not found');
                return;
            }
            
            loadRoutineToPage(routine);
        });
        
        // Clear routine button
        $('#clear-routine-btn').on('click', function() {
            clearLoadedRoutine();
        });
    }
    
    // Load routine to the page
    function loadRoutineToPage(routine) {
        loadedRoutine = routine;
        routineCompletedCount = 0;
        
        // Update routine display
        $('#loaded-routine-name').text(routine.routine_name);
        $('#loaded-routine-desc').text(routine.description || 'No description');
        $('#loaded-routine-display').removeClass('hidden').slideDown(300);
        
        // Render exercises
        renderRoutineExercises();
        
        // Update progress
        updateRoutineProgress();
        
        // Expand routine section if collapsed
        if ($('#routine-card-content').hasClass('hidden')) {
            $('#routine-card-content').removeClass('hidden').slideDown(300);
            $('.routine-card-arrow').css('transform', 'rotate(180deg)');
        }
        
        showSuccess(`Loaded "${routine.routine_name}" with ${routine.exercises.length} exercises. Complete exercises as you go!`);
    }
    
    // Render routine exercises
    function renderRoutineExercises() {
        const container = $('#routine-exercises-list');
        container.empty();
        
        if (!loadedRoutine || !loadedRoutine.exercises || loadedRoutine.exercises.length === 0) {
            container.html('<p class="text-sm text-gray-500 dark:text-gray-400 text-center">No exercises in this routine</p>');
            return;
        }
        
        loadedRoutine.exercises.forEach((ex, index) => {
            const isCardio = ex.exercise_type === 'cardio';
            const exerciseRow = $(`
                <div class="routine-exercise-row bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border-2 border-gray-200 dark:border-gray-600 transition-all" data-exercise-index="${index}">
                    <div class="flex items-start gap-3">
                        <!-- Checkbox -->
                        <div class="flex-shrink-0 pt-1">
                            <input type="checkbox" class="routine-exercise-checkbox w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-green-500" />
                        </div>
                        
                        <!-- Exercise Info -->
                        <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between mb-2">
                                <div class="flex-1 min-w-0">
                                    <h4 class="text-base font-bold text-gray-800 dark:text-gray-100 truncate">${escapeHtml(ex.exercise_name)}</h4>
                                    <p class="text-xs text-gray-600 dark:text-gray-400">${escapeHtml(ex.body_part)}</p>
                                </div>
                                <button class="routine-edit-btn p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all flex-shrink-0" title="Edit">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                    </svg>
                                </button>
                            </div>
                            
                            <!-- Display Mode (default) -->
                            <div class="routine-display-mode">
                                ${isCardio ? `
                                    <div class="space-y-1 text-xs">
                                        ${ex.duration_minutes ? `<p class="text-gray-700 dark:text-gray-300"><span class="font-semibold">Duration:</span> <span class="routine-display-duration">${ex.duration_minutes}</span> min</p>` : ''}
                                        ${ex.intensity ? `<p class="text-gray-700 dark:text-gray-300"><span class="font-semibold">Intensity:</span> <span class="routine-display-intensity">${ex.intensity}</span></p>` : ''}
                                    </div>
                                ` : `
                                    <div class="grid grid-cols-3 gap-2 text-xs">
                                        <div>
                                            <span class="text-gray-600 dark:text-gray-400 font-semibold">Sets:</span>
                                            <span class="routine-display-sets ml-1 font-bold text-gray-800 dark:text-gray-200">${ex.sets || '--'}</span>
                                        </div>
                                        <div>
                                            <span class="text-gray-600 dark:text-gray-400 font-semibold">Reps:</span>
                                            <span class="routine-display-reps ml-1 font-bold text-gray-800 dark:text-gray-200">${ex.reps || '--'}</span>
                                        </div>
                                        <div>
                                            <span class="text-gray-600 dark:text-gray-400 font-semibold">Weight:</span>
                                            <span class="routine-display-weight ml-1 font-bold text-gray-800 dark:text-gray-200">${ex.weight ? `${ex.weight}${ex.unit || 'lbs'}` : '--'}</span>
                                        </div>
                                    </div>
                                `}
                            </div>
                            
                            <!-- Edit Mode (hidden by default) -->
                            <div class="routine-fields-container hidden mt-2 space-y-2">
                                ${isCardio ? `
                                    <div class="grid grid-cols-2 gap-2">
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Duration (min)</label>
                                            <input type="number" step="0.5" class="routine-duration w-full px-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-gray-100" 
                                                   value="${ex.duration_minutes || ''}" min="0">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Intensity</label>
                                            <select class="routine-intensity w-full px-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-gray-100">
                                                <option value="">Select</option>
                                                <option value="Low" ${ex.intensity === 'Low' ? 'selected' : ''}>Low</option>
                                                <option value="Moderate" ${ex.intensity === 'Moderate' ? 'selected' : ''}>Moderate</option>
                                                <option value="High" ${ex.intensity === 'High' ? 'selected' : ''}>High</option>
                                            </select>
                                        </div>
                                    </div>
                                ` : `
                                    <div class="grid grid-cols-3 gap-2">
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Sets</label>
                                            <input type="number" class="routine-sets w-full px-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-center text-gray-900 dark:text-gray-100" 
                                                   value="${ex.sets || ''}" min="1" placeholder="${ex.sets || '0'}">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Reps</label>
                                            <input type="number" class="routine-reps w-full px-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-center text-gray-900 dark:text-gray-100" 
                                                   value="${ex.reps || ''}" min="1" placeholder="${ex.reps || '0'}">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Weight</label>
                                            <div class="flex gap-1">
                                                <input type="number" step="0.5" class="routine-weight flex-1 px-1 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-center text-gray-900 dark:text-gray-100" 
                                                       value="${ex.weight || ''}" min="0" placeholder="${ex.weight || '0'}">
                                                <select class="routine-unit px-1 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-gray-100">
                                                    <option value="lb" ${ex.unit === 'lb' ? 'selected' : ''}>lbs</option>
                                                    <option value="kg" ${ex.unit === 'kg' ? 'selected' : ''}>kg</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="button" class="routine-update-display-btn w-full px-3 py-1.5 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-all mt-1">
                                        Update Display
                                    </button>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            `);
            
            container.append(exerciseRow);
        });
        
        // Attach event handlers
        attachRoutineExerciseHandlers();
    }
    
    // Attach event handlers for routine exercises
    function attachRoutineExerciseHandlers() {
        // Checkbox completion handler
        $(document).off('change', '.routine-exercise-checkbox').on('change', '.routine-exercise-checkbox', async function() {
            const checkbox = $(this);
            const exerciseRow = checkbox.closest('.routine-exercise-row');
            const exerciseIndex = parseInt(exerciseRow.data('exercise-index'));
            const exercise = loadedRoutine.exercises[exerciseIndex];
            const isComplete = checkbox.is(':checked');
            
            if (isComplete) {
                // Validate that exercise has required data
                const isCardio = exercise.exercise_type === 'cardio';
                
                if (isCardio) {
                    const duration = exerciseRow.find('.routine-duration').val() || exercise.duration_minutes;
                    if (!duration || duration <= 0) {
                        showError('Please enter duration before marking as complete');
                        checkbox.prop('checked', false);
                        return;
                    }
                } else {
                    const sets = exerciseRow.find('.routine-sets').val() || exercise.sets;
                    const reps = exerciseRow.find('.routine-reps').val() || exercise.reps;
                    if (!sets || sets < 1 || !reps || reps < 1) {
                        showError('Please enter sets and reps before marking as complete');
                        checkbox.prop('checked', false);
                        return;
                    }
                }
                
                // Save exercise to workout log
                try {
                    const saveResult = await saveRoutineExerciseToLog(exerciseRow, exercise, exerciseIndex);
                    console.log('Save completed successfully:', saveResult);
                    
                    // Update UI to show exercise is completed
                    exerciseRow.addClass('opacity-60');
                    exerciseRow.find('.routine-edit-btn').prop('disabled', true);
                    exerciseRow.css('background-color', 'rgba(240, 253, 244, 0.5)');
                    routineCompletedCount++;
                    updateRoutineProgress();
                    
                    // Small delay to ensure database has committed, then reload logged sets
                    setTimeout(async () => {
                        try {
                            await loadLoggedSets();
                            console.log('Logged sets reloaded successfully');
                        } catch (loadError) {
                            console.error('Error reloading logged sets:', loadError);
                        }
                    }, 300);
                    
                    showSuccess('Exercise logged successfully!');
                } catch (error) {
                    console.error('Error saving exercise:', error);
                    console.error('Error status:', error.status);
                    console.error('Error response:', error.responseJSON || error.responseText);
                    
                    // Check if it's actually an error or a success with unexpected format
                    if (error.status >= 200 && error.status < 300) {
                        // It might have succeeded but jQuery treated it as an error
                        console.log('Request succeeded despite error object');
                        exerciseRow.addClass('opacity-60');
                        exerciseRow.find('.routine-edit-btn').prop('disabled', true);
                        exerciseRow.css('background-color', 'rgba(240, 253, 244, 0.5)');
                        routineCompletedCount++;
                        updateRoutineProgress();
                        
                        setTimeout(async () => {
                            try {
                                await loadLoggedSets();
                            } catch (loadError) {
                                console.error('Error reloading logged sets:', loadError);
                            }
                        }, 300);
                        
                        showSuccess('Exercise logged successfully!');
                    } else {
                        // Actual error
                        const errorMessage = error.responseJSON?.error || error.responseText || error.message || 'Error saving exercise. Please try again.';
                        showError(errorMessage);
                        checkbox.prop('checked', false);
                    }
                }
            } else {
                exerciseRow.removeClass('opacity-60');
                exerciseRow.find('.routine-edit-btn').prop('disabled', false);
                exerciseRow.css('background-color', '');
                routineCompletedCount--;
                updateRoutineProgress();
            }
        });
        
        // Edit button handler
        $(document).off('click', '.routine-edit-btn').on('click', '.routine-edit-btn', function() {
            const exerciseRow = $(this).closest('.routine-exercise-row');
            const editBtn = $(this);
            const fieldsContainer = exerciseRow.find('.routine-fields-container');
            const isDisabled = editBtn.prop('disabled');
            
            if (isDisabled) return;
            
            if (fieldsContainer.hasClass('hidden')) {
                fieldsContainer.removeClass('hidden').slideDown(200);
                editBtn.html('<span class="text-xs font-bold">Done</span>');
            } else {
                fieldsContainer.slideUp(200, function() {
                    $(this).addClass('hidden');
                });
                editBtn.html('<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>');
            }
        });
        
        // Update display button handler (for strength exercises)
        $(document).off('click', '.routine-update-display-btn').on('click', '.routine-update-display-btn', function() {
            const exerciseRow = $(this).closest('.routine-exercise-row');
            const sets = exerciseRow.find('.routine-sets').val();
            const reps = exerciseRow.find('.routine-reps').val();
            const weight = exerciseRow.find('.routine-weight').val();
            const unit = exerciseRow.find('.routine-unit').val();
            
            exerciseRow.find('.routine-display-sets').text(sets || '--');
            exerciseRow.find('.routine-display-reps').text(reps || '--');
            exerciseRow.find('.routine-display-weight').text(weight ? `${weight}${unit}` : '--');
            
            exerciseRow.find('.routine-fields-container').slideUp(200, function() {
                $(this).addClass('hidden');
            });
            exerciseRow.find('.routine-edit-btn').html('<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>');
        });
    }
    
    // Save routine exercise to workout log
    async function saveRoutineExerciseToLog(exerciseRow, exercise, exerciseIndex) {
        const bodyPart = exercise.body_part;
        const exerciseName = exercise.exercise_name;
        const isCardio = exercise.exercise_type === 'cardio';
        const date = formatDateForInput(selectedDate);
        
        console.log('Saving routine exercise:', { bodyPart, exerciseName, isCardio, date });
        
        // Resolve exercise to standard or custom exercise ID
        let standardExerciseId = null;
        let customExerciseId = null;
        
        try {
            const exercisesResponse = await $.ajax({
                url: `/workout/api/exercises/${encodeURIComponent(bodyPart)}`,
                method: 'GET'
            });
            
            console.log('Exercises response:', exercisesResponse);
            
            const standardMatch = exercisesResponse.standardExercises?.find(
                ex => ex.exercise_name === exerciseName
            );
            
            if (standardMatch) {
                standardExerciseId = standardMatch.standard_exercise_id;
                console.log('Found standard exercise:', standardExerciseId);
            } else {
                const customMatch = exercisesResponse.customExercises?.find(
                    ex => ex.exercise_name === exerciseName
                );
                
                if (customMatch) {
                    customExerciseId = customMatch.custom_exercise_id;
                    console.log('Found custom exercise:', customExerciseId);
                } else {
                    console.log('Exercise not found, creating custom exercise...');
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
                    console.log('Created custom exercise:', customExerciseId);
                }
            }
        } catch (error) {
            console.error('Error resolving exercise:', error);
            try {
                console.log('Fallback: creating custom exercise...');
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
                console.log('Created custom exercise (fallback):', customExerciseId);
            } catch (createError) {
                console.error('Error creating custom exercise:', createError);
                throw new Error('Failed to resolve exercise. Please try again.');
            }
        }
        
        let exerciseLogData = {
            date: date,
            bodyPart: bodyPart,
            exerciseName: exerciseName,
            exercise_type: exercise.exercise_type
        };
        
        if (standardExerciseId) {
            exerciseLogData.standardExerciseId = standardExerciseId;
        } else if (customExerciseId) {
            exerciseLogData.customExerciseId = customExerciseId;
        } else {
            throw new Error('Failed to resolve exercise ID');
        }
        
        if (isCardio) {
            // Check if fields exist (in edit mode) or use exercise defaults
            const durationField = exerciseRow.find('.routine-duration');
            const intensityField = exerciseRow.find('.routine-intensity');
            
            const durationInput = durationField.length > 0 ? durationField.val() : null;
            const intensityInput = intensityField.length > 0 ? intensityField.val() : null;
            
            exerciseLogData.duration_minutes = durationInput ? parseFloat(durationInput) : (exercise.duration_minutes || null);
            exerciseLogData.intensity = intensityInput || exercise.intensity || null;
            
            if (!exerciseLogData.duration_minutes) {
                throw new Error('Duration is required for cardio exercises');
            }
        } else {
            // Check if fields exist (in edit mode) or use exercise defaults
            const setsField = exerciseRow.find('.routine-sets');
            const repsField = exerciseRow.find('.routine-reps');
            const weightField = exerciseRow.find('.routine-weight');
            const unitField = exerciseRow.find('.routine-unit');
            
            const setsInput = setsField.length > 0 ? setsField.val() : null;
            const repsInput = repsField.length > 0 ? repsField.val() : null;
            const weightInput = weightField.length > 0 ? weightField.val() : null;
            const unitInput = unitField.length > 0 ? unitField.val() : null;
            
            const sets = setsInput && setsInput !== '' ? parseInt(setsInput) : (exercise.sets || 1);
            const reps = repsInput && repsInput !== '' ? parseInt(repsInput) : (exercise.reps || 1);
            const weight = weightInput && weightInput !== '' ? parseFloat(weightInput) : (exercise.weight || 0);
            const unit = unitInput || exercise.unit || 'lb';
            
            if (sets < 1 || reps < 1) {
                throw new Error('Sets and reps must be at least 1');
            }
            
            exerciseLogData.sets = sets;
            exerciseLogData.reps = reps;
            exerciseLogData.weight = weight;
            exerciseLogData.unit = unit;
        }
        
        console.log('Sending exercise log data:', exerciseLogData);
        
        return new Promise((resolve, reject) => {
            $.ajax({
                url: '/workout/api/exercise_log',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(exerciseLogData),
                success: function(response, textStatus, jqXHR) {
                    console.log('Exercise logged successfully:', response, 'Status:', jqXHR.status);
                    resolve(response);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.error('AJAX error:', textStatus, errorThrown);
                    console.error('Response:', jqXHR.responseJSON || jqXHR.responseText);
                    
                    // If it's a 201 (Created), treat it as success
                    if (jqXHR.status === 201 || (jqXHR.status >= 200 && jqXHR.status < 300)) {
                        console.log('Treating as success despite error handler');
                        resolve(jqXHR.responseJSON || {success: true});
                    } else {
                        reject(jqXHR);
                    }
                }
            });
        });
    }
    
    // Update routine progress
    function updateRoutineProgress() {
        if (!loadedRoutine) return;
        
        const total = loadedRoutine.exercises ? loadedRoutine.exercises.length : 0;
        const percentage = total > 0 ? (routineCompletedCount / total) * 100 : 0;
        
        $('#routine-progress').text(`${routineCompletedCount}/${total}`);
        $('#routine-progress-bar').css('width', `${percentage}%`);
    }
    
    // Clear loaded routine
    function clearLoadedRoutine() {
        if (confirm('Clear the loaded routine? Progress will be preserved in your workout log.')) {
            loadedRoutine = null;
            routineCompletedCount = 0;
            $('#loaded-routine-display').slideUp(300, function() {
                $(this).addClass('hidden');
            });
            $('#routine-select').val('');
            showSuccess('Routine cleared');
        }
    }
    
    // Escape HTML helper
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
