#!/usr/bin/env python3
"""
Component Extraction Script for viewProgress.html Modularization

This script extracts tab and modal content from the monolithic viewProgress.html
and creates separate component files for better code organization.

Usage:
    python extract_components.py

The script will:
1. Read the original viewProgress.html
2. Extract content for each tab and modal based on line ranges
3. Create directory structure (progress/tabs, progress/modals)
4. Save components to individual files
5. Create a backup of the original file

Author: RepJournal Team
Date: 2025-01-04
"""

import os
import shutil
from datetime import datetime

# Configuration
TEMPLATES_DIR = 'templates'
ORIGINAL_FILE = os.path.join(TEMPLATES_DIR, 'viewProgress.html')
BACKUP_DIR = os.path.join(TEMPLATES_DIR, 'backups')

# Component definitions with line ranges from original file
COMPONENTS = [
    {
        'name': 'Main Lifts Tab',
        'file': 'progress/tabs/main_lifts.html',
        'start': 72,
        'end': 134,
        'status': 'skip',  # Already created manually
        'description': 'Tracked exercises grid with empty state and custom exercise section'
    },
    {
        'name': 'Analytics Tab',
        'file': 'progress/tabs/analytics.html',
        'start': 136,
        'end': 302,
        'description': 'Analytics dashboard with KPI cards, charts, and insights'
    },
    {
        'name': 'Records Tab',
        'file': 'progress/tabs/records.html',
        'start': 304,
        'end': 402,
        'description': 'Personal records display including Big 3 and all exercises'
    },
    {
        'name': 'Balance Tab',
        'file': 'progress/tabs/balance.html',
        'start': 524,
        'end': 771,
        'description': 'Body part balance visualization with SVG diagram'
    },
    {
        'name': 'Manage Tracked Lifts Modal',
        'file': 'progress/modals/manage_tracked_lifts.html',
        'start': 406,
        'end': 467,
        'description': 'Modal for managing tracked exercises with checkbox grid'
    },
    {
        'name': 'Add Exercise Modal',
        'file': 'progress/modals/add_exercise.html',
        'start': 469,
        'end': 496,
        'description': 'Modal for adding exercises to custom tracking section'
    }
]


def create_backup():
    """Create a timestamped backup of the original file"""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = os.path.join(BACKUP_DIR, f'viewProgress_{timestamp}.html')
    shutil.copy2(ORIGINAL_FILE, backup_file)
    print(f"✅ Created backup: {backup_file}")
    return backup_file


def read_original_file():
    """Read the original viewProgress.html file"""
    try:
        with open(ORIGINAL_FILE, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        print(f"✅ Read {ORIGINAL_FILE} ({len(lines)} lines)")
        return lines
    except FileNotFoundError:
        print(f"❌ Error: {ORIGINAL_FILE} not found!")
        print(f"   Make sure you're running this script from the workout-diary directory")
        return None


def create_directories():
    """Create necessary directory structure"""
    dirs = [
        os.path.join(TEMPLATES_DIR, 'progress', 'tabs'),
        os.path.join(TEMPLATES_DIR, 'progress', 'modals')
    ]
    for dir_path in dirs:
        os.makedirs(dir_path, exist_ok=True)
        print(f"✅ Created directory: {dir_path}")


def extract_component(lines, component):
    """Extract content for a specific component"""
    if component.get('status') == 'skip':
        print(f"⏭️  Skipping {component['name']} - {component.get('description', 'already created')}")
        return None
    
    start_idx = component['start'] - 1  # Convert to 0-based index
    end_idx = component['end']
    
    content = ''.join(lines[start_idx:end_idx])
    
    # Add component header comment
    header = f"""<!-- 
  Component: {component['name']}
  Description: {component['description']}
  Extracted from: viewProgress.html (lines {component['start']}-{component['end']})
  Date: {datetime.now().strftime('%Y-%m-%d')}
-->

"""
    
    return header + content


def save_component(component, content):
    """Save component content to file"""
    output_path = os.path.join(TEMPLATES_DIR, component['file'])
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    line_count = len(content.split('\n'))
    print(f"✅ Created {output_path} ({line_count} lines)")


def generate_main_layout():
    """Generate the new main viewProgress.html layout with includes"""
    layout = '''{% extends "layout_user.html" %}

{% block title %}Progress Tracking - RepJournal{% endblock %}

{% block content %}
<div class="bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-8 transition-colors duration-200">
  <div class="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
    
    <!-- Journal Header with Integrated Tabs -->
    <div class="mb-8">
      <div class="bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-800 dark:via-gray-900 dark:to-indigo-900 rounded-xl sm:rounded-2xl shadow-lg border-2 border-slate-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        <!-- Decorative corner -->
        <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-100 dark:from-indigo-900 to-transparent rounded-bl-full opacity-40"></div>
        
        <div class="relative z-10">
          <!-- Title Section -->
          <div class="text-center mb-6">
            <div class="flex items-center justify-center gap-3 mb-4">
              <div class="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 dark:from-indigo-500 dark:to-blue-500 rounded-xl flex items-center justify-center shadow-md">
                <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
              <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-100">
                Your Progress Journey
              </h1>
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-xs sm:text-sm lg:text-base max-w-2xl mx-auto mb-4">
              Track your strength gains, personal records, and workout consistency
            </p>
            <div class="h-1 w-48 mx-auto bg-gradient-to-r from-indigo-300 via-blue-300 dark:from-indigo-700 dark:via-blue-700 to-transparent rounded-full"></div>
          </div>

          <!-- Integrated Tab Navigation -->
          <div id="progression-tabs" class="mt-6">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              
              <button class="tab-button active flex flex-col items-center justify-center p-4 sm:p-5 rounded-xl border-2 border-slate-200 dark:border-gray-700 transition-all duration-200 bg-white dark:bg-gray-800 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-blue-50 dark:hover:from-gray-700 dark:hover:to-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 shadow-sm hover:shadow-md" data-tab="main-lifts">
                <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
                <span class="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">Main Lifts</span>
              </button>
              
              <button class="tab-button flex flex-col items-center justify-center p-4 sm:p-5 rounded-xl border-2 border-slate-200 dark:border-gray-700 transition-all duration-200 bg-white dark:bg-gray-800 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-blue-50 dark:hover:from-gray-700 dark:hover:to-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 shadow-sm hover:shadow-md" data-tab="analytics">
                <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                <span class="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">Analytics</span>
              </button>
              
              <button class="tab-button flex flex-col items-center justify-center p-4 sm:p-5 rounded-xl border-2 border-slate-200 dark:border-gray-700 transition-all duration-200 bg-white dark:bg-gray-800 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-blue-50 dark:hover:from-gray-700 dark:hover:to-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 shadow-sm hover:shadow-md" data-tab="records">
                <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                </svg>
                <span class="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">Records</span>
              </button>
              
              <button class="tab-button flex flex-col items-center justify-center p-4 sm:p-5 rounded-xl border-2 border-slate-200 dark:border-gray-700 transition-all duration-200 bg-white dark:bg-gray-800 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-blue-50 dark:hover:from-gray-700 dark:hover:to-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 shadow-sm hover:shadow-md" data-tab="balance">
                <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                <span class="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">Balance</span>
              </button>
              
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab Contents (Modular Components) -->
    {% include 'progress/tabs/main_lifts.html' %}
    {% include 'progress/tabs/analytics.html' %}
    {% include 'progress/tabs/records.html' %}
    {% include 'progress/tabs/balance.html' %}

  </div>
</div>

<!-- Modals (Modular Components) -->
{% include 'progress/modals/manage_tracked_lifts.html' %}
{% include 'progress/modals/add_exercise.html' %}

<!-- Styles -->
<style>
  .tab-button {
    @apply cursor-pointer;
  }
  
  .tab-button.active {
    background: linear-gradient(to br, rgb(79 70 229), rgb(37 99 235));
    @apply text-white border-indigo-600 dark:border-indigo-500 shadow-lg;
  }
  
  .dark .tab-button.active {
    background: linear-gradient(to br, rgb(99 102 241), rgb(59 130 246));
  }
  
  .tab-button.active svg {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
  }
  
  .tab-content {
    @apply hidden;
  }
  
  .tab-content.active {
    @apply block;
  }
</style>
{% endblock %}

{% block scripts %}
{{ super() }}
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">
<script src="{{ url_for('static', filename='modules/analyticsClient.js') }}"></script>
<script src="{{ url_for('static', filename='modules/analyticsRenderer.js') }}"></script>
<script src="{{ url_for('static', filename='viewProgress.js') }}"></script>
<script>
// Analytics Dashboard Integration
$(document).ready(function() {
    let currentTimeRange = 30;

    // Load analytics when Analytics tab is clicked
    $(document).on('click', '[data-tab="analytics"]', function() {
        loadAnalyticsDashboard(currentTimeRange);
    });

    // Handle time range change
    $('#analytics-time-range').on('change', function() {
        currentTimeRange = parseInt($(this).val());
        loadAnalyticsDashboard(currentTimeRange);
    });

    // Load analytics dashboard
    async function loadAnalyticsDashboard(days) {
        try {
            AnalyticsRenderer.showLoading();

            // Fetch all analytics data
            const analytics = await AnalyticsClient.fetchAllAnalytics(days);

            // Render KPI cards
            AnalyticsRenderer.renderKPICards(analytics.kpis);

            // Render main charts
            AnalyticsRenderer.renderVolumeByMuscle(analytics.volumeByMuscle.data);
            AnalyticsRenderer.renderMuscleBalance(analytics.muscleBalance);

            // Render secondary charts
            AnalyticsRenderer.renderVolumeProgression(analytics.volumeProgression);
            AnalyticsRenderer.renderPushPull(analytics.pushPullBalance);

            // Render insights
            AnalyticsRenderer.renderWeakPoints(analytics.weakPoints);
            AnalyticsRenderer.renderRecentPRs(analytics.recentPRs);
            AnalyticsRenderer.renderRecommendations(analytics.recommendations);

            // Hide loading
            AnalyticsRenderer.hideLoading();

        } catch (error) {
            console.error('Error loading analytics dashboard:', error);
            AnalyticsRenderer.showError('Failed to load analytics. Please try again.');

            // Retry button handler
            $(document).on('click', '#retry-analytics', function() {
                loadAnalyticsDashboard(days);
            });
        }
    }

    // Auto-load analytics if on analytics tab
    if ($('#analytics').hasClass('active') || !$('#analytics').hasClass('hidden')) {
        loadAnalyticsDashboard(currentTimeRange);
    }
});
</script>
{% endblock %}
'''
    return layout


def main():
    """Main execution function"""
    print("=" * 60)
    print("ViewProgress.html Component Extraction Script")
    print("=" * 60)
    print()
    
    # Step 1: Create backup
    print("Step 1: Creating backup...")
    backup_path = create_backup()
    print()
    
    # Step 2: Read original file
    print("Step 2: Reading original file...")
    lines = read_original_file()
    if lines is None:
        return
    print()
    
    # Step 3: Create directories
    print("Step 3: Creating directory structure...")
    create_directories()
    print()
    
    # Step 4: Extract and save components
    print("Step 4: Extracting components...")
    for component in COMPONENTS:
        content = extract_component(lines, component)
        if content:
            save_component(component, content)
    print()
    
    # Step 5: Generate new main layout
    print("Step 5: Generating new main layout...")
    new_layout = generate_main_layout()
    new_layout_path = os.path.join(TEMPLATES_DIR, 'viewProgress_modular.html')
    with open(new_layout_path, 'w', encoding='utf-8') as f:
        f.write(new_layout)
    print(f"✅ Created {new_layout_path}")
    print()
    
    # Summary
    print("=" * 60)
    print("✅ EXTRACTION COMPLETE!")
    print("=" * 60)
    print()
    print("Summary:")
    print(f"  • Original file backed up to: {backup_path}")
    print(f"  • Components created in: templates/progress/")
    print(f"  • New modular layout: {new_layout_path}")
    print()
    print("Next Steps:")
    print("  1. Review the extracted components")
    print("  2. Test the new modular layout:")
    print("     - Rename viewProgress.html to viewProgress_old.html")
    print("     - Rename viewProgress_modular.html to viewProgress.html")
    print("  3. Test all tabs and modals")
    print("  4. If issues occur, restore from backup")
    print()
    print("Files created:")
    for component in COMPONENTS:
        if component.get('status') != 'skip':
            print(f"  ✅ templates/{component['file']}")
    print(f"  ✅ {new_layout_path}")
    print()


if __name__ == '__main__':
    main()




