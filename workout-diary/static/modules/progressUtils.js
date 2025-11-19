/**
 * Progress Utilities - Shared helpers for all progress tabs
 */

const ProgressUtils = {
    exerciseCharts: {},

    getChartOptions() {
        const isDarkMode = document.documentElement.classList.contains('dark');
        const isMobile = window.innerWidth < 640; // Tailwind 'sm' breakpoint
        
        return {
            responsive: true,
            maintainAspectRatio: false, // Allow chart to fill container
            plugins: {
                legend: { 
                    display: true,
                    labels: {
                        font: {
                            family: "'Inter', sans-serif",
                            size: isMobile ? 10 : 12,
                            weight: '500'
                        },
                        color: isDarkMode ? '#D1D5DB' : '#374151',
                        padding: isMobile ? 8 : 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: { 
                    enabled: true,
                    backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: isDarkMode ? '#F9FAFB' : '#1F2937',
                    bodyColor: isDarkMode ? '#D1D5DB' : '#374151',
                    borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                    borderWidth: 1,
                    padding: isMobile ? 8 : 12,
                    displayColors: true,
                    boxPadding: isMobile ? 3 : 6,
                    font: {
                        family: "'Inter', sans-serif",
                        size: isMobile ? 11 : 13
                    }
                },
            },
            scales: {
                x: { 
                    beginAtZero: false,
                    ticks: {
                        maxRotation: isMobile ? 90 : 45,
                        minRotation: isMobile ? 45 : 0,
                        maxTicksLimit: isMobile ? 6 : 10,
                        font: {
                            family: "'Inter', sans-serif",
                            size: isMobile ? 9 : 11
                        },
                        color: isDarkMode ? '#9CA3AF' : '#6B7280'
                    },
                    grid: {
                        display: false
                    },
                    border: {
                        color: isDarkMode ? '#4B5563' : '#E5E7EB',
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
                        color: isDarkMode ? '#9CA3AF' : '#6B7280'
                    },
                    grid: {
                        color: isDarkMode ? '#374151' : '#F3F4F6',
                        drawBorder: false
                    },
                    border: {
                        display: false
                    }
                },
            },
        };
    },

    bodyPartColors: {
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
    },

    cardColors: ['blue', 'green', 'purple', 'red', 'yellow', 'pink', 'indigo', 'teal'],

    getColor(bodyPart, index) {
        return this.bodyPartColors[bodyPart] || 
               `hsl(${index * (360 / Object.keys(this.bodyPartColors).length)}, 70%, 50%)`;
    },

    createExerciseChart(ctx, exerciseName, progressionData) {
        // Destroy existing chart if it exists
        if (this.exerciseCharts[exerciseName]) {
            this.exerciseCharts[exerciseName].destroy();
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
        this.exerciseCharts[exerciseName] = new Chart(ctx, {
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
                ...this.getChartOptions(),
                plugins: {
                    ...this.getChartOptions().plugins,
                    legend: {
                        display: false
                    }
                }
            }
        });

        return this.exerciseCharts[exerciseName];
    },

    loadExerciseProgression(exerciseName, canvasId, prValueId = null, prDateId = null) {
        const canvasElement = $(`#${canvasId}`)[0];
        if (!canvasElement) {
            console.error(`Canvas element #${canvasId} not found`);
            return;
        }
        
        $.get(`/metrics/api/exercise-progression/${encodeURIComponent(exerciseName)}`, (data) => {
            const ctx = canvasElement.getContext('2d');
            
            if (data.dates && data.dates.length > 0) {
                this.createExerciseChart(ctx, exerciseName, data);
                
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
                // Ensure canvas is sized properly
                if (ctx.canvas.width === 0 || ctx.canvas.height === 0) {
                    ctx.canvas.width = ctx.canvas.offsetWidth || 400;
                    ctx.canvas.height = ctx.canvas.offsetHeight || 224;
                }
                
                // Show "No data" message with dark mode support
                const isDarkMode = document.documentElement.classList.contains('dark');
                ctx.font = '16px Inter, sans-serif';
                ctx.fillStyle = isDarkMode ? '#9CA3AF' : '#999';
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
            const ctx = canvasElement.getContext('2d');
            
            // Ensure canvas is sized properly
            if (ctx.canvas.width === 0 || ctx.canvas.height === 0) {
                ctx.canvas.width = ctx.canvas.offsetWidth || 400;
                ctx.canvas.height = ctx.canvas.offsetHeight || 224;
            }
            
            const isDarkMode = document.documentElement.classList.contains('dark');
            ctx.font = '14px Inter, sans-serif';
            ctx.fillStyle = isDarkMode ? '#EF4444' : '#f00';
            ctx.textAlign = 'center';
            ctx.fillText('Error loading data', ctx.canvas.width / 2, ctx.canvas.height / 2);
            
            // Update PR display to show error
            if (prValueId && prDateId) {
                $(`#${prValueId}`).text('--');
                $(`#${prDateId}`).text('Error loading');
            }
        });
    },

    showNotification(message, type = 'info') {
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
    },
    
    // Initialize resize handler for responsive charts
    initResizeHandler() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Update all existing charts with new responsive options
                Object.values(this.exerciseCharts).forEach(chart => {
                    if (chart) {
                        chart.options = {
                            ...chart.options,
                            ...this.getChartOptions()
                        };
                        chart.update('none'); // Update without animation for smoother experience
                    }
                });
            }, 250); // Debounce resize events
        });
    }
};

// Initialize resize handler when module loads
ProgressUtils.initResizeHandler();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressUtils;
}

