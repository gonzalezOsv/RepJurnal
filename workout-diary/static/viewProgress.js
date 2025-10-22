// Store references to the created Chart.js instances
let exerciseCharts = {};
let consistencyChart, volumeTrendChart, imbalanceChart;

const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
        legend: { 
            display: true,
            labels: {
                font: {
                    family: "'Inter', sans-serif",
                    size: 12,
                    weight: '500'
                },
                color: '#374151',
                padding: 15,
                usePointStyle: true,
                pointStyle: 'circle'
            }
        },
        tooltip: { 
            enabled: true,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#1F2937',
            bodyColor: '#374151',
            borderColor: '#E5E7EB',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            boxPadding: 6,
            font: {
                family: "'Inter', sans-serif",
                size: 13
            }
        },
    },
    scales: {
        x: { 
            beginAtZero: false,
            ticks: {
                maxRotation: 45,
                minRotation: 45,
                font: {
                    family: "'Inter', sans-serif",
                    size: 11
                },
                color: '#6B7280'
            },
            grid: {
                display: false
            },
            border: {
                color: '#E5E7EB',
                width: 1
            }
        },
        y: { 
            beginAtZero: true,
            ticks: {
                callback: function(value) {
                    return value + ' lbs';
                },
                font: {
                    family: "'Inter', sans-serif",
                    size: 11
                },
                color: '#6B7280'
            },
            grid: {
                color: '#F3F4F6',
                drawBorder: false
            },
            border: {
                display: false
            }
        },
    },
};

const bodyPartColors = {
    'Chest': '#FF6B6B',
    'Back': '#4ECDC4',
    'Legs': '#45B7D1',
    'Shoulders': '#96CEB4',
    'Biceps': '#FFEEAD',
    'Triceps': '#D4A5A5',
    'Core': '#9C89B8',
    'Abs': '#F39C12',
    'Glutes': '#E74C3C',
    'Calves': '#3498DB'
};

function getColor(bodyPart, index) {
    return bodyPartColors[bodyPart] || 
           `hsl(${index * (360 / Object.keys(bodyPartColors).length)}, 70%, 50%)`;
}

function createExerciseChart(ctx, exerciseName, progressionData) {
    // Destroy existing chart if it exists
    if (exerciseCharts[exerciseName]) {
        exerciseCharts[exerciseName].destroy();
    }

    // Determine color based on exercise name
    let borderColor = '#3B82F6'; // Default blue
    let backgroundColor = 'rgba(59, 130, 246, 0.1)';
    
    if (exerciseName.toLowerCase().includes('squat')) {
        borderColor = '#10B981'; // Green
        backgroundColor = 'rgba(16, 185, 129, 0.1)';
    } else if (exerciseName.toLowerCase().includes('deadlift')) {
        borderColor = '#8B5CF6'; // Purple
        backgroundColor = 'rgba(139, 92, 246, 0.1)';
    }

    // Create the chart
    exerciseCharts[exerciseName] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: progressionData.dates,
            datasets: [{
                label: 'Max Weight (lbs)',
                data: progressionData.max_weights,
                borderColor: borderColor,
                backgroundColor: backgroundColor,
                borderWidth: 3,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: borderColor,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 7,
                pointRadius: 5,
                pointHitRadius: 10,
            }]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                legend: {
                    display: false
                }
            }
        }
    });

    return exerciseCharts[exerciseName];
}

// Load exercise progression data
function loadExerciseProgression(exerciseName, canvasId, prValueId = null, prDateId = null) {
    $.get(`/metrics/api/exercise-progression/${encodeURIComponent(exerciseName)}`, (data) => {
        const ctx = $(`#${canvasId}`)[0].getContext('2d');
        
        if (data.dates && data.dates.length > 0) {
            createExerciseChart(ctx, exerciseName, data);
            
            // Update PR display if IDs provided
            if (prValueId && prDateId && data.personal_record) {
                $(`#${prValueId}`).text(data.personal_record.weight ? `${data.personal_record.weight} lbs` : '--');
                if (data.personal_record.date) {
                    const prDate = new Date(data.personal_record.date);
                    $(`#${prDateId}`).text(`Set on ${prDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
                } else {
                    $(`#${prDateId}`).text('No PR yet');
                }
            }
        } else {
            // Show "No data" message
            ctx.font = '16px Arial';
            ctx.fillStyle = '#999';
            ctx.textAlign = 'center';
            ctx.fillText('No data available yet', ctx.canvas.width / 2, ctx.canvas.height / 2);
            ctx.fillText('Start logging this exercise!', ctx.canvas.width / 2, (ctx.canvas.height / 2) + 25);
            
            // Update PR display to show no data
            if (prValueId && prDateId) {
                $(`#${prValueId}`).text('--');
                $(`#${prDateId}`).text('No data yet');
            }
        }
    }).fail((error) => {
        console.error(`Failed to load progression for ${exerciseName}:`, error);
        const ctx = $(`#${canvasId}`)[0].getContext('2d');
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f00';
        ctx.textAlign = 'center';
        ctx.fillText('Error loading data', ctx.canvas.width / 2, ctx.canvas.height / 2);
        
        // Update PR display to show error
        if (prValueId && prDateId) {
            $(`#${prValueId}`).text('--');
            $(`#${prDateId}`).text('Error loading');
        }
    });
}

// Load tracked exercises and create charts
function loadTrackedExercises() {
    $.get('/metrics/api/tracked-exercises', (data) => {
        console.log('Tracked exercises:', data);
        
        // Always load the default three exercises with PR display
        loadExerciseProgression('Bench Press', 'benchPressChart', 'benchPrValue', 'benchPrDate');
        loadExerciseProgression('Squats', 'squatChart', 'squatPrValue', 'squatPrDate');
        loadExerciseProgression('Deadlift', 'deadliftChart', 'deadliftPrValue', 'deadliftPrDate');
        
        // Load additional tracked exercises
        const additionalExercises = data.tracked_exercises.filter(ex => 
            !data.default_exercises.includes(ex.exercise_name) && ex.session_count >= 2
        );
        
        if (additionalExercises.length > 0) {
            // Show dropdown for additional exercises
            $('#customExerciseSection').removeClass('hidden');
            const $select = $('#customExerciseSelect');
            $select.empty().append('<option value="">Select an exercise...</option>');
            
            additionalExercises.forEach(ex => {
                $select.append(`<option value="${ex.exercise_name}">${ex.exercise_name} (${ex.session_count} sessions)</option>`);
            });
        }
    }).fail((error) => {
        console.error('Failed to load tracked exercises:', error);
    });
}

// Load available exercises for tracking
function loadAvailableExercises() {
    $.get('/metrics/api/available-exercises', (data) => {
        const $modal = $('#addExerciseModal');
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
                                    class="exercise-btn group text-left px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-purple-50 rounded-xl border-2 border-gray-200 hover:border-blue-400 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                                    onclick="selectExerciseToTrack('${ex.exercise_name}')"
                                >
                                    <div class="flex items-center justify-between">
                                        <span class="font-semibold text-gray-800 group-hover:text-blue-600">${ex.exercise_name}</span>
                                        <span class="bg-white px-3 py-1 rounded-full text-xs font-bold text-gray-600 group-hover:bg-blue-100">${ex.times_performed}x</span>
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
        $exerciseList.html(`
            <div class="text-center py-12">
                <svg class="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-red-600 text-lg">Error loading exercises</p>
                <p class="text-gray-500 text-sm mt-2">Please try again later</p>
            </div>
        `);
    });
}

// Select exercise to track
window.selectExerciseToTrack = function(exerciseName) {
    // Close modal
    $('#addExerciseModal').addClass('hidden');
    
    // Show in custom section
    $('#customExerciseSelect').val(exerciseName).trigger('change');
    
    // Show notification
    showNotification(`Now tracking: ${exerciseName}`, 'success');
};

// Load all personal records
function loadAllRecords() {
    // First, update the Big 3 cards at the top
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
    
    // Load all tracked exercises and their PRs
    $.get('/metrics/api/tracked-exercises', (data) => {
        const $recordsList = $('#allRecordsList');
        $recordsList.empty();
        
        if (!data.tracked_exercises || data.tracked_exercises.length === 0) {
            $recordsList.html(`
                <div class="col-span-full text-center py-12">
                    <div class="text-6xl mb-4">🏋️</div>
                    <p class="text-gray-600 text-lg font-semibold">No records yet!</p>
                    <p class="text-gray-500 text-sm mt-2">Start logging workouts to build your record board</p>
                </div>
            `);
            return;
        }
        
        // Create a record card for each exercise
        const exercisePromises = data.tracked_exercises.map(ex => {
            return $.get(`/metrics/api/exercise-progression/${encodeURIComponent(ex.exercise_name)}`);
        });
        
        Promise.all(exercisePromises).then(results => {
            results.forEach((result, index) => {
                const exercise = data.tracked_exercises[index];
                
                if (result.personal_record && result.personal_record.weight) {
                    const pr = result.personal_record;
                    const date = new Date(pr.date);
                    
                    // Use softer, more muted color schemes
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
                    
                    $recordsList.append(`
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
                    `);
                }
            });
            
            if ($recordsList.children().length === 0) {
                $recordsList.html(`
                    <div class="col-span-full text-center py-12">
                        <div class="text-6xl mb-4">🏋️</div>
                        <p class="text-gray-600 text-lg font-semibold">No records with weight data yet!</p>
                        <p class="text-gray-500 text-sm mt-2">Log exercises with weights to see your PRs</p>
                    </div>
                `);
            }
        }).catch(error => {
            console.error('Error loading records:', error);
            $recordsList.html(`
                <div class="col-span-full text-center py-12">
                    <div class="text-6xl mb-4">⚠️</div>
                    <p class="text-red-600 text-lg font-semibold">Error loading records</p>
                    <p class="text-gray-500 text-sm mt-2">Please try again later</p>
                </div>
            `);
        });
    }).fail((error) => {
        console.error('Failed to load tracked exercises for records:', error);
        $('#allRecordsList').html(`
            <div class="col-span-full text-center py-12">
                <div class="text-6xl mb-4">⚠️</div>
                <p class="text-red-600 text-lg font-semibold">Error loading records</p>
                <p class="text-gray-500 text-sm mt-2">Please try again later</p>
            </div>
        `);
    });
}

// Show notification
function showNotification(message, type = 'info') {
    const $notification = $(`
        <div class="fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white">
            ${message}
        </div>
    `);
    
    $('body').append($notification);
    
    setTimeout(() => {
        $notification.fadeOut(() => $notification.remove());
    }, 3000);
}

// Initialize on document ready
$(document).ready(function () {
    // Load tracked exercises and their progression
    loadTrackedExercises();
    
    // Custom exercise selection
    $('#customExerciseSelect').on('change', function () {
        const selectedExercise = $(this).val();
        
        if (selectedExercise) {
            $('#customChartContainer').removeClass('hidden').addClass('animate__animated animate__fadeIn');
            $('#customChartTitle').text(selectedExercise);
            loadExerciseProgression(selectedExercise, 'customExerciseChart');
        } else {
            $('#customChartContainer').addClass('hidden');
        }
    });
    
    // Add exercise button
    $('#addExerciseBtn').on('click', function() {
        $('#addExerciseModal').removeClass('hidden');
        loadAvailableExercises();
    });
    
    // Close modal
    $('#closeModal, #closeModalBtn').on('click', function() {
        $('#addExerciseModal').addClass('hidden');
    });
    
    // Tab functionality
    $('.tab-button').on('click', function () {
        $('.tab-button').removeClass('active');
        $('.tab-content').removeClass('active').addClass('hidden');

        $(this).addClass('active');

        const tabContentId = $(this).data('tab');
        $(`#${tabContentId}`).addClass('active').removeClass('hidden');
        
        // Load records data when Records tab is clicked
        if (tabContentId === 'records') {
            loadAllRecords();
        }
        
        // Load analytics data when Analytics tab is clicked
        if (tabContentId === 'analytics') {
            loadAnalyticsData();
        }
    });

    // Load analytics data
    function loadAnalyticsData() {
        if (!consistencyChart && !volumeTrendChart && !imbalanceChart) {
            // Fetch and render data for consistency
            $.get('/metrics/api/consistency/', (data) => {
                const ctx = $('#consistencyChart')[0].getContext('2d');
                consistencyChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Current Streak (days)', 'Workouts (last 30 days)'],
                        datasets: [{
                            label: 'Count',
                            data: [data.streak, data.workout_count],
                            backgroundColor: ['#10b981', '#3b82f6']
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: { display: false }
                        }
                    }
                });
            });

            // Fetch and render volume trend
            $.get('/metrics/api/volume-trend/', (data) => {
                const ctx = $('#volumeTrendChart')[0].getContext('2d');
                volumeTrendChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.weeks,
                        datasets: [{
                            label: 'Total Volume (lbs)',
                            data: data.volumes,
                            borderColor: '#8b5cf6',
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            fill: true,
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true
                    }
                });
            });

            // Fetch and render body part imbalance
            updateImbalanceChart();
        }
    }

    // Pie chart function
    function updateImbalanceChart() {
        $.get('/metrics/api/body-part-imbalance/', (response) => {
            if (response.error) {
                console.error('Error loading body part data:', response.error);
                return;
            }

            const data = response.data;
            // Filter out zero values
            const filteredData = Object.fromEntries(
                Object.entries(data).filter(([_, value]) => value > 0)
            );

            const ctx = $('#imbalanceChart')[0].getContext('2d');
            
            // Destroy existing chart if it exists
            if (imbalanceChart) {
                imbalanceChart.destroy();
            }
            
            imbalanceChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: Object.keys(filteredData),
                    datasets: [{
                        data: Object.values(filteredData),
                        backgroundColor: Object.keys(filteredData).map((key, index) => 
                            getColor(key, index)
                        ),
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                font: { size: 12 },
                                padding: 15,
                                generateLabels: (chart) => {
                                    const data = chart.data;
                                    return data.labels.map((label, index) => ({
                                        text: `${label}: ${data.datasets[0].data[index].toFixed(1)}%`,
                                        fillStyle: data.datasets[0].backgroundColor[index],
                                        index: index
                                    }));
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    return `${label}: ${value.toFixed(1)}%`;
                                }
                            }
                        }
                    }
                }
            });
        }).fail((error) => {
            console.error('Failed to load body part imbalance data:', error);
        });
    }

    // Load Body Part Balance Data when Balance tab is shown
    async function loadBodyPartBalance() {
        try {
            const response = await fetch('/metrics/api/body-part-balance');
            const data = await response.json();
            
            // Hide loading, show content
            document.getElementById('balance-loading').classList.add('hidden');
            document.getElementById('balance-content').classList.remove('hidden');
            
            // Display recommendations
            const recommendationsDiv = document.getElementById('balance-recommendations');
            recommendationsDiv.innerHTML = '';
            data.recommendations.forEach(rec => {
                const alertClass = rec.type === 'warning' ? 'border-l-4 border-red-500 bg-red-50 text-red-800' :
                              rec.type === 'alert' ? 'border-l-4 border-yellow-500 bg-yellow-50 text-yellow-800' :
                              rec.type === 'info' ? 'border-l-4 border-blue-500 bg-blue-50 text-blue-800' :
                              'border-l-4 border-green-500 bg-green-50 text-green-800';
                
                recommendationsDiv.innerHTML += `
                    <div class="${alertClass} p-4 rounded-r-xl shadow-md">
                        <p class="font-semibold">${rec.message}</p>
                    </div>
                `;
            });
            
            // Combine all body parts
            const allBodyParts = [
                ...data.overworked,
                ...data.balanced,
                ...data.underworked,
                ...data.neglected
            ];
            
            // Color the body diagram
            allBodyParts.forEach(bp => {
                const fillColor = bp.status === 'overworked' ? '#fca5a5' : // red-300
                                 bp.status === 'balanced' ? '#86efac' :    // green-300
                                 bp.status === 'underworked' ? '#fde047' : // yellow-300
                                 '#d1d5db'; // gray-300
                
                // Map body part names to SVG element IDs
                const elementId = bp.name.toLowerCase() + '-visual';
                const svgElement = document.getElementById(elementId);
                if (svgElement) {
                    // Color all child shapes (ellipse, rect, etc.)
                    const shapes = svgElement.querySelectorAll('ellipse, rect');
                    shapes.forEach(shape => {
                        shape.setAttribute('fill', fillColor);
                    });
                }
            });
            
            // Display body part cards
            const gridDiv = document.getElementById('body-parts-grid');
            gridDiv.innerHTML = '';
            allBodyParts.forEach(bp => {
                const bgColorClass = bp.status === 'overworked' ? 'bg-red-50 border-red-300' :
                                    bp.status === 'balanced' ? 'bg-green-50 border-green-300' :
                                    bp.status === 'underworked' ? 'bg-yellow-50 border-yellow-300' :
                                    'bg-gray-50 border-gray-300';
                
                const textColorClass = bp.status === 'overworked' ? 'text-red-800' :
                                      bp.status === 'balanced' ? 'text-green-800' :
                                      bp.status === 'underworked' ? 'text-yellow-800' :
                                      'text-gray-700';
                
                const emoji = bp.status === 'overworked' ? '🔥' :
                             bp.status === 'balanced' ? '✅' :
                             bp.status === 'underworked' ? '⚡' :
                             '😴';
                
                gridDiv.innerHTML += `
                    <div class="border-2 ${bgColorClass} rounded-xl p-4 text-center hover:shadow-lg transition-all transform hover:scale-105">
                        <div class="text-2xl mb-2">${emoji}</div>
                        <div class="font-bold ${textColorClass} text-sm mb-1">${bp.name}</div>
                        <div class="text-xs text-gray-600 font-semibold">${bp.days_worked} day${bp.days_worked !== 1 ? 's' : ''}</div>
                        <div class="text-xs ${textColorClass} font-medium mt-1 capitalize">${bp.status}</div>
                    </div>
                `;
            });
            
            // Update summary counts
            document.getElementById('overworked-count').textContent = data.summary.overworked_count;
            document.getElementById('balanced-count').textContent = data.summary.balanced_count;
            document.getElementById('underworked-count').textContent = data.summary.underworked_count;
            document.getElementById('neglected-count').textContent = data.summary.neglected_count;
            
        } catch (error) {
            console.error('Error loading body part balance:', error);
            document.getElementById('balance-loading').innerHTML = `
                <div class="text-red-600">
                    <p class="font-semibold text-xl">Error loading data</p>
                    <p class="text-sm mt-2">Please try refreshing the page</p>
                </div>
            `;
        }
    }

    // Load balance data when Balance tab is clicked
    $('button[data-tab="balance"]').on('click', function() {
        // Only load once
        if (!document.getElementById('balance-content').classList.contains('hidden')) {
            return;
        }
        loadBodyPartBalance();
    });
});
