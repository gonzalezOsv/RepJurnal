$(document).ready(function () {
    const bodyPartSelect = $('#body-part');
    const exerciseSelect = $('#exercise');
    let customExerciseInput = null;
    const loggedSetsContainer = $('<div id="logged-sets" class="mt-8 space-y-2"></div>');

    // Add container for logged sets after the form
    $('#workout-form').after(loggedSetsContainer);

    // Load body parts and logged sets on page load
    loadBodyParts();
    loadLoggedSets();

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
            const response = await $.get('/workout/api/logged-sets');

            const loggedSets = response.logged_sets;

            // Populate logged sets
            loggedSets.forEach(set => {
                addLoggedSet(set.exercise_name, set.weight, set.unit, set.reps, set.sets, set.id);
            });

        } catch (error) {
            console.error('Error loading logged sets:', error);
            showError('Error loading logged sets. Please refresh the page.');
        }
    }

    // Toggle Tips Section
    $("#tips-toggle").click(function () {
        $("#tips-content").slideToggle();
        const arrow = $("#tips-arrow").text();
        $("#tips-arrow").text(arrow === "▼" ? "▲" : "▼");
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
        const liftId = $(this).data('id'); // Get the ID of the lift to delete
        try {
            await $.ajax({
                url: `/workout/api/logged-sets/${liftId}`,
                method: 'DELETE',
            });
    
            // Remove the deleted lift from the DOM
            $(`[data-id="${liftId}"]`).fadeOut(() => $(this).remove());
        } catch (error) {
            console.error('Error deleting lift:', error);
            alert('Failed to delete the lift. Please try again.');
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
                sets: $('#sets').val() || 1
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

            addLoggedSet(
                exerciseData.exerciseName || $('option:selected', exerciseSelect).text(),
                exerciseData.weight,
                exerciseData.unit,
                exerciseData.reps,
                exerciseData.sets
            );

            resetForm();

        } catch (error) {
            console.error('Error logging exercise:', error);
            showError('Error logging exercise. Please try again.');
        }
    });

function addLoggedSet(exerciseName, weight, unit, reps, sets, liftId) {
    const setDiv = $(`
        <div class="bg-blue-50 p-4 rounded-lg shadow flex justify-between items-center" data-id="${liftId}">
            <p class="text-lg font-medium text-blue-900 flex-1 mr-4">  <!-- Added margin-right (mr-4) to separate from the button -->
                <strong>${exerciseName}</strong>: ${sets} X ${reps} at ${weight} ${unit}
            </p>
            <div class="flex gap-2">
                <button 
                    class="delete-btn bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    data-id="${liftId}">
                    Delete
                </button>
            </div>
        </div>
    `);
    
    $('#logged-sets').prepend(setDiv);
    setDiv.hide().fadeIn();
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
            <div class="bg-red-50 text-red-900 px-4 py-3 rounded relative mb-4" role="alert">
                <span class="block sm:inline">${message}</span>
            </div>
        `);
        $('#workout-form').prepend(errorDiv);
        setTimeout(() => errorDiv.fadeOut('slow', function () { $(this).remove(); }), 3000);
    }
});
