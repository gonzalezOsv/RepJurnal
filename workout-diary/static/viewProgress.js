/**
 * Progress Page - Main Controller
 * Coordinates all progress tracking modules and handles tab navigation
 */

$(document).ready(function () {
    // Initialize tab modules
    setTimeout(() => MainLiftsTab.init(), 100);
    RecordsTab.init();
    // JournalTab initializes itself in its own module
    
    // Tab navigation
    $('.tab-button').on('click', function () {
        $('.tab-button').removeClass('active');
        $('.tab-content').removeClass('active').addClass('hidden');
        $(this).addClass('active');

        const tabId = $(this).data('tab');
        $(`#${tabId}`).addClass('active').removeClass('hidden');
        
        // Load tab-specific data
        switch(tabId) {
            case 'main-lifts':
                setTimeout(() => MainLiftsTab.loadTrackedExercises(), 100);
                break;
            case 'records':
                RecordsTab.loadAllRecords();
                break;
            case 'journal':
                // Journal loads on tab click (handled in journalTab.js)
                break;
        }
    });
});

