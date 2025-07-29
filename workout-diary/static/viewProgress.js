// Store references to the created Chart.js instances
let benchPressChart, squatChart, deadliftChart, additionalChart, consistencyChart, volumeTrendChart, imbalanceChart;
const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
        legend: { display: true },
        tooltip: { enabled: true },
    },
    scales: {
        x: { beginAtZero: true },
        y: { beginAtZero: true },
    },
};

const bodyPartColors = {
  'Chest': '#FF6B6B',
  'Back': '#4ECDC4',
  'Legs': '#45B7D1',
  'Shoulders': '#96CEB4',
  'Arms': '#FFEEAD',
  'Core': '#D4A5A5',
  'Other': '#9C89B8'
};

function getColor(bodyPart, index) {
  return bodyPartColors[bodyPart] || 
         `hsl(${index * (360 / Object.keys(bodyPartColors).length)}, 70%, 50%)`;
}

function createChart(ctx, label, data, type = 'line') {
  if (ctx.chart) {
      ctx.chart.destroy();
  }

  let chartData;
  let options = { ...chartOptions };

  if (type === 'pie') {
      // Handle pie chart data format
      chartData = {
          labels: Object.keys(data),
          datasets: [{
              data: Object.values(data),
              backgroundColor: Object.keys(data).map((key, index) => 
                  getColor(key, index)
              ),
              borderWidth: 1,
              borderColor: '#ffffff'
          }]
      };
  } else {
      // Handle line chart data format
      chartData = {
          labels: data.labels,
          datasets: [{
              label: label,
              data: data.values,
              borderColor: 'rgb(75, 192, 192)',
              borderWidth: 2,
              fill: false,
          }]
      };
  }

  ctx.chart = new Chart(ctx, {
      type: type,
      data: chartData,
      options: options
  });

  return ctx.chart;
}

// Example data for charts
const exampleData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    benchPress: { values: [100, 110, 115, 120] },
    squat: { values: [150, 160, 170, 180] },
    deadlift: { values: [200, 210, 220, 230] },
    overheadPress: { values: [60, 65, 70, 75] },
};

// Initialize charts and add event listeners
$(document).ready(function () {
    // Initialize main charts
    benchPressChart = createChart(
        $('#benchPressChart')[0].getContext('2d'),
        'Bench Press',
        { labels: exampleData.labels, values: exampleData.benchPress.values }
    );

    squatChart = createChart(
        $('#squatChart')[0].getContext('2d'),
        'Squat',
        { labels: exampleData.labels, values: exampleData.squat.values }
    );

    deadliftChart = createChart(
        $('#deadliftChart')[0].getContext('2d'),
        'Deadlift',
        { labels: exampleData.labels, values: exampleData.deadlift.values }
    );

    // Dropdown interaction for accessory exercises
    $('#exerciseSelect').on('change', function () {
        const selectedExercise = $(this).val();
        const exerciseName = $(this).find('option:selected').text();

        $('#additionalChartTitle').text(exerciseName);

        additionalChart = createChart(
            $('#additionalChart')[0].getContext('2d'),
            exerciseName,
            { labels: exampleData.labels, values: exampleData[selectedExercise]?.values || [] }
        );
    });

    // Tab functionality
    $('.tab-button').on('click', function () {
        $('.tab-button').removeClass('active bg-blue-600 text-white')
            .addClass('bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300');
        $('.tab-content').addClass('hidden');

        $(this).addClass('active bg-blue-600 text-white')
            .removeClass('bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300');

        const tabContentId = $(this).data('tab');
        $(`#${tabContentId}`).removeClass('hidden');
    });

    // Category-Exercise dropdown relationship
    const exercisesByCategory = {
        chest: ['Incline Bench Press', 'Dumbbell Press', 'Cable Flyes'],
        back: ['Barbell Row', 'Pull-ups', 'Lat Pulldown'],
        shoulders: ['Overhead Press', 'Lateral Raises', 'Face Pulls'],
        legs: ['Leg Press', 'Romanian Deadlift', 'Leg Extensions'],
        arms: ['Bicep Curls', 'Tricep Extensions', 'Hammer Curls'],
    };

    $('#categorySelect').on('change', function () {
        const selectedCategory = $(this).val();
        const exerciseOptions = exercisesByCategory[selectedCategory] || [];
        const $exerciseSelect = $('#exerciseSelect');
        $exerciseSelect.empty().append('<option value="">Select Exercise</option>');
        exerciseOptions.forEach((exercise) => {
            $exerciseSelect.append(`<option value="${exercise}">${exercise}</option>`);
        });
    });

    // Load analytics data when the "Analytics" button is clicked
    $('#analyticsButton').on('click', function () {
        if (!consistencyChart && !volumeTrendChart && !imbalanceChart) {
            // Fetch and render data for consistency
            $.get('/metrics/api/consistency/', (data) => {
                const ctx = $('#consistencyChart')[0].getContext('2d');
                consistencyChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Streak', 'Workouts'],
                        datasets: [{
                            label: 'Count',
                            data: [data.streak, data.workout_count],
                            backgroundColor: ['#4caf50', '#2196f3']
                        }]
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
                            label: 'Volume',
                            data: data.volumes,
                            borderColor: '#673ab7',
                            fill: false
                        }]
                    }
                });
            });

            // Fetch and render body part imbalance
            updateImbalanceChart();
        }
    });




// Common chart options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
      legend: {
          position: 'right',
          labels: {
              font: { size: 12 },
              padding: 20,
              generateLabels: (chart) => {
                  if (chart.config.type === 'pie') {
                      const data = chart.data;
                      return data.labels.map((label, index) => ({
                          text: `${label} (${data.datasets[0].data[index].toFixed(1)}%)`,
                          fillStyle: data.datasets[0].backgroundColor[index],
                          index: index
                      }));
                  }
                  return Chart.defaults.plugins.legend.labels.generateLabels(chart);
              }
          }
      },
      tooltip: {
          callbacks: {
              label: (context) => {
                  if (context.chart.config.type === 'pie') {
                      const label = context.label || '';
                      const value = context.parsed || 0;
                      return `${label}: ${value.toFixed(1)}%`;
                  }
                  return `${context.dataset.label}: ${context.parsed.y}`;
              }
          }
      }
  }
};

// Color palette for pie charts





// Example usage for body part imbalance
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
      createChart(ctx, 'Body Part Distribution', filteredData, 'pie');

      // Update additional information if needed
      if (response.total_volume) {
          $('#totalVolume').text(
              `Total Volume: ${Math.round(response.total_volume).toLocaleString()} lbs`
          );
      }

      if (response.period) {
          const startDate = new Date(response.period.start).toLocaleDateString();
          const endDate = new Date(response.period.end).toLocaleDateString();
          $('#dateRange').text(`Period: ${startDate} - ${endDate}`);
      }
  }).fail((error) => {
      console.error('Failed to load body part imbalance data:', error);
  });
}










});
