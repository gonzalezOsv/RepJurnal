$(document).ready(function () {
    const bodyPartSelect = $('#body-part');
    const exerciseSelect = $('#exercise');
    let customExerciseInput = null;
    let selectedDate = new Date();

    // Set today's date in the date picker
    const datePicker = $('#workout-date-picker');
    datePicker.val(formatDateForInput(selectedDate));
    updateDisplayDate();

    // Load body parts and logged sets on page load
    loadBodyParts();
    loadLoggedSets();

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
            bodyPartSelect.empty();
            bodyPartSelect.append('<option value="">Select Body Part</option>');
            response.forEach(bodyPart => {
                bodyPartSelect.append(`<option value="${bodyPart}">${bodyPart}</option>`);
            });
        } catch (error) {
            console.error('Error loading body parts:', error);
            showError('Error loading body parts. Please refresh the page.');
        }
    }

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

            // Group exercises by exercise_name, weight, and reps
            const groupedSets = {};
            loggedSets.forEach(set => {
                const key = `${set.exercise_name}_${set.weight}_${set.reps}`;
                if (!groupedSets[key]) {
                    groupedSets[key] = {
                        exercise_name: set.exercise_name,
                        weight: set.weight,
                        unit: set.unit,
                        reps: set.reps,
                        sets: 0,
                        ids: []
                    };
                }
                groupedSets[key].sets += set.sets;
                groupedSets[key].ids.push(set.id);
            });

            // Display grouped sets
            Object.values(groupedSets).forEach(set => {
                addLoggedSet(set.exercise_name, set.weight, set.unit, set.reps, set.sets, set.ids);
            });

        } catch (error) {
            console.error('Error loading logged sets:', error);
            showError('Error loading logged sets. Please refresh the page.');
        }
    }

    function showEmptyState() {
        $('#logged-sets').html(`
            <div class="flex flex-col items-center justify-center py-12 text-gray-400" id="empty-state">
                <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <p class="text-lg font-semibold">No exercises logged yet</p>
                <p class="text-sm mt-1">Start tracking your workout!</p>
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
        if (selectedBodyPart) {
            await loadExercises(selectedBodyPart);
        } else {
            resetExerciseSelect();
        }
    });

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

    $('#logged-sets').on('click', '.delete-btn', async function () {
        const liftIds = $(this).data('ids'); // Get array of IDs for grouped sets
        const idsArray = Array.isArray(liftIds) ? liftIds : [liftIds];
        const setCard = $(this).closest('.set-card');
        
        try {
            // Delete all sets in the group
            const deletePromises = idsArray.map(id => 
                $.ajax({
                    url: `/workout/api/logged-sets/${id}`,
                    method: 'DELETE',
                })
            );
            
            await Promise.all(deletePromises);
    
            // Remove the card from the DOM with animation
            setCard.addClass('opacity-0 scale-95 transition-all duration-300');
            setTimeout(() => {
                setCard.remove();
                if ($('#logged-sets').children('.set-card').length === 0) {
                    showEmptyState();
                }
            }, 300);
            
            showSuccessNotification('Exercise deleted successfully');
        } catch (error) {
            console.error('Error deleting lift:', error);
            showError('Failed to delete the exercise. Please try again.');
        }
    });
    

    $('#workout-form').on('submit', async function (e) {
        e.preventDefault();

        const bodyPart = bodyPartSelect.val();
        const exerciseValue = exerciseSelect.val();

        if (!bodyPart || !exerciseValue || !$('#weight').val() || !$('#reps').val()) {
            showError('Please fill in all fields');
            return;
        }

        try {
            let exerciseData = {
                bodyPart: bodyPart,
                weight: $('#weight').val() || 0,
                unit: $('#unit').val(),
                reps: $('#reps').val(),
                sets: $('#sets').val() || 1,
                date: formatDateForInput(selectedDate)
            };

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

function addLoggedSet(exerciseName, weight, unit, reps, sets, liftIds) {
    const setDiv = $(`
        <div class="set-card bg-white border-2 border-gray-200 hover:border-blue-300 rounded-xl shadow-md hover:shadow-lg p-5 transition-all duration-300">
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <h3 class="text-gray-800 font-bold text-lg mb-3">${exerciseName}</h3>
                    <div class="flex items-center gap-3 text-sm">
                        <div class="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                            <span class="text-gray-600 text-xs">Sets</span>
                            <span class="text-blue-700 font-bold ml-1">${sets}</span>
                        </div>
                        <div class="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                            <span class="text-gray-600 text-xs">Reps</span>
                            <span class="text-green-700 font-bold ml-1">${reps}</span>
                        </div>
                        <div class="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                            <span class="text-gray-600 text-xs">Weight</span>
                            <span class="text-purple-700 font-bold ml-1">${weight} ${unit}</span>
                        </div>
                    </div>
                </div>
                <button 
                    class="delete-btn bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 p-3 rounded-lg transition-all duration-300 ml-4 border border-gray-200 hover:border-red-300"
                    data-ids='${JSON.stringify(liftIds)}'
                    title="Delete exercise">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        </div>
    `);
    
    $('#logged-sets').append(setDiv);
    setDiv.hide().fadeIn(300);
}

    function resetForm() {
        $('#weight').val('');
        $('#reps').val('');
        if (customExerciseInput) {
            customExerciseInput.remove();
            customExerciseInput = null;
        }
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
            <div class="fixed top-4 right-4 bg-white border-l-4 border-red-500 text-gray-800 px-6 py-4 rounded-lg shadow-xl z-50 flex items-center gap-3 animate__animated animate__fadeInRight">
                <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div class="fixed top-4 right-4 bg-white border-l-4 border-green-500 text-gray-800 px-6 py-4 rounded-lg shadow-xl z-50 flex items-center gap-3 animate__animated animate__fadeInRight">
                <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
});
