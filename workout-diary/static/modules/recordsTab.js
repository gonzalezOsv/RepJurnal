/**
 * Records Tab - Personal records display
 */

const RecordsTab = {
    init() {
    },

    loadAllRecords() {
        this.loadBig3Records();
        this.loadAllExerciseRecords();
    },

    loadBig3Records() {
        // Bench Press
        $.get('/metrics/api/exercise-progression/Bench Press', (data) => {
            if (data.personal_record && data.personal_record.weight) {
                $('#recordBenchValue').text(`${data.personal_record.weight} lbs`);
                const date = new Date(data.personal_record.date);
                $('#recordBenchDate').text(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
            } else {
                $('#recordBenchValue').text('No PR yet');
                $('#recordBenchDate').text('Start lifting!');
            }
        });
        
        // Squats
        $.get('/metrics/api/exercise-progression/Squats', (data) => {
            if (data.personal_record && data.personal_record.weight) {
                $('#recordSquatValue').text(`${data.personal_record.weight} lbs`);
                const date = new Date(data.personal_record.date);
                $('#recordSquatDate').text(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
            } else {
                $('#recordSquatValue').text('No PR yet');
                $('#recordSquatDate').text('Start lifting!');
            }
        });
        
        // Deadlift
        $.get('/metrics/api/exercise-progression/Deadlift', (data) => {
            if (data.personal_record && data.personal_record.weight) {
                $('#recordDeadliftValue').text(`${data.personal_record.weight} lbs`);
                const date = new Date(data.personal_record.date);
                $('#recordDeadliftDate').text(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
            } else {
                $('#recordDeadliftValue').text('No PR yet');
                $('#recordDeadliftDate').text('Start lifting!');
            }
        });
    },

    loadAllExerciseRecords() {
        $.get('/metrics/api/tracked-exercises', (data) => {
            const $recordsList = $('#allRecordsList');
            $recordsList.empty();
            
            if (!data.tracked_exercises || data.tracked_exercises.length === 0) {
                $recordsList.html(this.getEmptyState());
                return;
            }
            
            // Create a record card for each exercise
            const exercisePromises = data.tracked_exercises.map(ex => {
                return $.get(`/metrics/api/exercise-progression/${encodeURIComponent(ex.exercise_name)}`);
            });
            
            Promise.all(exercisePromises).then(results => {
                results.forEach((result, index) => {
                    const exercise = data.tracked_exercises[index];
                    
                    // Skip if exercise name is null or empty
                    if (!exercise || !exercise.exercise_name || exercise.exercise_name.trim() === '') {
                        return;
                    }
                    
                    if (result.personal_record && result.personal_record.weight) {
                        const card = this.createRecordCard(result.personal_record, exercise, index);
                        $recordsList.append(card);
                    }
                });
                
                if ($recordsList.children().length === 0) {
                    $recordsList.html(this.getNoWeightDataState());
                }
            }).catch(error => {
                console.error('Error loading records:', error);
                $recordsList.html(this.getErrorState());
            });
        }).fail((error) => {
            console.error('Failed to load tracked exercises for records:', error);
            $('#allRecordsList').html(this.getErrorState());
        });
    },

    createRecordCard(pr, exercise, index) {
        const date = new Date(pr.date);
        
        const colorScheme = index % 6 === 0 ? 
            { bg: 'from-blue-50 to-blue-100', border: 'border-blue-300', text: 'text-blue-800', badge: 'bg-blue-200 text-blue-700' } :
        index % 6 === 1 ? 
            { bg: 'from-emerald-50 to-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', badge: 'bg-emerald-200 text-emerald-700' } :
        index % 6 === 2 ? 
            { bg: 'from-purple-50 to-purple-100', border: 'border-purple-300', text: 'text-purple-800', badge: 'bg-purple-200 text-purple-700' } :
        index % 6 === 3 ? 
            { bg: 'from-pink-50 to-pink-100', border: 'border-pink-300', text: 'text-pink-800', badge: 'bg-pink-200 text-pink-700' } :
        index % 6 === 4 ? 
            { bg: 'from-amber-50 to-amber-100', border: 'border-amber-300', text: 'text-amber-800', badge: 'bg-amber-200 text-amber-700' } :
            { bg: 'from-rose-50 to-rose-100', border: 'border-rose-300', text: 'text-rose-800', badge: 'bg-rose-200 text-rose-700' };
        
        return `
            <div class="bg-gradient-to-br ${colorScheme.bg} border-2 ${colorScheme.border} rounded-xl shadow-lg p-5 transform hover:scale-105 transition-all duration-300 cursor-pointer hover:shadow-xl">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-bold text-lg ${colorScheme.text}">${exercise.exercise_name}</h4>
                    <span class="text-2xl">🏅</span>
                </div>
                <div class="bg-white bg-opacity-80 rounded-lg p-3 border border-gray-200">
                    <p class="text-3xl font-black mb-1 ${colorScheme.text}">${pr.weight} lbs</p>
                    <p class="text-xs text-gray-600">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div class="mt-3">
                    <span class="${colorScheme.badge} text-xs font-semibold px-2 py-1 rounded-full">${exercise.session_count} sessions</span>
                </div>
            </div>
        `;
    },

    getEmptyState() {
        return `
            <div class="col-span-full text-center py-12">
                <div class="text-6xl mb-4">🏋️</div>
                <p class="text-gray-600 text-lg font-semibold">No records yet!</p>
                <p class="text-gray-500 text-sm mt-2">Start logging workouts to build your record board</p>
            </div>
        `;
    },

    getNoWeightDataState() {
        return `
            <div class="col-span-full text-center py-12">
                <div class="text-6xl mb-4">🏋️</div>
                <p class="text-gray-600 text-lg font-semibold">No records with weight data yet!</p>
                <p class="text-gray-500 text-sm mt-2">Log exercises with weights to see your PRs</p>
            </div>
        `;
    },

    getErrorState() {
        return `
            <div class="col-span-full text-center py-12">
                <div class="text-6xl mb-4">⚠️</div>
                <p class="text-red-600 text-lg font-semibold">Error loading records</p>
                <p class="text-gray-500 text-sm mt-2">Please try again later</p>
            </div>
        `;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecordsTab;
}

