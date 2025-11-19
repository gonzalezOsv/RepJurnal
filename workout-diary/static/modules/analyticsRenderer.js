/**
 * Analytics Renderer Module
 * Renders analytics data into charts and UI components
 */

const formatVolume = (value) => {
    if (!value || value <= 0) {
        return '0 kg';
    }

    const absValue = Math.abs(value);
    const lbs = value * 2.20462;
    let primary;

    if (absValue >= 1_000_000) {
        primary = `${(value / 1_000_000).toFixed(1)}M kg`;
    } else if (absValue >= 1_000) {
        primary = `${(value / 1_000).toFixed(1)}k kg`;
    } else {
        primary = `${Math.round(value).toLocaleString()} kg`;
    }

    let secondary = '';
    if (absValue >= 1_000) {
        secondary = lbs >= 1_000
            ? ` (~${(lbs / 1_000).toFixed(1)}k lb)`
            : ` (~${Math.round(lbs).toLocaleString()} lb)`;
    }

    return `${primary}${secondary}`;
};

const formatVolumeTick = (value) => {
    const absValue = Math.abs(value);
    if (absValue >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (absValue >= 1_000) {
        return `${(value / 1_000).toFixed(1)}k`;
    }
    return Math.round(value).toString();
};

const formatInlineNumbers = (text) => {
    if (!text || typeof text !== 'string') {
        return text;
    }

    return text.replace(/(-?\d+\.\d{2,})/g, (match) => {
        const num = parseFloat(match);
        if (Number.isNaN(num)) {
            return match;
        }

        const absNum = Math.abs(num);

        if (absNum >= 100) {
            return Math.round(num).toString();
        }

        const formatted = num.toFixed(1);
        return formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted;
    });
};

const AnalyticsRenderer = {
    charts: {},

    /**
     * Render KPI cards
     */
    renderKPICards(kpis) {
        const container = $('#analytics-kpi-cards');
        container.empty();

        const scrollToSection = (targetId) => {
            const section = document.getElementById(targetId);
            if (!section) {
                return;
            }

            section.scrollIntoView({ behavior: 'smooth', block: 'start' });

            section.classList.add('ring-2', 'ring-indigo-400', 'ring-offset-2', 'ring-offset-white', 'dark:ring-offset-gray-900');
            setTimeout(() => {
                section.classList.remove('ring-2', 'ring-indigo-400', 'ring-offset-2', 'ring-offset-white', 'dark:ring-offset-gray-900');
            }, 1600);
        };

        kpis.forEach(kpi => {
            const iconMap = {
                'Total Volume': 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
                'Muscle Balance': 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z',
                'Training Frequency': 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
                'Weak Points': 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
            };

            const iconPath = Object.keys(iconMap).find(key => kpi.title.includes(key.split(' ')[0])) || 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6';
            
            const card = $(`
                <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-all">
                    <div class="flex items-start justify-between">
                        <div>
                            <p class="text-sm text-gray-600 dark:text-gray-400">${kpi.title}</p>
                            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">${kpi.value}</p>
                            <p class="${kpi.color} text-sm mt-1">${kpi.change}</p>
                        </div>
                        <svg class="w-8 h-8 ${kpi.color}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconMap[Object.keys(iconMap).find(key => kpi.title.includes(key.split(' ')[0]))]}"/>
                        </svg>
                    </div>
                </div>
            `);
            
            if (kpi.title && kpi.title.toLowerCase().includes('weak point')) {
                card.addClass('cursor-pointer hover:shadow-md hover:border-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900');
                card.attr('role', 'button');
                card.attr('tabindex', '0');

                const handleActivate = (event) => {
                    if (event) {
                        event.preventDefault();
                    }
                    scrollToSection('weak-points-analysis');
                };

                card.on('click', handleActivate);
                card.on('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        handleActivate(event);
                    }
                });
            }
            
            container.append(card);
        });

        container.removeClass('hidden');
    },

    /**
     * Render Volume by Muscle chart
     */
    renderVolumeByMuscle(data) {
        const ctx = document.getElementById('volumeByMuscleChart');
        if (!ctx) return;

        const conditioningCtx = document.getElementById('conditioningVolumeChart');

        const $strengthCanvas = $(ctx);
        const $strengthWrapper = $strengthCanvas.parent();
        $strengthWrapper.find('.chart-empty-state').remove();

        const $conditioningCanvas = conditioningCtx ? $(conditioningCtx) : null;
        const $conditioningWrapper = $conditioningCanvas ? $conditioningCanvas.parent() : null;
        if ($conditioningWrapper) {
            $conditioningWrapper.find('.chart-empty-state').remove();
        }

        const EXCLUDED = new Set(['Cardio']);

        const positiveData = data.filter(item => (item.volume || 0) > 0);
        const strengthData = positiveData.filter(item => !EXCLUDED.has(item.muscle));
        const conditioningData = positiveData.filter(item => EXCLUDED.has(item.muscle));

        const strengthTotal = strengthData.reduce((sum, item) => sum + (item.volume || 0), 0);
        const conditioningTotal = conditioningData.reduce((sum, item) => sum + (item.volume || 0), 0);

        // Handle strength chart empty state
        if (!strengthData.length || strengthTotal <= 0) {
            if (this.charts.volumeByMuscle) {
                this.charts.volumeByMuscle.destroy();
                this.charts.volumeByMuscle = null;
            }
            $strengthCanvas.hide();
            $strengthWrapper.append(`
                <div class="chart-empty-state flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                    <svg class="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m4 0h2a2 2 0 002-2V7a2 2 0 00-2-2h-3m-4 0V3a2 2 0 00-2-2H9a2 2 0 00-2 2v2H4a2 2 0 00-2 2v8a2 2 0 002 2h1"/>
                    </svg>
                    <p class="font-semibold">No recent strength volume yet</p>
                    <p class="text-sm mt-1">Log weighted lifts to unlock this breakdown.</p>
                </div>
            `);
        } else {
            $strengthCanvas.show();

            const strengthLabels = strengthData.map(item => item.muscle);
            const strengthPercentages = strengthData.map(item => {
                const pct = (item.volume / strengthTotal) * 100;
                return Math.round(pct * 10) / 10;
            });
            const strengthVolumes = strengthData.map(item => item.volume);

            const palette = [
                'rgba(59, 130, 246, 0.85)',
                'rgba(16, 185, 129, 0.85)',
                'rgba(245, 158, 11, 0.85)',
                'rgba(236, 72, 153, 0.85)',
                'rgba(139, 92, 246, 0.85)',
                'rgba(239, 68, 68, 0.85)',
                'rgba(14, 165, 233, 0.85)',
                'rgba(34, 197, 94, 0.85)'
            ];
            const backgroundColors = strengthLabels.map((_, idx) => palette[idx % palette.length]);
            const borderColors = backgroundColors.map(color => color.replace('0.85', '1'));

        if (this.charts.volumeByMuscle) {
            this.charts.volumeByMuscle.destroy();
        }

        this.charts.volumeByMuscle = new Chart(ctx, {
            type: 'bar',
            data: {
                    labels: strengthLabels,
                    datasets: [{
                        label: 'Training Share (%)',
                        data: strengthPercentages,
                        rawVolumes: strengthVolumes,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 2,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const pct = context.parsed.y ?? 0;
                                    const rawVolumes = context.dataset.rawVolumes || [];
                                const raw = rawVolumes[context.dataIndex] || 0;
                                return `${pct}% • ${formatVolume(raw)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: value => value + '%'
                            },
                            title: {
                                display: true,
                                text: 'Share of Total Volume'
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45,
                                minRotation: 0
                            }
                        }
                    }
                }
            });
        }

        // Handle conditioning chart
        if (!conditioningCtx) {
            return;
        }

        if (this.charts.conditioningVolume) {
            this.charts.conditioningVolume.destroy();
            this.charts.conditioningVolume = null;
        }

        if (!conditioningData.length || conditioningTotal <= 0) {
            $conditioningCanvas.hide();
            if ($conditioningWrapper) {
                $conditioningWrapper.append(`
                    <div class="chart-empty-state flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                        <svg class="w-10 h-10 mb-2 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.042-.928 2.5-1.5 4-1.5 3.038 0 5.5 1.79 5.5 4s-2.462 4-5.5 4c-1.5 0-2.958-.572-4-1.5m0-8C10.958 6.572 9.5 7.5 8 7.5 4.962 7.5 2.5 5.71 2.5 3.5S4.962 0 8 0c1.5 0 2.958.572 4 1.5"/>
                        </svg>
                        <p class="font-semibold">No cardio-focused sessions logged</p>
                        <p class="text-xs mt-1 max-w-xs">Add dedicated cardio or full-body workouts to visualize your conditioning mix.</p>
                    </div>
                `);
            }
            return;
        }

        $conditioningCanvas.show();

        const conditioningLabels = conditioningData.map(item => item.muscle);
        const conditioningValues = conditioningData.map(item => {
            const pct = (item.volume / (strengthTotal + conditioningTotal)) * 100;
            return Math.round(pct * 10) / 10;
        });
        const conditioningVolumes = conditioningData.map(item => item.volume);

        const conditioningPalette = [
            'rgba(14, 165, 233, 0.85)',
            'rgba(107, 114, 128, 0.85)'
        ];

        this.charts.conditioningVolume = new Chart(conditioningCtx, {
            type: 'doughnut',
            data: {
                labels: conditioningLabels,
                datasets: [{
                    data: conditioningValues,
                    rawVolumes: conditioningVolumes,
                    backgroundColor: conditioningLabels.map((_, idx) => conditioningPalette[idx % conditioningPalette.length]),
                    borderColor: conditioningLabels.map((_, idx) => conditioningPalette[idx % conditioningPalette.length].replace('0.85', '1')),
                    borderWidth: 1.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const pct = context.parsed ?? 0;
                                const rawVolumes = context.dataset.rawVolumes || [];
                                const raw = rawVolumes[context.dataIndex] || 0;
                                return `${context.label}: ${pct}% • ${formatVolume(raw)}`;
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Render Muscle Balance radar chart
     */
    renderMuscleBalance(data) {
        const ctx = document.getElementById('muscleBalanceChart');
        if (!ctx) return;

        if (this.charts.muscleBalance) {
            this.charts.muscleBalance.destroy();
        }

        const chartCtx = ctx.getContext('2d');
        const gradientCenterX = chartCtx.canvas.width / 2;
        const gradientCenterY = chartCtx.canvas.height / 2;
        const gradientRadius = Math.max(gradientCenterX, gradientCenterY);
        const fillGradient = chartCtx.createRadialGradient(
            gradientCenterX,
            gradientCenterY,
            gradientRadius * 0,
            gradientCenterX,
            gradientCenterY,
            gradientRadius
        );
        fillGradient.addColorStop(0, 'rgba(99, 102, 241, 0.28)');
        fillGradient.addColorStop(1, 'rgba(99, 102, 241, 0.05)');

        this.charts.muscleBalance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: data.map(d => d.category),
                datasets: [{
                    data: data.map(d => d.value),
                    backgroundColor: fillGradient,
                    borderColor: 'rgba(129, 140, 248, 0.95)',
                    borderWidth: 3,
                    pointBackgroundColor: '#312e81',
                    pointBorderColor: 'rgba(191, 219, 254, 0.9)',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#eef2ff',
                    pointHoverBorderColor: '#4f46e5'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: 12
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: context => context[0].label,
                            label: context => `Score: ${Math.round(context.parsed.r)}`
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        suggestedMax: 100,
                        ticks: {
                            display: false
                        },
                        angleLines: {
                            color: 'rgba(148, 163, 184, 0.25)'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.18)'
                        },
                        pointLabels: {
                            color: '#c7d2fe',
                            font: {
                                size: 11,
                                weight: '600'
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Render Volume Progression line chart
     */
    renderVolumeProgression(data) {
        const ctx = document.getElementById('volumeProgressionChart');
        if (!ctx) return;

        if (this.charts.volumeProgression) {
            this.charts.volumeProgression.destroy();
        }

        this.charts.volumeProgression = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.week),
                datasets: [
                    {
                        label: 'Chest',
                        data: data.map(d => d.chest),
                        borderColor: 'rgba(59, 130, 246, 1)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Back',
                        data: data.map(d => d.back),
                        borderColor: 'rgba(16, 185, 129, 1)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Legs',
                        data: data.map(d => d.legs),
                        borderColor: 'rgba(245, 158, 11, 1)',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${formatVolume(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatVolumeTick(value) + ' kg';
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Render Push/Pull pie chart
     */
    renderPushPull(pushPullData) {
        const ctx = document.getElementById('pushPullChart');
        if (!ctx) return;

        if (this.charts.pushPull) {
            this.charts.pushPull.destroy();
        }

        this.charts.pushPull = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: pushPullData.data.map(d => d.name),
                datasets: [{
                    data: pushPullData.data.map(d => d.value),
                    backgroundColor: pushPullData.data.map(d => d.color),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed}%`;
                            }
                        }
                    }
                }
            }
        });

        // Show recommendation
        $('#push-pull-recommendation').html(`
            <p class="${pushPullData.recommendation.includes('⚠️') ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-green-600 dark:text-green-400 font-medium'}">
                ${pushPullData.recommendation}
            </p>
        `);
    },

    /**
     * Render weak points list - Enhanced comprehensive view
     */
    renderWeakPoints(weakPoints) {
        const container = $('#weak-points-list');
        container.empty();

        const escapeHtml = (value) => {
            if (value === null || value === undefined) return '';
            if (typeof window !== 'undefined' && window.RoutineUtils && typeof window.RoutineUtils.escapeHtml === 'function') {
                return window.RoutineUtils.escapeHtml(value);
            }
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

        if (!weakPoints || weakPoints.length === 0) {
            container.html(`
                <div class="text-center py-6 text-gray-600 dark:text-gray-400">
                    <svg class="w-14 h-14 mx-auto mb-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p class="font-semibold text-green-600 dark:text-green-400 text-sm">Everything looks balanced!</p>
                    <p class="text-xs mt-1">Keep logging workouts and we’ll flag any muscle groups that fall behind.</p>
                </div>
            `);
            return;
        }

        const severityOrder = { critical: 0, warning: 1, balanced: 2, strong: 3 };
        const sorted = [...weakPoints].sort((a, b) => {
            const orderA = severityOrder[a.status] ?? 99;
            const orderB = severityOrder[b.status] ?? 99;
            if (orderA !== orderB) return orderA - orderB;
            return (a.percentage_of_avg ?? 0) - (b.percentage_of_avg ?? 0);
        });

        const summary = sorted.reduce((acc, point) => {
            acc[point.status] = (acc[point.status] || 0) + 1;
            return acc;
        }, {});

        const formatFrequency = (value, options = {}) => {
            if (value === null || value === undefined || Number.isNaN(value)) {
                return '--';
            }

            const precision = options.precision ?? 1;
            const minFractionDigits = options.minFractionDigits ?? 0;
            const maxFractionDigits = options.maxFractionDigits ?? precision;

            return Number(value).toLocaleString(undefined, {
                minimumFractionDigits: minFractionDigits,
                maximumFractionDigits: maxFractionDigits
            });
        };

        const summaryChip = (label, count, color) => {
            if (!count) return '';
            return `
                <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-${color}-100 text-${color}-700 dark:bg-${color}-900/30 dark:text-${color}-300">
                    ${label}
                    <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-${color}-200 dark:bg-${color}-900/60 text-${color}-800 dark:text-${color}-200">
                        ${count}
                    </span>
                </span>
            `;
        };

        container.append(`
            <div class="rounded-xl border border-slate-200 dark:border-slate-700/70 bg-gradient-to-br from-slate-50/95 via-slate-50/70 to-indigo-50/60 dark:from-slate-900/80 dark:via-slate-900/70 dark:to-indigo-950/50 backdrop-blur-sm p-4 mb-4 transition-all">
                <div class="flex items-center justify-center mb-3">
                    <span class="uppercase tracking-wide text-xs font-semibold text-slate-600 dark:text-slate-300">Focus board</span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-medium">
                    <div class="flex items-center gap-2 bg-white/80 dark:bg-slate-900/70 rounded-lg px-3 py-2 border border-red-200/70 dark:border-red-800/70 shadow-sm">
                        <span class="w-2 h-2 rounded-full bg-red-500"></span>
                        <span class="text-red-600 dark:text-red-300">Critical: <strong>${summary.critical || 0}</strong></span>
                    </div>
                    <div class="flex items-center gap-2 bg-white/80 dark:bg-slate-900/70 rounded-lg px-3 py-2 border border-amber-200/70 dark:border-amber-800/70 shadow-sm">
                        <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span class="text-amber-600 dark:text-amber-300">Warning: <strong>${summary.warning || 0}</strong></span>
                    </div>
                    <div class="flex items-center gap-2 bg-white/80 dark:bg-slate-900/70 rounded-lg px-3 py-2 border border-blue-200/70 dark:border-blue-800/70 shadow-sm">
                        <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span class="text-blue-600 dark:text-blue-300">Balanced: <strong>${summary.balanced || 0}</strong></span>
                    </div>
                    <div class="flex items-center gap-2 bg-white/80 dark:bg-slate-900/70 rounded-lg px-3 py-2 border border-emerald-200/70 dark:border-emerald-800/70 shadow-sm">
                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span class="text-emerald-600 dark:text-emerald-300">Strong: <strong>${summary.strong || 0}</strong></span>
                    </div>
                </div>
            </div>
        `);

        sorted.forEach(point => {
            const statusStyles = {
                critical: {
                    card: 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-950/40',
                    badge: 'bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-200',
                    label: 'Needs attention',
                    icon: 'M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                },
                warning: {
                    card: 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40',
                    badge: 'bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200',
                    label: 'Slightly behind',
                    icon: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'
                },
                balanced: {
                    card: 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40',
                    badge: 'bg-blue-500/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-200',
                    label: 'On track',
                    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                },
                strong: {
                    card: 'border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40',
                    badge: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200',
                    label: 'Momentum',
                    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
                }
            };

            const styles = statusStyles[point.status] || statusStyles.balanced;
            const frequencyGap = point.optimal_frequency ? Math.max(0, (point.optimal_frequency - (point.frequency_per_week || 0))) : null;
            const volumePct = point.percentage_of_avg !== undefined ? Math.max(0, Math.min(150, Math.round(point.percentage_of_avg))) : null;
            const volumeTargetPct = point.target_volume ? Math.round(((point.actual_volume || 0) / point.target_volume) * 100) : null;

            let actionHint = '';
            if (point.status === 'critical' || point.status === 'warning') {
                const addSessions = frequencyGap && frequencyGap >= 0.5 ? `+${formatFrequency(frequencyGap, { minFractionDigits: 0, maxFractionDigits: 1 })} session/week` : '1 extra session this week';
                const addVolume = volumeTargetPct && volumeTargetPct < 100 ? `${Math.max(1, Math.ceil((100 - volumeTargetPct) / 20))} extra exercise${volumeTargetPct < 80 ? 's' : ''}` : '1 finisher set';
                actionHint = `
                    <div class="mt-3 text-xs bg-white/80 dark:bg-slate-900/70 border border-${point.status === 'critical' ? 'red' : 'amber'}-200/70 dark:border-${point.status === 'critical' ? 'red' : 'amber'}-900/60 rounded-lg px-3 py-2 shadow-sm">
                        <p class="font-semibold text-${point.status === 'critical' ? 'red' : 'amber'}-700 dark:text-${point.status === 'critical' ? 'red' : 'amber'}-200 uppercase tracking-wide text-[10px] mb-1">Next session goal</p>
                        <ul class="text-${point.status === 'critical' ? 'red' : 'amber'}-600 dark:text-${point.status === 'critical' ? 'red' : 'amber'}-200 space-y-1">
                            <li>• Add <span class="font-semibold">${addSessions}</span></li>
                            <li>• Include <span class="font-semibold">${addVolume}</span> focusing on ${escapeHtml(point.muscle)}</li>
                        </ul>
                    </div>
                `;
            }

            const trendIcon = point.trend > 10 ? '📈 improving'
                : point.trend < -10 ? '📉 declining'
                : '➡️ steady';

            container.append(`
                <div class="mb-3">
                    <div class="p-4 rounded-xl border ${styles.card} shadow-sm hover:shadow-md transition-all duration-200">
                        <div class="flex items-center justify-between gap-3">
                            <div class="flex items-start gap-3">
                                <div class="mt-1">
                                    <svg class="w-5 h-5 ${styles.badge.replace('bg-', '').replace('text-', '').split(' ')[1]}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${styles.icon}"/>
                                    </svg>
                                </div>
                                <div>
                                    <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 text-center sm:text-left">
                                        <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">${escapeHtml(point.muscle)}</h4>
                                        <div class="flex justify-center sm:justify-start items-center gap-1">
                                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${styles.badge}">
                                                ${styles.label}
                                            </span>
                                            <span class="text-[11px] text-slate-400 dark:text-slate-500">${trendIcon}</span>
                                        </div>
                                    </div>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed text-center sm:text-left">
                                        ${escapeHtml(formatInlineNumbers(point.message))}
                                    </p>
                                </div>
                            </div>
                            <div class="text-center sm:text-right shrink-0">
                                <p class="text-xs uppercase text-slate-400 dark:text-slate-500 tracking-wide">Vs avg</p>
                                <p class="text-lg font-bold ${point.percentage_of_avg >= 100 ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}">
                                    ${point.percentage_of_avg !== undefined ? `${Math.round(point.percentage_of_avg)}%` : '--'}
                                </p>
                                ${point.combined_score ? `<p class="text-[11px] text-slate-400 dark:text-slate-500">Score ${point.combined_score}</p>` : ''}
                            </div>
                        </div>

                        <div class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-500 dark:text-slate-300">
                            <div class="bg-white/80 dark:bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-200/80 dark:border-slate-800/80 text-center sm:text-left shadow-sm">
                                <p class="font-semibold text-slate-600 dark:text-slate-200 uppercase text-[10px]">Sessions</p>
                                <p class="text-sm font-medium text-slate-800 dark:text-slate-50">
                                    ${point.frequency_per_week ? `${formatFrequency(point.frequency_per_week, { minFractionDigits: 0, maxFractionDigits: 1 })}x/week` : 'No sessions'}
                                    ${point.optimal_frequency ? `<span class="block text-[10px] text-slate-400 dark:text-slate-400/80">Goal ${formatFrequency(point.optimal_frequency, { minFractionDigits: 0, maxFractionDigits: 1 })}</span>` : ''}
                                </p>
                            </div>
                            <div class="bg-white/80 dark:bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-200/80 dark:border-slate-800/80 text-center sm:text-left shadow-sm">
                                <p class="font-semibold text-slate-600 dark:text-slate-200 uppercase text-[10px]">Volume</p>
                                <p class="text-sm font-medium text-slate-800 dark:text-slate-50">
                                    ${formatVolume(point.actual_volume || 0)}
                                    ${volumeTargetPct && volumeTargetPct > 0 ? `<span class="block text-[10px] text-slate-400 dark:text-slate-400/80">${volumeTargetPct}% of target</span>` : ''}
                                </p>
                            </div>
                            <div class="bg-white/80 dark:bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-200/80 dark:border-slate-800/80 text-center sm:text-left shadow-sm">
                                <p class="font-semibold text-slate-600 dark:text-slate-200 uppercase text-[10px]">Exercises</p>
                                <p class="text-sm font-medium text-slate-800 dark:text-slate-50">
                                    ${point.exercise_count || 0} moves
                                    ${point.days_trained ? `<span class="block text-[10px] text-slate-400 dark:text-slate-400/80">${point.days_trained} training days</span>` : ''}
                                </p>
                            </div>
                            <div class="bg-white/80 dark:bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-200/80 dark:border-slate-800/80 text-center sm:text-left shadow-sm">
                                <p class="font-semibold text-slate-600 dark:text-slate-200 uppercase text-[10px]">Intensity</p>
                                <p class="text-sm font-medium text-slate-800 dark:text-slate-50">
                                    ${point.intensity_score ? `${point.intensity_score}%` : '--'}
                                    ${point.prev_volume ? `<span class="block text-[10px] text-slate-400 dark:text-slate-400/80">Prev ${formatVolume(point.prev_volume)}</span>` : ''}
                                </p>
                            </div>
                        </div>
                        ${actionHint}
                    </div>
                </div>
            `);
        });
    },

    /**
     * Render recent PRs list
     */
    renderRecentPRs(prs) {
        const container = $('#recent-prs-list');
        container.empty();

        if (!prs || prs.length === 0) {
            container.html(`
                <div class="text-center py-4 text-gray-600 dark:text-gray-400">
                    <p>No recent PRs. Keep pushing!</p>
                </div>
            `);
            return;
        }

        prs.forEach(pr => {
            // Safety check: Skip invalid entries (shouldn't happen since names are required)
            if (!pr.exercise || !pr.weight) {
                console.warn('Skipping invalid PR:', pr);
                return;
            }
            
            const card = $(`
                <div class="p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/30 dark:to-blue-900/30 rounded-lg border border-green-200 dark:border-green-700">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-semibold text-gray-900 dark:text-gray-100">${RoutineUtils.escapeHtml(pr.exercise)}</p>
                            <p class="text-sm text-gray-600 dark:text-gray-400">${RoutineUtils.escapeHtml(pr.muscles || 'Unknown')}</p>
                        </div>
                        <span class="text-lg font-bold text-green-600 dark:text-green-400">${RoutineUtils.escapeHtml(pr.weight)}</span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">${RoutineUtils.escapeHtml(pr.date)}</p>
                </div>
            `);
            container.append(card);
        });
    },

    /**
     * Render AI recommendations
     */
    renderRecommendations(recommendations) {
        const container = $('#recommendations-list');
        container.empty();

        if (!recommendations || recommendations.length === 0) {
            container.html(`
                <div class="col-span-full text-center py-8">
                    <p class="text-white/80 text-sm">No recommendations available</p>
                </div>
            `);
            return;
        }

        recommendations.forEach(rec => {
            // Determine styling based on priority
            let borderColor, bgColor, iconColor, textColor;
            let icon = '';
            
            switch(rec.priority) {
                case 'critical':
                    borderColor = 'border-red-400 dark:border-red-600';
                    bgColor = 'bg-red-500/20 dark:bg-red-900/30';
                    iconColor = 'text-red-300 dark:text-red-400';
                    textColor = 'text-white';
                    icon = '🚨';
                    break;
                case 'warning':
                    borderColor = 'border-yellow-400 dark:border-yellow-600';
                    bgColor = 'bg-yellow-500/20 dark:bg-yellow-900/30';
                    iconColor = 'text-yellow-300 dark:text-yellow-400';
                    textColor = 'text-white';
                    icon = '⚠️';
                    break;
                case 'good':
                    borderColor = 'border-green-400 dark:border-green-600';
                    bgColor = 'bg-green-500/20 dark:bg-green-900/30';
                    iconColor = 'text-green-300 dark:text-green-400';
                    textColor = 'text-white';
                    icon = '✅';
                    break;
                default: // 'info'
                    borderColor = 'border-blue-400 dark:border-blue-600';
                    bgColor = 'bg-blue-500/20 dark:bg-blue-900/30';
                    iconColor = 'text-blue-300 dark:text-blue-400';
                    textColor = 'text-white';
                    icon = 'ℹ️';
            }
            
            const card = $(`
                <div class="${bgColor} ${borderColor} border-2 rounded-xl p-4 backdrop-blur-sm hover:scale-105 transition-transform">
                    <div class="flex items-start gap-3">
                        <div class="flex-shrink-0 text-2xl">${icon}</div>
                        <div class="flex-1 min-w-0">
                            <p class="font-bold mb-2 ${textColor} text-sm sm:text-base">${rec.title}</p>
                            <p class="text-sm ${textColor} opacity-90 leading-relaxed">${rec.message}</p>
                        </div>
                    </div>
                </div>
            `);
            container.append(card);
        });
    },

    /**
     * Show loading state
     */
    showLoading() {
        $('#analytics-loading').show();
        $('#analytics-kpi-cards').addClass('hidden');
        $('#analytics-main-charts').addClass('hidden');
        $('#analytics-secondary-charts').addClass('hidden');
        $('#analytics-insights').addClass('hidden');
        $('#analytics-recommendations').addClass('hidden');
    },

    /**
     * Hide loading state
     */
    hideLoading() {
        $('#analytics-loading').hide();
        $('#analytics-kpi-cards').removeClass('hidden');
        $('#analytics-main-charts').removeClass('hidden');
        $('#analytics-secondary-charts').removeClass('hidden');
        $('#analytics-insights').removeClass('hidden');
        $('#analytics-recommendations').removeClass('hidden');
    },

    /**
     * Show error state
     */
    showError(message) {
        $('#analytics-loading').html(`
            <div class="text-center py-12">
                <svg class="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-red-600 dark:text-red-400 font-medium">${message}</p>
                <button id="retry-analytics" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    Retry
                </button>
            </div>
        `);
    }
};

// Export for use in other modules / global access
if (typeof window !== 'undefined') {
    window.AnalyticsRenderer = AnalyticsRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsRenderer;
}



