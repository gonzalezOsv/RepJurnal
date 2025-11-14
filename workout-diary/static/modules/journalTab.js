/**
 * Workout Journal Tab Module
 * Handles loading and displaying comprehensive workout history
 */

const JournalTab = (function() {
    'use strict';

    let currentDays = 7;  // Default to 7 days

    /**
     * Initialize the journal tab
     */
    function init() {
        // Handle filter change
        $('#journal-filter-days').on('change', function() {
            currentDays = $(this).val() === 'all' ? 9999 : parseInt($(this).val());
            loadJournalData(currentDays);
        });
    }

    /**
     * Load journal data
     */
    async function loadJournalData(days) {
        try {
            showLoading();

            const response = await $.ajax({
                url: `/api/workout-history?days=${days}`,
                method: 'GET',
                timeout: 10000
            });

            if (response.success) {
                renderJournalData(response.workouts, response.summary);
            } else {
                throw new Error(response.error || 'Failed to load workout history');
            }

        } catch (error) {
            console.error('Error loading journal data:', error);
            showError();
        }
    }

    /**
     * Show loading state
     */
    function showLoading() {
        $('#journal-loading').removeClass('hidden');
        $('#journal-content').addClass('hidden');
    }

    /**
     * Hide loading state
     */
    function hideLoading() {
        $('#journal-loading').addClass('hidden');
        $('#journal-content').removeClass('hidden');
    }

    /**
     * Show error state
     */
    function showError() {
        $('#journal-loading').html(`
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 border-slate-200 dark:border-gray-700 p-6 max-w-md mx-auto">
                <div class="text-center py-8">
                    <svg class="w-16 h-16 mx-auto text-red-400 dark:text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <p class="text-gray-700 dark:text-gray-300 font-bold text-lg mb-2">Failed to Load Workouts</p>
                    <p class="text-gray-500 dark:text-gray-400 text-sm mb-4">There was an error loading your workout history</p>
                    <button id="retry-journal" class="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all">
                        Retry
                    </button>
                </div>
            </div>
        `);

        $('#retry-journal').on('click', function() {
            loadJournalData(currentDays);
        });
    }

    /**
     * Render journal data
     */
    function renderJournalData(workouts, summary) {
        hideLoading();

        // Update summary stats
        $('#journal-total-workouts').text(summary?.total_workouts || workouts.length);
        $('#journal-total-exercises').text(summary?.total_exercises || 0);
        $('#journal-total-sets').text(summary?.total_sets || 0);
        
        const totalVolume = summary?.total_volume || 0;
        $('#journal-total-volume').text(formatVolume(totalVolume));

        // Render workouts list
        if (!workouts || workouts.length === 0) {
            $('#workouts-list').empty();
            $('#journal-empty').removeClass('hidden');
        } else {
            $('#journal-empty').addClass('hidden');
            renderWorkoutsList(workouts);
        }
    }

    /**
     * Render workouts list
     */
    function renderWorkoutsList(workouts) {
        const $container = $('#workouts-list');
        $container.empty();
        
        workouts.forEach((workout, index) => {
            const workoutCard = createWorkoutCard(workout, index);
            $container.append(workoutCard);
        });
    }

    /**
     * Create a mobile-friendly workout card
     */
    function createWorkoutCard(workout, index) {
        if (!workout) {
            return $('<div></div>');
        }
        const rawExercises = Array.isArray(workout.exercises) ? workout.exercises : [];

        const isGroupedResponse = rawExercises.some(group => group && typeof group === 'object' && Array.isArray(group.items));
        const exerciseGroups = isGroupedResponse
            ? rawExercises.map(group => ({
                body_part: group?.body_part || 'Other',
                items: Array.isArray(group?.items) ? group.items : []
            }))
            : [{
                body_part: null,
                items: rawExercises
            }];

        const aggregateGroupExercises = (items, fallbackBodyPart) => {
            const map = new Map();

            (Array.isArray(items) ? items : []).forEach(original => {
                const displayName = (original.exercise_name || original.custom_exercise_name || original.standard_exercise_name || original.exercise || 'Unknown Exercise').trim();
                const exerciseType = original.exercise_type || 'strength';
                const key = `${displayName.toLowerCase()}__${exerciseType}`;

                if (!map.has(key)) {
                    map.set(key, {
                        displayName,
                        exercise_type: exerciseType,
                        entries: [],
                        body_part: original.body_part || fallbackBodyPart || null
                    });
                }

                const bucket = map.get(key);
                bucket.entries.push(original);

                if (!bucket.body_part && original.body_part) {
                    bucket.body_part = original.body_part;
                }
            });

            return Array.from(map.values()).map(bucket => {
                const isCardio = bucket.exercise_type === 'cardio';

                if (isCardio) {
                    const cardioVariations = bucket.entries.map(entry => ({
                        sets: entry.sets,
                        reps: entry.reps,
                        weight: entry.weight,
                        unit: entry.unit || 'lb',
                        intensity: entry.intensity,
                        duration_minutes: entry.duration_minutes,
                        distance_miles: entry.distance_miles,
                        distance_km: entry.distance_km,
                        distance_unit: entry.distance_unit,
                        notes: entry.notes
                    }));

                    return {
                        displayName: bucket.displayName,
                        isCardio: true,
                        variations: cardioVariations,
                        body_part: bucket.body_part
                    };
                }

                const strengthMap = new Map();

                bucket.entries.forEach(entry => {
                    const repsKey = entry.reps ?? '';
                    const weightKey = entry.weight ?? '';
                    const unitKey = entry.unit || 'lb';
                    const intensityKey = entry.intensity ?? '';
                    const key = `${repsKey}__${weightKey}__${unitKey}__${intensityKey}`;

                    const setsValue = Number(entry.sets);
                    const setsToAdd = Number.isFinite(setsValue) && setsValue > 0 ? setsValue : 1;

                    if (!strengthMap.has(key)) {
                        strengthMap.set(key, {
                            sets: setsToAdd,
                            reps: entry.reps,
                            weight: entry.weight,
                            unit: unitKey,
                            intensity: entry.intensity,
                            notes: entry.notes
                        });
                    } else {
                        const bucketVariation = strengthMap.get(key);
                        bucketVariation.sets += setsToAdd;

                        if (!bucketVariation.notes && entry.notes) {
                            bucketVariation.notes = entry.notes;
                        }
                    }
                });

                return {
                    displayName: bucket.displayName,
                    isCardio: false,
                    variations: Array.from(strengthMap.values()),
                    body_part: bucket.body_part
                };
            });
        };

        const aggregatedGroups = exerciseGroups.map(group => {
            const items = aggregateGroupExercises(group.items, group.body_part);

            const totalSets = items.reduce((sum, item) => {
                return sum + item.variations.reduce((innerSum, variation) => {
                    const numericSets = Number(variation.sets);
                    return innerSum + (Number.isFinite(numericSets) ? numericSets : 0);
                }, 0);
            }, 0);

            return {
                body_part: group.body_part,
                items,
                totalSets
            };
        });

        const totalUniqueExercises = aggregatedGroups.reduce((sum, group) => sum + (Array.isArray(group.items) ? group.items.length : 0), 0);

        const flatExercises = exerciseGroups.flatMap(group => Array.isArray(group.items) ? group.items : []);
        
        const date = new Date(workout.date);
        const dateStr = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
        });

        let totalSets = 0;
        let totalVolume = 0;
        let totalDuration = 0;

        flatExercises.forEach(ex => {
            if (ex.sets) totalSets += Number(ex.sets);
            if (ex.weight && ex.sets && ex.reps) {
                totalVolume += (Number(ex.weight) * Number(ex.sets) * Number(ex.reps));
            }
            if (ex.exercise_type === 'cardio' && ex.duration_minutes) {
                totalDuration += Number(ex.duration_minutes);
            }
        });

        const statChips = [];
        statChips.push(`
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
                ${totalUniqueExercises} exercises
            </span>
        `);

        if (totalSets > 0) {
            statChips.push(`
                <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                    </svg>
                    ${totalSets} sets
                </span>
            `);
        }

        if (totalVolume > 0) {
            statChips.push(`
                <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3v18h18"/>
                    </svg>
                    ${formatVolume(totalVolume)}
                </span>
            `);
        }

        if (totalDuration > 0) {
            statChips.push(`
                <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    ${totalDuration} min cardio
                </span>
            `);
        }

        const populatedGroups = aggregatedGroups.filter(group => Array.isArray(group.items) && group.items.length > 0);

        const renderExerciseItem = (item, displayIndex) => {
            const escapeName = RoutineUtils.escapeHtml(item.displayName);
            const bodyPartBadge = item.body_part
                ? `<span class="hidden sm:inline-flex items-center px-2 py-1 text-[10px] font-semibold uppercase tracking-wide bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full border border-blue-100 dark:border-blue-700">${RoutineUtils.escapeHtml(item.body_part)}</span>`
                : '';
            const typeBadge = item.isCardio
                ? `<span class="inline-flex items-center px-2 py-1 text-[10px] font-semibold uppercase tracking-wide bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-100 dark:border-emerald-700">Cardio</span>`
                : '';

            if (!item.variations.length) {
                return `
                    <div class="exercise-card bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-sm transition-all overflow-hidden">
                        <div class="exercise-header bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 p-3 sm:p-4">
                            <div class="flex items-center justify-between gap-3">
                                <div class="flex items-center gap-3 flex-1">
                                    <div class="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-semibold text-xs sm:text-sm flex items-center justify-center">${displayIndex}</div>
                                    <h3 class="exercise-name text-sm sm:text-base font-bold text-gray-800 dark:text-gray-100 truncate flex-1">${escapeName}</h3>
                                </div>
                                <div class="flex items-center gap-2">${bodyPartBadge}${typeBadge}</div>
                            </div>
                        </div>
                        <div class="exercise-sets-container p-3 sm:p-4">
                            <div class="variation-row py-4 px-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-center text-xs text-gray-500 dark:text-gray-400">No sets logged</div>
                        </div>
                    </div>
                `;
            }

            const MAX_VISIBLE_VARIATIONS = 3;
            const hasOverflow = item.variations.length > MAX_VISIBLE_VARIATIONS;
            const hiddenCount = hasOverflow ? item.variations.length - MAX_VISIBLE_VARIATIONS : 0;
            const toggleId = `exercise-sets-${displayIndex}-${Math.random().toString(36).slice(2, 8)}`;

            const renderCardioVariation = variation => {
                const duration = variation.duration_minutes ? `<div class="flex items-center gap-1.5"><span class="text-xs text-gray-600 dark:text-gray-300 font-semibold">Duration:</span><span class="text-sm sm:text-base font-semibold text-blue-700 dark:text-blue-300">${variation.duration_minutes}</span><span class="text-xs text-gray-500 dark:text-gray-400">min</span></div>` : '';
                const distanceValue = variation.distance_miles ?? variation.distance_km;
                const distanceUnit = variation.distance_unit || (variation.distance_km ? 'km' : 'mi');
                const distance = distanceValue ? `<div class="flex items-center gap-1.5"><span class="text-xs text-gray-600 dark:text-gray-300 font-semibold">Distance:</span><span class="text-sm sm:text-base font-semibold text-green-700 dark:text-green-300">${distanceValue}</span><span class="text-xs text-gray-500 dark:text-gray-400">${distanceUnit || ''}</span></div>` : '';
                const intensity = variation.intensity ? `<div class="flex items-center gap-1.5"><span class="text-xs text-gray-600 dark:text-gray-300 font-semibold">Intensity:</span><span class="text-sm sm:text-base font-semibold text-purple-700 dark:text-purple-300">${RoutineUtils.escapeHtml(variation.intensity)}</span></div>` : '';

                                return `
                    <div class="variation-row flex flex-wrap items-center gap-3 py-3 px-3 sm:px-4 bg-white dark:bg-gray-800 rounded-lg">
                        ${duration || ''}
                        ${distance || ''}
                        ${intensity || ''}
                                        </div>
                `;
            };

            const renderStrengthVariation = variation => {
                const sets = variation.sets ? `<div class="flex items-center gap-1.5"><span class="text-xs text-gray-600 dark:text-gray-300 font-semibold">Sets</span><span class="text-sm sm:text-base font-semibold text-blue-700 dark:text-blue-300">${variation.sets}</span></div>` : '';
                const reps = variation.reps ? `<div class="flex items-center gap-1.5"><span class="text-xs text-gray-600 dark:text-gray-300 font-semibold">Reps</span><span class="text-sm sm:text-base font-semibold text-green-700 dark:text-green-300">${variation.reps}</span></div>` : '';
                const weight = variation.weight ? `<div class="flex items-center gap-1.5"><span class="text-xs text-gray-600 dark:text-gray-300 font-semibold">Weight</span><span class="text-sm sm:text-base font-semibold text-purple-700 dark:text-purple-300">${variation.weight}</span><span class="text-xs text-gray-500 dark:text-gray-400">${RoutineUtils.escapeHtml(variation.unit || 'lb')}</span></div>` : '';
                const intensity = variation.intensity ? `<div class="flex items-center gap-1.5"><span class="text-xs text-gray-600 dark:text-gray-300 font-semibold">Intensity</span><span class="text-sm sm:text-base font-semibold text-amber-700 dark:text-amber-300">${RoutineUtils.escapeHtml(variation.intensity)}</span></div>` : '';

                const divider = (sets && reps) || (reps && weight) || (sets && weight) ? '<span class="text-gray-400 dark:text-gray-500">•</span>' : '';

                return `
                    <div class="variation-row flex flex-wrap items-center gap-2 sm:gap-3 py-3 px-3 sm:px-4 bg-white dark:bg-gray-800 rounded-lg">
                        ${sets || ''}
                        ${sets && reps ? '<span class="text-gray-400 dark:text-gray-500">×</span>' : ''}
                        ${reps || ''}
                        ${weight && (variation.sets || variation.reps) ? '<span class="text-gray-400 dark:text-gray-500">@</span>' : ''}
                        ${weight || ''}
                        ${divider && !(sets && reps && weight) ? '' : ''}
                        ${intensity || ''}
                                    </div>
                                `;
            };

            const renderVariation = variation => item.isCardio ? renderCardioVariation(variation) : renderStrengthVariation(variation);

            const visibleVariations = item.variations.slice(0, MAX_VISIBLE_VARIATIONS).map(renderVariation).join('');
            const hiddenVariations = hasOverflow ? item.variations.slice(MAX_VISIBLE_VARIATIONS).map(renderVariation).join('') : '';

            const toggleButton = hasOverflow
                ? `<button class="exercise-toggle mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-100 dark:bg-gray-900/60 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-gray-700" data-target="${toggleId}" aria-expanded="false">
                        <svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                        <span class="exercise-toggle-text">Show ${hiddenCount} more ${hiddenCount === 1 ? 'set' : 'sets'}</span>
                    </button>`
                : '';

            const exerciseDetailsId = `exercise-details-${displayIndex}-${Math.random().toString(36).slice(2, 8)}`;

                                return `
                <div class="exercise-card bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-sm transition-all overflow-hidden">
                    <div class="exercise-header bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700">
                        <button class="exercise-header-toggle w-full p-3 sm:p-4 flex items-center justify-between gap-3 text-left" data-target="${exerciseDetailsId}" aria-expanded="false">
                            <div class="flex items-center gap-3 flex-1">
                                <div class="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-semibold text-xs sm:text-sm flex items-center justify-center">${displayIndex}</div>
                                <h3 class="exercise-name text-sm sm:text-base font-bold text-gray-800 dark:text-gray-100 truncate flex-1">${escapeName}</h3>
                            </div>
                                        <div class="flex items-center gap-2">
                                ${bodyPartBadge}
                                ${typeBadge}
                                <svg class="exercise-header-icon w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                </svg>
                                        </div>
                        </button>
                                        </div>
                    <div class="exercise-details hidden p-3 sm:p-4 space-y-2" id="${exerciseDetailsId}">
                        ${visibleVariations}
                        ${hasOverflow ? `<div class="exercise-extra-sets hidden space-y-2" id="${toggleId}">${hiddenVariations}</div>` : ''}
                        ${toggleButton}
                    </div>
                </div>
            `;
        };

        let exerciseCounter = 0;
        const exerciseRows = populatedGroups.length
            ? populatedGroups.map(group => {
                const groupTitle = group.body_part ? `<div class="flex items-center justify-between px-1">
                        <span class="text-[11px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">${RoutineUtils.escapeHtml(group.body_part)}</span>
                        ${group.totalSets > 0 ? `<span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400">${group.totalSets} sets</span>` : ''}
                    </div>` : '';
                const itemsHtml = group.items.map(item => {
                    exerciseCounter += 1;
                    return renderExerciseItem(item, exerciseCounter);
                }).join('');

                return `<div class="space-y-2">${groupTitle}${itemsHtml}</div>`;
            }).join('')
            : `
                <div class="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                    <svg class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                    </svg>
                    <p class="text-sm text-gray-500 dark:text-gray-400">No exercises logged</p>
                </div>
            `;

        const template = document.getElementById('journal-workout-card-template');
        let $card;

        if (template?.content?.firstElementChild) {
             $card = $(template.content.firstElementChild.cloneNode(true));
         } else {
             $card = $(
                 `<div class="workout-card bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-gray-700 shadow-sm transition-all">
                     <div class="p-4 sm:p-5 space-y-3">
                         <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                             <div>
                                 <p class="journal-card-date text-sm font-bold text-gray-800 dark:text-gray-100"></p>
                                <div class="journal-card-stats hidden mt-2 flex flex-wrap gap-2"></div>
                             </div>
                             <button class="journal-toggle inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-gray-900/60 text-indigo-600 dark:text-indigo-300 text-xs font-semibold border border-indigo-100 dark:border-indigo-800 shadow-sm" aria-expanded="false">
                                 <svg class="journal-toggle-icon w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                 </svg>
                                 <span class="journal-toggle-text">Show details</span>
                             </button>
                         </div>
                         <div class="journal-details hidden space-y-2">
                             <div class="routine-exercises-list space-y-2"></div>
                         </div>
                     </div>
                 </div>`
             );
         }

        $card.find('.journal-card-date').text(dateStr);

        const $statsContainer = $card.find('.journal-card-stats');
        if (statChips.length) {
            $statsContainer.html(statChips.join(''));
            $statsContainer.removeClass('hidden');
        } else {
            $statsContainer.empty().addClass('hidden');
        }

        $card.find('.routine-exercises-list').html(exerciseRows);

        $card.find('.journal-toggle').on('click', function() {
            const $details = $card.find('.journal-details');
            const $icon = $(this).find('.journal-toggle-icon');
            const $text = $(this).find('.journal-toggle-text');
            const isHidden = $details.hasClass('hidden');

            if (isHidden) {
                $details.removeClass('hidden').hide().slideDown(300, 'swing');
                $icon.css('transform', 'rotate(180deg)');
                $text.text('Hide details');
                $(this).attr('aria-expanded', 'true');
            } else {
                $details.slideUp(300, 'swing', function() {
                    $(this).addClass('hidden');
                });
                $icon.css('transform', 'rotate(0deg)');
                $text.text('Show details');
                $(this).attr('aria-expanded', 'false');
            }
        });

        $card.find('.exercise-toggle').on('click', function() {
            const $button = $(this);
            const targetId = $button.data('target');
            const $target = $card.find(`#${targetId}`);
            const $icon = $button.find('svg');
            const isHidden = $target.hasClass('hidden');

            if (isHidden) {
                $target.removeClass('hidden').hide().slideDown(200, 'swing');
                $icon.css('transform', 'rotate(180deg)');
                $button.attr('aria-expanded', 'true');
                $button.find('.exercise-toggle-text').text('Hide extra sets');
            } else {
                $target.slideUp(200, 'swing', function() {
                    $target.addClass('hidden');
                });
                $icon.css('transform', 'rotate(0deg)');
                $button.attr('aria-expanded', 'false');
                const hiddenCountText = $target.children().length;
                $button.find('.exercise-toggle-text').text(`Show ${hiddenCountText} more ${hiddenCountText === 1 ? 'set' : 'sets'}`);
            }
        });

        $card.find('.exercise-header-toggle').on('click', function() {
            const $button = $(this);
            const targetId = $button.data('target');
            const $target = $card.find(`#${targetId}`);
            const $icon = $button.find('.exercise-header-icon');
            const isHidden = $target.hasClass('hidden');

            if (isHidden) {
                $target.removeClass('hidden').hide().slideDown(220, 'swing');
                $icon.css('transform', 'rotate(180deg)');
                $button.attr('aria-expanded', 'true');
            } else {
                $target.slideUp(220, 'swing', function() {
                    $target.addClass('hidden');
                });
                $icon.css('transform', 'rotate(0deg)');
                $button.attr('aria-expanded', 'false');
            }
        });

        return $card;
    }

    function formatVolume(value) {
        if (!value || value <= 0) {
            return '0 kg';
        }

        const absValue = Math.abs(value);

        if (absValue >= 1_000_000) {
            return `${(value / 1_000_000).toFixed(1)}M kg`;
        }

        if (absValue >= 1_000) {
            return `${(value / 1_000).toFixed(1)}k kg`;
        }

        return `${Math.round(value).toLocaleString()} kg`;
    }

    // Public API
    return {
        init: init,
        load: loadJournalData
    };
})();

// Initialize on document ready
$(document).ready(function() {
    JournalTab.init();

    // Load journal data when tab is clicked (default to 7 days)
    $(document).on('click', '[data-tab="journal"]', function() {
        const days = $('#journal-filter-days').val() === 'all' ? 9999 : parseInt($('#journal-filter-days').val()) || 7;
        JournalTab.load(days);
    });
});

