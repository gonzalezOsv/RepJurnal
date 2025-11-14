$(document).ready(function () {
    const workoutTypeSelect = $('#workout-type');
    const bodyPartSelect = $('#body-part');
    const exerciseSelect = $('#exercise');
    const deleteAllBtn = $('#delete-all-workouts-btn');
    let customExerciseInput = null;
    let selectedDate = new Date();
    let allBodyParts = []; // Store all body parts for filtering

    // Set today's date in the date picker
    const datePicker = $('#workout-date-picker');
    datePicker.val(RoutineUtils.formatDateForInput(selectedDate));
    updateDisplayDate();

    function getCsrfToken() {
        return $('#workout-form input[name="csrf_token"]').val() || (window.CSRF && window.CSRF.getToken && window.CSRF.getToken());
    }

    const routineManager = new RoutineSessionManager({
        getCsrfToken,
        getSelectedDate: () => selectedDate,
        loadLoggedSets: () => loadLoggedSets(),
        showSuccess: UIHelpers.showSuccess,
        showError: UIHelpers.showError
    });
    routineManager.init();

    // Load body parts, routines, and logged sets on page load
    loadBodyParts();
    loadRoutines();
    loadLoggedSets();
    
    // Initialize scroll-to-add-exercise button
    initScrollToAddExerciseButton();
    
    // Collapsible sections
    initCollapsibleSections();
    
    // Desktop quick add button (scroll to form)
    $('#scrollToForm').on('click', function() {
        const formElement = document.getElementById('add-exercise-form');
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Expand the form if collapsed
        if ($('#add-exercise-content').hasClass('hidden')) {
            $('.add-exercise-header').click();
        }
    });
    
    // Routine loading functionality
    routineManager.checkAndLoadRoutineFromSession();

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
        datePicker.val(RoutineUtils.formatDateForInput(selectedDate));
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

    // Using RoutineUtils.formatDateForInput() from shared module

    function getSelectedDate() {
        return selectedDate;
    }

    async function loadBodyParts() {
        try {
            const response = await $.get('/workout/api/bodyparts');
            if (Array.isArray(response)) {
                allBodyParts = Array.from(new Set(response)).sort((a, b) => a.localeCompare(b));
            } else if (response && Array.isArray(response.body_parts)) {
                allBodyParts = Array.from(new Set(response.body_parts)).sort((a, b) => a.localeCompare(b));
            } else {
                console.warn('Unexpected body parts payload:', response);
                allBodyParts = [];
            }

            if (allBodyParts.length === 0) {
                UIHelpers.showError('No body parts available. Please ensure reference data is seeded.');
                bodyPartSelect.prop('disabled', true);
                resetExerciseSelect();
                return;
            }

            filterBodyPartsByWorkoutType();
        } catch (error) {
            console.error('Error loading body parts:', error);
            UIHelpers.showError('Error loading body parts. Please refresh the page.');
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
            filteredBodyParts = [...allBodyParts];
        } else {
            // Filter based on workout type category
            const allowedParts = workoutTypeCategories[selectedWorkoutType] || [];
            filteredBodyParts = allBodyParts.filter(part => allowedParts.includes(part));

            if (filteredBodyParts.length === 0) {
                console.warn(`No mapped body parts for workout type "${selectedWorkoutType}". Falling back to all body parts.`);
                filteredBodyParts = [...allBodyParts];
            }
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

        updateSubmitButtonState();
    });

    async function loadLoggedSets() {
        try {
            const dateStr = RoutineUtils.formatDateForInput(selectedDate);
            const response = await $.get(`/workout/api/logged-sets?date=${dateStr}`);
            const loggedSets = response.logged_sets;

            // Clear the logged sets container
            $('#logged-sets').empty();

            toggleDeleteAllButton(loggedSets.length > 0);

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

            // Update desktop stats
            updateDesktopStats(loggedSets);

        } catch (error) {
            console.error('Error loading logged sets:', error);
            UIHelpers.showError('Error loading logged sets. Please refresh the page.');
            toggleDeleteAllButton(false);
        }
    }

    function showEmptyState() {
        WorkoutTemplateHelpers.showEmptyState($('#logged-sets'));
        // Reset stats to zero
        updateDesktopStats([]);
        toggleDeleteAllButton(false);
    }

    function toggleDeleteAllButton(shouldShow) {
        if (!deleteAllBtn.length) {
            return;
        }

        if (shouldShow) {
            deleteAllBtn.removeClass('hidden');
        } else {
            deleteAllBtn.addClass('hidden');
            deleteAllBtn.prop('disabled', false).removeClass('opacity-60 cursor-not-allowed');
        }
    }

    // Update desktop stats (only visible on large screens)
    function updateDesktopStats(loggedSets) {
        // Count unique exercises
        const uniqueExercises = new Set(loggedSets.map(set => set.exercise_name)).size;
        $('#stats-exercises-count').text(uniqueExercises);
        
        // Calculate total volume (sets × reps × weight) for strength exercises
        let totalVolume = 0;
        let totalSets = 0;
        loggedSets.forEach(set => {
            if (set.exercise_type !== 'cardio' && set.weight && set.reps && set.sets) {
                totalVolume += (set.weight * set.reps * set.sets);
                totalSets += set.sets;
            }
        });
        
        // Format volume with comma separator
        const formattedVolume = Math.round(totalVolume).toLocaleString();
        const unit = loggedSets.length > 0 && loggedSets[0].unit === 'kg' ? 'kg' : 'lbs';
        $('#stats-total-volume').text(totalVolume > 0 ? `${formattedVolume} ${unit}` : '0 lbs');
        
        // Count unique body parts
        const uniqueBodyParts = new Set(
            loggedSets
                .map(set => set.body_part)
                .filter(bp => bp) // Filter out null/undefined
        ).size;
        $('#stats-body-parts').text(uniqueBodyParts);
        
        // Total sets
        $('#stats-total-sets').text(totalSets);
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

        updateSubmitButtonState();
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
            UIHelpers.showError('Error loading exercises. Please try again.');
        }
    }

    exerciseSelect.on('change', function () {
        const selectedValue = $(this).val();
        handleCustomExerciseInput(selectedValue);
        updateSubmitButtonState();
    });

    function handleCustomExerciseInput(selectedValue) {
        if (customExerciseInput) {
            customExerciseInput.remove();
            customExerciseInput = null;
        }

        if (selectedValue === 'new_custom') {
            customExerciseInput = $(
                `<div class="mt-4">
                    <label class="block text-sm sm:text-base font-bold text-gray-700 dark:text-gray-300 mb-2">✏️ Custom Exercise Name</label>
                    <input type="text" 
                           id="custom-exercise-name"
                           class="w-full px-4 py-3.5 sm:py-4 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-base font-medium text-gray-900 dark:text-gray-100" 
                           placeholder="Enter exercise name">
                </div>`
            );
            exerciseSelect.after(customExerciseInput);
        }

        updateSubmitButtonState();
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
                UIHelpers.showError('Please enter at least duration or distance');
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
                UIHelpers.showError('Please enter valid values for all fields');
                return;
            }
            
            updateData.weight = weight;
            updateData.reps = reps;
            updateData.sets = sets;
            updateData.unit = unit;
            updateData.exercise_type = 'strength';
        }
        
        try {
            const csrfToken = getCsrfToken();

            // Update all sets in the variation - only need one request as backend handles all IDs
            await $.ajax({
                url: `/workout/api/logged-sets/${firstId}`,
                method: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify({
                    ...updateData,
                    csrf_token: csrfToken
                }),
                beforeSend: function(xhr) {
                    if (csrfToken) {
                        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                    }
                }
            });
            
            // Reload logged sets to show updated data
            await loadLoggedSets();
            
            UIHelpers.showSuccess('Exercise updated successfully! ✨');
        } catch (error) {
            console.error('Error updating variation:', error);
            UIHelpers.showError('Failed to update the exercise. Please try again.');
            
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
            const csrfToken = getCsrfToken();

            // Delete all sets in this variation
            const deletePromises = idsArray.map(id => 
                $.ajax({
                    url: `/workout/api/logged-sets/${id}`,
                    method: 'DELETE',
                    beforeSend: function(xhr) {
                        if (csrfToken) {
                            xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                        }
                    },
                    data: JSON.stringify({ csrf_token: csrfToken }),
                    contentType: 'application/json'
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
            
            UIHelpers.showSuccess('Set variation deleted successfully');
        } catch (error) {
            console.error('Error deleting variation:', error);
            UIHelpers.showError('Failed to delete the set variation. Please try again.');
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
        const $modalFragment = WorkoutTemplateHelpers.showDeleteModal(exerciseName, totalSets);
        
        if (!$modalFragment) {
            UIHelpers.showError('Failed to show delete confirmation');
            return;
        }
        
        $('body').append($modalFragment);
        
        // Get reference to the actual modal in the DOM
        const $modal = $('#delete-exercise-confirmation-modal');
        
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
                const csrfToken = getCsrfToken();

                // Delete all sets in all variations
                const deletePromises = allIds.map(id => 
                    $.ajax({
                        url: `/workout/api/logged-sets/${id}`,
                        method: 'DELETE',
                        beforeSend: function(xhr) {
                            if (csrfToken) {
                                xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                            }
                        },
                        data: JSON.stringify({ csrf_token: csrfToken }),
                        contentType: 'application/json'
                    })
                );
                
                await Promise.all(deletePromises);
        
                // Close modal
                $modal.addClass('animate__fadeOut');
                setTimeout(() => $modal.remove(), 300);
        
                // Remove the card from the DOM with animation
                exerciseCard.addClass('opacity-0 scale-95 transition-all duration-300');
                setTimeout(() => {
                    exerciseCard.remove();
                    if ($('#logged-sets').children('.exercise-card').length === 0) {
                        showEmptyState();
                    }
                }, 300);
                
                UIHelpers.showSuccess('Exercise deleted successfully');
            } catch (error) {
                console.error('Error deleting exercise:', error);
                btn.prop('disabled', false).html(`
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Yes, Delete All
                `);
                UIHelpers.showError('Failed to delete the exercise. Please try again.');
            }
        });
        
        // Handle cancel button
        $('#cancel-delete-exercise-btn').on('click', function() {
            $modal.addClass('animate__fadeOut');
            setTimeout(() => $modal.remove(), 300);
        });
        
        // Close on backdrop click
        $modal.on('click', function(e) {
            if ($(e.target).attr('id') === 'delete-exercise-confirmation-modal') {
                $modal.addClass('animate__fadeOut');
                setTimeout(() => $modal.remove(), 300);
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

        // Clear previous validation errors
        FormValidation.clearAllErrors();

        const workoutType = workoutTypeSelect.val();
        const bodyPart = bodyPartSelect.val();
        const exerciseValue = exerciseSelect.val();
        const isCardio = getIsCardioFromSelection();
        
        // Validate workout type and body part
        if (!workoutType || !bodyPart || !exerciseValue) {
            UIHelpers.showError('Please select workout type, body part, and exercise');
            return;
        }

        if (isCardio) {
            // Comprehensive cardio validation
            const cardioData = {
                bodyPart: bodyPart,
                exercise: exerciseValue,
                duration: $('#duration').val() ? parseFloat($('#duration').val()) : null,
                distance: $('#distance-value').val() ? parseFloat($('#distance-value').val()) : null,
                distanceUnit: $('#distance-unit').val(),
                calories: $('#calories').val() ? parseInt($('#calories').val()) : null,
                date: RoutineUtils.formatDateForInput(selectedDate)
            };
            
            const validation = FormValidation.validateCardioLog(cardioData);
            if (!validation.isValid) {
                // Show first error
                const firstError = Object.values(validation.errors)[0];
                UIHelpers.showError(firstError);
                
                // Highlight error fields
                Object.keys(validation.errors).forEach(field => {
                    const fieldMap = {
                        'duration': 'duration',
                        'distance': 'distance-value',
                        'calories': 'calories',
                        'date': 'workout-date-picker'
                    };
                    if (fieldMap[field]) {
                        FormValidation.showFieldError(fieldMap[field], validation.errors[field]);
                    }
                });
                return;
            }
        } else {
            // Comprehensive strength validation
            const strengthData = {
                bodyPart: bodyPart,
                exercise: exerciseValue,
                weight: $('#weight').val() ? parseFloat($('#weight').val()) : 0,
                reps: $('#reps').val() ? parseInt($('#reps').val()) : 0,
                sets: $('#sets').val() ? parseInt($('#sets').val()) : 1,
                date: RoutineUtils.formatDateForInput(selectedDate)
            };
            
            const validation = FormValidation.validateStrengthLog(strengthData);
            if (!validation.isValid) {
                // Show first error
                const firstError = Object.values(validation.errors)[0];
                UIHelpers.showError(firstError);
                
                // Highlight error fields
                Object.keys(validation.errors).forEach(field => {
                    FormValidation.showFieldError(field, validation.errors[field]);
                });
                return;
            }
        }

        try {
            let exerciseData = {
                bodyPart: bodyPart,
                exercise_type: isCardio ? 'cardio' : 'strength',
                workout_type: workoutType,
                date: RoutineUtils.formatDateForInput(selectedDate)
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
                
                // Validate custom exercise name
                const nameValidation = FormValidation.validateExerciseName(customName);
                if (!nameValidation.isValid) {
                    UIHelpers.showError(nameValidation.error);
                    FormValidation.showFieldError('custom-exercise-name', nameValidation.error);
                    return;
                }
                
                // Sanitize the name
                const sanitizedName = FormValidation.sanitizeText(customName, 100);

                const csrfToken = getCsrfToken();

                const customResponse = await $.ajax({
                    url: '/workout/api/custom-exercise',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        bodyPart: bodyPart,
                        exerciseName: sanitizedName,
                        csrf_token: csrfToken
                    }),
                    beforeSend: function(xhr) {
                        if (csrfToken) {
                            xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                        }
                    }
                });
                exerciseData.customExerciseId = customResponse.customExerciseId;
                exerciseData.exerciseName = sanitizedName;
            } else {
                const [type, id] = exerciseValue.split('_');
                if (type === 'standard') {
                    exerciseData.standardExerciseId = id;
                } else if (type === 'custom') {
                    exerciseData.customExerciseId = id;
                }
            }

            const csrfToken = $('#workout-form input[name="csrf_token"]').val() || (window.CSRF && window.CSRF.getToken && window.CSRF.getToken());

            await $.ajax({
                url: '/workout/api/exercise_log',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    ...exerciseData,
                    csrf_token: csrfToken
                }),
                beforeSend: function(xhr) {
                    if (csrfToken) {
                        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                    }
                }
            });

            UIHelpers.showSuccess('Exercise logged successfully!');
            resetForm();
            
            // Reload logged sets to show grouped data
            await loadLoggedSets();

        } catch (error) {
            console.error('Error logging exercise:', error);
            UIHelpers.showError('Error logging exercise. Please try again.');
        }
    });

function addExerciseCard(exerciseName, variations, exerciseType = 'strength') {
    // Clone exercise card template
    const $exerciseCard = WorkoutTemplateHelpers.cloneExerciseCard();
    
    if (!$exerciseCard) {
        console.error('Failed to create exercise card');
        return;
    }
    
    // Populate card with data
    WorkoutTemplateHelpers.populateExerciseCard($exerciseCard, exerciseName, variations, exerciseType);
    
    // Append and animate
    $('#logged-sets').append($exerciseCard);
    $exerciseCard.hide().fadeIn(300);
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

        updateSubmitButtonState();
    }

    function resetExerciseSelect() {
        exerciseSelect.empty();
        exerciseSelect.append('<option value="">Select Exercise</option>');
        if (customExerciseInput) {
            customExerciseInput.remove();
            customExerciseInput = null;
        }

        updateSubmitButtonState();
    }

    function updateSubmitButtonState() {
        const hasExercise = Boolean(exerciseSelect.val());
        logExerciseBtn.prop('disabled', !hasExercise);
    }

    // Using UIHelpers.showError() and UIHelpers.showSuccess() from shared module
    
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
        // Check if desktop (lg breakpoint: 1024px)
        const isDesktop = window.innerWidth >= 1024;
        
        // On desktop: expand all sections by default for better UX
        // On mobile: keep collapsed to save space
        if (isDesktop) {
            $('#add-exercise-content').removeClass('hidden');
            $('.add-exercise-arrow').css('transform', 'rotate(180deg)');
            
            $('#routine-card-content').removeClass('hidden');
            $('.routine-card-arrow').css('transform', 'rotate(180deg)');
        } else {
            // Mobile: Add Exercise starts expanded, Load Routine collapsed
            $('#add-exercise-content').removeClass('hidden');
            $('.add-exercise-arrow').css('transform', 'rotate(180deg)');
        }
        
        // Collapsible Add Exercise section toggle
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
        
        // Collapsible Load Routine section toggle
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
        
        // Collapsible Routine Details toggle (name, description, info banner)
        $('.routine-details-header').on('click', function() {
            const content = $('#routine-details-content');
            const arrow = $('.routine-details-arrow');
            
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
        await routineManager.fetchRoutines();
    }
    
    // Routine rendering and interactions are handled by RoutineSessionManager

    deleteAllBtn.on('click', async function() {
        if (!deleteAllBtn.length) {
            return;
        }

        try {
            const confirmMessage = 'This will delete every workout logged for the selected day. This action cannot be undone.';
            const confirmed = await UIHelpers.confirmAction(confirmMessage, 'Delete Workout', 'Cancel');
            if (!confirmed) {
                return;
            }

            deleteAllBtn.prop('disabled', true).addClass('opacity-60 cursor-not-allowed');

            const csrfToken = getCsrfToken();
            const dateStr = RoutineUtils.formatDateForInput(selectedDate);

            await $.ajax({
                url: '/workout/api/logged-sets/bulk-delete',
                method: 'DELETE',
                contentType: 'application/json',
                data: JSON.stringify({
                    date: dateStr,
                    csrf_token: csrfToken
                }),
                beforeSend: function(xhr) {
                    if (csrfToken) {
                        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                    }
                }
            });

            UIHelpers.showSuccess("Today's workout log has been cleared.");
            await loadLoggedSets();
        } catch (error) {
            console.error('Error deleting all workouts:', error);
            const message = error?.responseJSON?.error || 'Failed to delete workouts. Please try again.';
            UIHelpers.showError(message);
        } finally {
            deleteAllBtn.prop('disabled', false).removeClass('opacity-60 cursor-not-allowed');
        }
    });

    const logExerciseBtn = $('#log-exercise-btn');
});


