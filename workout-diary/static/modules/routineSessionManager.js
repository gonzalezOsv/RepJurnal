(function(window, $) {
    'use strict';

    function RoutineSessionManager(options) {
        this.getCsrfToken = options.getCsrfToken;
        this.getSelectedDate = options.getSelectedDate;
        this.loadLoggedSets = options.loadLoggedSets;
        this.showSuccess = options.showSuccess || (window.UIHelpers && window.UIHelpers.showSuccess);
        this.showError = options.showError || (window.UIHelpers && window.UIHelpers.showError);

        this.routines = [];
        this.loadedRoutine = null;
        this.routineCompletedCount = 0;
        this.routineSessionId = null;
        this.routineStartTime = null;
        this.pendingRoutineLogs = new Map();
    }

    RoutineSessionManager.prototype.init = function() {
        this.cacheDom();
        this.bindBaseEvents();
    };

    RoutineSessionManager.prototype.cacheDom = function() {
        this.$routineSelect = $('#routine-select');
        this.$loadRoutineBtn = $('#load-routine-btn');
        this.$finishRoutineBtn = $('#finish-routine-btn');
        this.$routineCardContent = $('#routine-card-content');
        this.$routineCardArrow = $('.routine-card-arrow');
        this.$addExerciseArrow = $('.add-exercise-arrow');
        this.$addExerciseContent = $('#add-exercise-content');
        this.$loadedRoutineDisplay = $('#loaded-routine-display');
        this.$loadedRoutineName = $('#loaded-routine-name');
        this.$loadedRoutineDesc = $('#loaded-routine-desc');
        this.$routineExercisesList = $('#routine-exercises-list');
        this.$routineProgressText = $('#routine-progress');
        this.$routineProgressBar = $('#routine-progress-bar');
        this.routineExerciseTemplate = document.getElementById('routine-exercise-row-template');
    };

    RoutineSessionManager.prototype.bindBaseEvents = function() {
        const self = this;

        this.$routineSelect.on('change', function() {
            const routineId = parseInt($(this).val(), 10);
            if (routineId) {
                self.$loadRoutineBtn
                    .prop('disabled', false)
                    .removeClass('bg-gray-400 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed opacity-60')
                    .addClass('bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white cursor-pointer');
            } else {
                self.$loadRoutineBtn
                    .prop('disabled', true)
                    .removeClass('bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white cursor-pointer')
                    .addClass('bg-gray-400 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed opacity-60');
            }
        });

        this.$loadRoutineBtn.on('click', function() {
            self.loadSelectedRoutine();
        });

        this.$finishRoutineBtn.on('click', function() {
            self.finishRoutine();
        });
    };

    RoutineSessionManager.prototype.fetchRoutines = async function() {
        try {
            const response = await $.get('/api/routines');
            this.routines = response.routines || [];
            this.populateRoutineSelect();
        } catch (error) {
            console.error('Error loading routines:', error);
            (this.showError || console.error).call(null, 'Error loading routines. Please try again later.');
        }
    };

    RoutineSessionManager.prototype.populateRoutineSelect = function() {
        const $select = this.$routineSelect;
        $select.empty().append('<option value="">Select a routine...</option>');

        const myRoutines = this.routines.filter(r => !r.is_imported);
        const importedRoutines = this.routines.filter(r => r.is_imported);

        if (myRoutines.length > 0) {
            const myGroup = $('<optgroup label="📋 My Routines"></optgroup>');
            myRoutines.forEach(routine => {
                const exerciseCount = routine.exercises ? routine.exercises.length : 0;
                myGroup.append(`<option value="${routine.routine_id}">  ${RoutineUtils.escapeHtml(routine.routine_name)} (${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''})</option>`);
            });
            $select.append(myGroup);
        }

        if (importedRoutines.length > 0) {
            const importedGroup = $('<optgroup label="📥 Imported Routines"></optgroup>');
            importedRoutines.forEach(routine => {
                const exerciseCount = routine.exercises ? routine.exercises.length : 0;
                const fromUser = routine.imported_from_username ? ` (from @${RoutineUtils.escapeHtml(routine.imported_from_username)})` : '';
                importedGroup.append(`<option value="${routine.routine_id}">  ${RoutineUtils.escapeHtml(routine.routine_name)} (${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''})${fromUser}</option>`);
            });
            $select.append(importedGroup);
        }

        if (this.routines.length === 0) {
            $select.append('<option value="" disabled>No routines available</option>');
        }

        this.$loadRoutineBtn
            .prop('disabled', true)
            .removeClass('bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white cursor-pointer')
            .addClass('bg-gray-400 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed opacity-60');
    };

    RoutineSessionManager.prototype.loadSelectedRoutine = function() {
        const routineId = parseInt(this.$routineSelect.val(), 10);
        if (!routineId) {
            (this.showError || console.error).call(null, 'Please select a routine to load');
            return;
        }

        const routine = this.routines.find(r => r.routine_id === routineId);
        if (!routine) {
            (this.showError || console.error).call(null, 'Routine not found');
            return;
        }

        this.loadRoutineToPage(routine);
    };

    RoutineSessionManager.prototype.loadRoutineToPage = async function(routine) {
        const self = this;
        this.pendingRoutineLogs.clear();
        this.loadedRoutine = routine;
        this.routineCompletedCount = 0;
        this.routineStartTime = new Date();

        const isImported = routine.is_imported || false;
        const importedBadge = isImported
            ? ` <span class="inline-flex items-center px-2 py-0.5 text-xs font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full">📥 Imported</span>`
            : '';
        this.$loadedRoutineName.html(`${RoutineUtils.escapeHtml(routine.routine_name)}${importedBadge}`);

        const description = routine.description || 'No description';
        const creatorInfo = isImported && routine.imported_from_username
            ? `<span class="block mt-1 text-xs"><strong>From:</strong> @${RoutineUtils.escapeHtml(routine.imported_from_username)}</span>`
            : '';
        this.$loadedRoutineDesc.html(`${RoutineUtils.escapeHtml(description)}${creatorInfo}`);

        this.$loadedRoutineDisplay.removeClass('hidden').slideDown(300);

        this.renderRoutineExercises();
        this.updateRoutineProgress();

        if (this.$addExerciseContent && this.$addExerciseContent.length && !this.$addExerciseContent.hasClass('hidden')) {
            this.$addExerciseContent.slideUp(300, function() {
                $(this).addClass('hidden');
            });
            if (this.$addExerciseArrow && this.$addExerciseArrow.length) {
                this.$addExerciseArrow.css('transform', 'rotate(0deg)');
            }
        }

        if (this.$routineCardContent.hasClass('hidden')) {
            this.$routineCardContent.removeClass('hidden').slideDown(300);
            this.$routineCardArrow.css('transform', 'rotate(180deg)');
        }

        if (this.showSuccess) {
            this.showSuccess(`Loaded ${isImported ? 'imported routine' : 'routine'} "${routine.routine_name}" with ${routine.exercises.length} exercises. Complete exercises as you go!`);
        }

        try {
            const csrfToken = this.getCsrfToken();
            const response = await $.ajax({
                url: '/api/routines/session/start',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    routine_id: routine.routine_id,
                    total_exercises: routine.exercises.length,
                    workout_date: RoutineUtils.formatDateForInput(this.getSelectedDate()),
                    csrf_token: csrfToken
                }),
                beforeSend: function(xhr) {
                    if (csrfToken) {
                        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                    }
                }
            });
            this.routineSessionId = response.session_id;
        } catch (error) {
            console.error('Error creating routine session:', error);
            this.routineSessionId = null;
        }

        $(document).off('change', '.routine-exercise-checkbox');
        $(document).off('click', '.routine-edit-btn');
        $(document).off('click', '.routine-update-display-btn');

        this.attachRoutineExerciseHandlers();
    };

    RoutineSessionManager.prototype.renderRoutineExercises = function() {
        const container = this.$routineExercisesList;
        container.empty();

        if (!this.loadedRoutine || !this.loadedRoutine.exercises || this.loadedRoutine.exercises.length === 0) {
            container.html('<p class="text-sm text-gray-500 dark:text-gray-400 text-center">No exercises in this routine</p>');
            return;
        }

        const template = this.routineExerciseTemplate;
        if (!template) {
            console.error('Routine exercise template not found');
            return;
        }

        this.loadedRoutine.exercises.forEach((exercise, index) => {
            const fragment = template.content.cloneNode(true);
            const element = fragment.querySelector('.routine-exercise-row');
            if (!element) {
                console.error('Routine exercise template is missing the root .routine-exercise-row');
                return;
            }

            const $row = $(element);
            $row.attr('data-exercise-index', index);

            const exerciseName = exercise.exercise_name || 'Unnamed Exercise';
            const bodyPart = exercise.body_part || '';

            $row.find('.routine-exercise-name').text(exerciseName);
            $row.find('.routine-body-part').text(bodyPart);
            $row.find('.routine-exercise-checkbox').prop('checked', false);
            $row.find('.routine-edit-btn').prop('disabled', false);

            const isCardio = exercise.exercise_type === 'cardio';
            const $cardioDisplay = $row.find('.routine-display-cardio');
            const $strengthDisplay = $row.find('.routine-display-strength');
            const $cardioFields = $row.find('.routine-cardio-fields');
            const $strengthFields = $row.find('.routine-strength-fields');

            if (isCardio) {
                $cardioDisplay.removeClass('hidden');
                $cardioFields.removeClass('hidden');
                $strengthDisplay.addClass('hidden');
                $strengthFields.addClass('hidden');

                const duration = exercise.duration_minutes ? String(exercise.duration_minutes) : '';
                const intensity = exercise.intensity ? String(exercise.intensity) : '';

                const $durationRow = $cardioDisplay.find('.duration-row');
                if (duration) {
                    $durationRow.removeClass('hidden');
                    $durationRow.find('.routine-display-duration').text(duration);
                } else {
                    $durationRow.addClass('hidden');
                }

                const $intensityRow = $cardioDisplay.find('.intensity-row');
                if (intensity) {
                    $intensityRow.removeClass('hidden');
                    $intensityRow.find('.routine-display-intensity').text(intensity);
                } else {
                    $intensityRow.addClass('hidden');
                }

                $row.find('.routine-duration').val(duration);
                $row.find('.routine-intensity').val(intensity);
            } else {
                $strengthDisplay.removeClass('hidden');
                $strengthFields.removeClass('hidden');
                $cardioDisplay.addClass('hidden');
                $cardioFields.addClass('hidden');

                const sets = exercise.sets !== undefined && exercise.sets !== null ? String(exercise.sets) : '';
                const reps = exercise.reps !== undefined && exercise.reps !== null ? String(exercise.reps) : '';
                const weight = exercise.weight !== undefined && exercise.weight !== null ? String(exercise.weight) : '';
                const unitValue = exercise.unit === 'kg' ? 'kg' : 'lb';
                const unitLabel = exercise.unit || (unitValue === 'kg' ? 'kg' : 'lbs');

                $strengthDisplay.find('.routine-display-sets').text(sets || '--');
                $strengthDisplay.find('.routine-display-reps').text(reps || '--');
                $strengthDisplay.find('.routine-display-weight').text(weight ? `${weight}${unitLabel}` : '--');

                const $setsInput = $row.find('.routine-sets');
                const $repsInput = $row.find('.routine-reps');
                const $weightInput = $row.find('.routine-weight');
                const $unitSelect = $row.find('.routine-unit');

                $setsInput.val(sets);
                $setsInput.attr('placeholder', sets || '0');

                $repsInput.val(reps);
                $repsInput.attr('placeholder', reps || '0');

                $weightInput.val(weight);
                $weightInput.attr('placeholder', weight || '0');

                $unitSelect.val(unitValue);
            }

            container.append($row);
        });

        this.attachRoutineExerciseHandlers();
    };

    RoutineSessionManager.prototype.attachRoutineExerciseHandlers = function() {
        const self = this;

        $(document).on('change.routineSession', '.routine-exercise-checkbox', function() {
            if (!self.loadedRoutine) return;

            const $checkbox = $(this);
            const $exerciseRow = $checkbox.closest('.routine-exercise-row');
            const exerciseIndex = parseInt($exerciseRow.data('exercise-index'), 10);
            const exercise = self.loadedRoutine.exercises[exerciseIndex];
            const isChecked = $checkbox.is(':checked');

            if (isChecked) {
                const validation = self.validateRoutineExerciseInputs($exerciseRow, exercise);
                if (!validation.isValid) {
                    (self.showError || console.error).call(null, validation.message);
                    $checkbox.prop('checked', false);
                    return;
                }

                self.pendingRoutineLogs.set(exerciseIndex, {
                    exerciseRow: $exerciseRow,
                    exercise
                });
                self.markRoutineExercisePending($exerciseRow);
                $exerciseRow.find('.routine-edit-btn').prop('disabled', false);
            } else {
                self.pendingRoutineLogs.delete(exerciseIndex);
                self.clearRoutineExercisePending($exerciseRow);
                $exerciseRow.find('.routine-edit-btn').prop('disabled', false);
            }

            self.routineCompletedCount = self.pendingRoutineLogs.size;
            self.updateRoutineProgress();
        });

        $(document).on('click.routineSession', '.routine-edit-btn', function() {
            const $exerciseRow = $(this).closest('.routine-exercise-row');
            const $editBtn = $(this);
            const $fields = $exerciseRow.find('.routine-fields-container');

            if ($editBtn.prop('disabled')) return;

            if ($fields.hasClass('hidden')) {
                $fields.removeClass('hidden').slideDown(200);
                $editBtn.html('<span class="text-xs font-bold">Done</span>');
            } else {
                $fields.slideUp(200, function() {
                    $(this).addClass('hidden');
                });
                $editBtn.html('<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>');
            }
        });

        $(document).on('click.routineSession', '.routine-update-display-btn', function() {
            const $exerciseRow = $(this).closest('.routine-exercise-row');
            const sets = $exerciseRow.find('.routine-sets').val();
            const reps = $exerciseRow.find('.routine-reps').val();
            const weight = $exerciseRow.find('.routine-weight').val();
            const unit = $exerciseRow.find('.routine-unit').val();

            $exerciseRow.find('.routine-display-sets').text(sets || '--');
            $exerciseRow.find('.routine-display-reps').text(reps || '--');
            $exerciseRow.find('.routine-display-weight').text(weight ? `${weight}${unit}` : '--');

            $exerciseRow.find('.routine-fields-container').slideUp(200, function() {
                $(this).addClass('hidden');
            });
            $exerciseRow.find('.routine-edit-btn').html('<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>');
        });
    };

    RoutineSessionManager.prototype.validateRoutineExerciseInputs = function($exerciseRow, exercise) {
        const isCardio = exercise.exercise_type === 'cardio';

        if (isCardio) {
            const $durationField = $exerciseRow.find('.routine-duration');
            const durationInput = $durationField.length ? parseFloat($durationField.val()) : null;
            const duration = Number.isFinite(durationInput) && durationInput > 0
                ? durationInput
                : (exercise.duration_minutes || null);

            if (!duration || duration <= 0) {
                return {
                    isValid: false,
                    message: 'Please enter duration before marking as complete'
                };
            }

            return { isValid: true };
        }

        const $setsField = $exerciseRow.find('.routine-sets');
        const $repsField = $exerciseRow.find('.routine-reps');

        const setsInput = $setsField.length ? $setsField.val() : null;
        const repsInput = $repsField.length ? $repsField.val() : null;

        const sets = setsInput !== null && setsInput !== ''
            ? parseInt(setsInput, 10)
            : (exercise.sets || 0);
        const reps = repsInput !== null && repsInput !== ''
            ? parseInt(repsInput, 10)
            : (exercise.reps || 0);

        if (!sets || sets < 1 || !reps || reps < 1) {
            return {
                isValid: false,
                message: 'Please enter sets and reps before marking as complete'
            };
        }

        return { isValid: true };
    };

    RoutineSessionManager.prototype.markRoutineExercisePending = function($exerciseRow) {
        $exerciseRow.addClass('opacity-60 routine-pending-complete');
        $exerciseRow.css('background-color', 'rgba(240, 253, 244, 0.5)');
    };

    RoutineSessionManager.prototype.clearRoutineExercisePending = function($exerciseRow) {
        $exerciseRow.removeClass('opacity-60 routine-pending-complete');
        $exerciseRow.css('background-color', '');
    };

    RoutineSessionManager.prototype.updateRoutineProgress = function() {
        if (!this.loadedRoutine) {
            this.$routineProgressText.text('0/0');
            this.$routineProgressBar.css('width', '0%');
            return;
        }

        const total = this.loadedRoutine.exercises ? this.loadedRoutine.exercises.length : 0;
        const percentage = total > 0 ? (this.routineCompletedCount / total) * 100 : 0;

        this.$routineProgressText.text(`${this.routineCompletedCount}/${total}`);
        this.$routineProgressBar.css('width', `${percentage}%`);
    };

    RoutineSessionManager.prototype.finishRoutine = async function() {
        if (!this.loadedRoutine) return;

        const totalExercises = this.loadedRoutine.exercises ? this.loadedRoutine.exercises.length : 0;
        const completedExercises = this.routineCompletedCount;
        const isFullyCompleted = completedExercises === totalExercises;
        const completionPercentage = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;
        const durationMinutes = this.routineStartTime ? (new Date() - this.routineStartTime) / 60000 : null;

        const confirmMessage = isFullyCompleted
            ? `🎉 Congratulations! You completed all ${totalExercises} exercises!\n\nFinish this routine session?`
            : `You completed ${completedExercises} of ${totalExercises} exercises (${Math.round(completionPercentage)}%).\n\nFinish this routine session anyway?`;

        const confirmed = await UIHelpers.confirmAction(
            confirmMessage,
            'Finish Routine',
            'Keep Working'
        );

        if (!confirmed) {
            return;
        }

        if (this.pendingRoutineLogs.size === 0) {
            (this.showError || console.error).call(null, 'Please mark at least one exercise as complete before finishing.');
            return;
        }

        try {
            const entries = Array.from(this.pendingRoutineLogs.entries());
            for (const [exerciseIndex, entry] of entries) {
                await this.logRoutineExercise(entry.exerciseRow, entry.exercise, exerciseIndex);
                entry.exerciseRow.find('.routine-exercise-checkbox').prop('checked', false);
                this.clearRoutineExercisePending(entry.exerciseRow);
                entry.exerciseRow.find('.routine-edit-btn').prop('disabled', false);
                this.pendingRoutineLogs.delete(exerciseIndex);
            }
        } catch (error) {
            console.error('Error logging routine exercises:', error);
            const message = error?.responseJSON?.error || error?.message || 'Failed to save routine exercises. Please try again.';
            (this.showError || console.error).call(null, message);
            this.routineCompletedCount = this.pendingRoutineLogs.size;
            this.updateRoutineProgress();
            return;
        }

        this.pendingRoutineLogs.clear();
        this.routineCompletedCount = 0;
        this.updateRoutineProgress();

        await this.loadLoggedSets();

        if (this.routineSessionId) {
            try {
                const csrfToken = this.getCsrfToken();

                await $.ajax({
                    url: `/api/routines/session/${this.routineSessionId}/finish`,
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        completed_exercises: completedExercises,
                        is_fully_completed: isFullyCompleted,
                        completion_percentage: completionPercentage,
                        duration_minutes: durationMinutes,
                        csrf_token: csrfToken
                    }),
                    beforeSend: function(xhr) {
                        if (csrfToken) {
                            xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                        }
                    }
                });
            } catch (error) {
                console.error('Error logging routine completion:', error);
            }
        }

        this.loadedRoutine = null;
        this.routineCompletedCount = 0;
        this.routineSessionId = null;
        this.routineStartTime = null;

        this.$loadedRoutineDisplay.slideUp(300, function() {
            $(this).addClass('hidden');
        });
        this.$routineSelect.val('');

        const successMsg = isFullyCompleted
            ? '🎉 Great job! Routine completed!'
            : 'Routine session finished. Keep up the good work!';
        if (this.showSuccess) {
            this.showSuccess(successMsg);
        }
    };

    RoutineSessionManager.prototype.logRoutineExercise = async function($exerciseRow, exercise, exerciseIndex) {
        const cursorDate = RoutineUtils.formatDateForInput(this.getSelectedDate());
        let standardExerciseId = null;
        let customExerciseId = null;

        try {
            const exercisesResponse = await $.ajax({
                url: `/workout/api/exercises/${encodeURIComponent(exercise.body_part)}`,
                method: 'GET'
            });

            const standardMatch = exercisesResponse.standardExercises?.find(
                ex => ex.exercise_name === exercise.exercise_name
            );

            if (standardMatch) {
                standardExerciseId = standardMatch.standard_exercise_id;
            } else {
                const customMatch = exercisesResponse.customExercises?.find(
                    ex => ex.exercise_name === exercise.exercise_name
                );

                if (customMatch) {
                    customExerciseId = customMatch.custom_exercise_id;
                } else {
                    const csrfToken = this.getCsrfToken();
                    const customResponse = await $.ajax({
                        url: '/workout/api/custom-exercise',
                        method: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            bodyPart: exercise.body_part,
                            exerciseName: exercise.exercise_name,
                            csrf_token: csrfToken
                        }),
                        beforeSend: function(xhr) {
                            if (csrfToken) {
                                xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                            }
                        }
                    });
                    customExerciseId = customResponse.customExerciseId;
                }
            }
        } catch (lookupError) {
            console.error('Error resolving exercise:', lookupError);
            const csrfToken = this.getCsrfToken();
            const customResponse = await $.ajax({
                url: '/workout/api/custom-exercise',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    bodyPart: exercise.body_part,
                    exerciseName: exercise.exercise_name,
                    csrf_token: csrfToken
                }),
                beforeSend: function(xhr) {
                    if (csrfToken) {
                        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                    }
                }
            });
            customExerciseId = customResponse.customExerciseId;
        }

        if (!standardExerciseId && !customExerciseId) {
            throw new Error('Failed to resolve exercise ID');
        }

        const exerciseLogData = {
            date: cursorDate,
            bodyPart: exercise.body_part,
            exerciseName: exercise.exercise_name,
            exercise_type: exercise.exercise_type
        };

        if (standardExerciseId) {
            exerciseLogData.standardExerciseId = standardExerciseId;
        } else if (customExerciseId) {
            exerciseLogData.customExerciseId = customExerciseId;
        }

        if (exercise.exercise_type === 'cardio') {
            const $durationField = $exerciseRow.find('.routine-duration');
            const durationInput = $durationField.length ? parseFloat($durationField.val()) : null;
            const duration = Number.isFinite(durationInput) && durationInput > 0
                ? durationInput
                : (exercise.duration_minutes || null);

            if (!duration || duration <= 0) {
                throw new Error('Duration is required for cardio exercises');
            }

            const $intensityField = $exerciseRow.find('.routine-intensity');
            const intensityInput = $intensityField.length ? $intensityField.val() : null;

            exerciseLogData.duration_minutes = duration;
            exerciseLogData.intensity = intensityInput || exercise.intensity || null;
            exerciseLogData.distance_miles = exercise.distance_miles || null;
            exerciseLogData.distance_km = exercise.distance_km || null;
            exerciseLogData.calories_burned = exercise.calories_burned || null;
            exerciseLogData.sets = 1;
            exerciseLogData.reps = 1;
            exerciseLogData.weight = 0;
        } else {
            const $setsField = $exerciseRow.find('.routine-sets');
            const $repsField = $exerciseRow.find('.routine-reps');
            const $weightField = $exerciseRow.find('.routine-weight');
            const $unitField = $exerciseRow.find('.routine-unit');

            const setsInput = $setsField.length ? $setsField.val() : null;
            const repsInput = $repsField.length ? $repsField.val() : null;
            const weightInput = $weightField.length ? $weightField.val() : null;
            const unitInput = $unitField.length ? $unitField.val() : null;

            exerciseLogData.sets = setsInput !== null && setsInput !== ''
                ? parseInt(setsInput, 10)
                : (exercise.sets || 1);
            exerciseLogData.reps = repsInput !== null && repsInput !== ''
                ? parseInt(repsInput, 10)
                : (exercise.reps || 1);
            exerciseLogData.weight = weightInput !== null && weightInput !== ''
                ? parseFloat(weightInput)
                : (exercise.weight || 0);
            exerciseLogData.unit = unitInput || exercise.unit || 'lb';
        }

        const csrfToken = this.getCsrfToken();

        await $.ajax({
            url: '/workout/api/exercise_log',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                ...exerciseLogData,
                csrf_token: csrfToken
            }),
            beforeSend: function(xhr) {
                if (csrfToken) {
                    xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                }
            }
        });
    };

    RoutineSessionManager.prototype.setRoutines = function(routines) {
        this.routines = routines || [];
        this.populateRoutineSelect();
    };

    RoutineSessionManager.prototype.loadRoutineById = function(routineId) {
        const routine = this.routines.find(r => r.routine_id === routineId);
        if (!routine) {
            (this.showError || console.error).call(null, 'Routine not found. It may have been deleted.');
            return;
        }

        this.$routineSelect.val(routineId);
        this.loadRoutineToPage(routine);
    };

    RoutineSessionManager.prototype.checkAndLoadRoutineFromSession = async function() {
        try {
            const response = await $.get('/api/routines/get-start-session');
            if (response.routine_id) {
                const routineId = response.routine_id;
                const loadWithDelay = () => {
                    this.loadRoutineById(routineId);
                };

                setTimeout(loadWithDelay, 500);
            }
        } catch (error) {
            console.error('Error checking session for routine:', error);
        }
    };

    window.RoutineSessionManager = RoutineSessionManager;
})(window, jQuery);

