/**
 * Module: UI Helpers
 * Purpose: UI utilities, notifications, and modal management
 * Dependencies: utils.js (for escapeHtml)
 */
const UIHelpers = (function() {
    'use strict';
    
    /**
     * Show success notification
     * @param {string} message - Success message to display
     * @param {number} duration - Duration in milliseconds (default: 3000)
     */
    function showSuccess(message, duration = 3000) {
        const $message = $('<div>')
            .addClass('fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2')
            .html(`
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                ${RoutineUtils.escapeHtml(message)}
            `)
            .appendTo('body')
            .fadeIn(300);
        
        setTimeout(() => {
            $message.fadeOut(300, function() {
                $(this).remove();
            });
        }, duration);
    }
    
    /**
     * Show error notification
     * @param {string} message - Error message to display
     * @param {number} duration - Duration in milliseconds (default: 3000)
     */
    function showError(message, duration = 3000) {
        const $message = $('<div>')
            .addClass('fixed top-4 right-4 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2')
            .html(`
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                ${RoutineUtils.escapeHtml(message)}
            `)
            .appendTo('body')
            .fadeIn(300);
        
        setTimeout(() => {
            $message.fadeOut(300, function() {
                $(this).remove();
            });
        }, duration);
    }
    
    /**
     * Show info notification
     * @param {string} message - Info message to display
     * @param {number} duration - Duration in milliseconds (default: 3000)
     */
    function showInfo(message, duration = 3000) {
        const $message = $('<div>')
            .addClass('fixed top-4 right-4 z-50 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2')
            .html(`
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                ${RoutineUtils.escapeHtml(message)}
            `)
            .appendTo('body')
            .fadeIn(300);
        
        setTimeout(() => {
            $message.fadeOut(300, function() {
                $(this).remove();
            });
        }, duration);
    }
    
    /**
     * Show loading spinner in a container
     * @param {jQuery|string} container - Container element or selector
     * @param {string} message - Loading message (optional)
     */
    function showLoading(container, message = 'Loading...') {
        const $container = $(container);
        const loadingHtml = `
            <div class="loading-spinner text-center py-12">
                <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                <p class="mt-4 text-gray-600 dark:text-gray-400">${RoutineUtils.escapeHtml(message)}</p>
            </div>
        `;
        $container.html(loadingHtml);
    }
    
    /**
     * Hide loading spinner
     * @param {jQuery|string} container - Container element or selector
     */
    function hideLoading(container) {
        $(container).find('.loading-spinner').remove();
    }
    
    /**
     * Show empty state message
     * @param {jQuery|string} container - Container element or selector
     * @param {Object} options - Configuration options
     */
    function showEmptyState(container, options = {}) {
        const defaults = {
            icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5z',
            title: 'No Items Found',
            message: 'Nothing to display here',
            buttonText: null,
            buttonAction: null
        };
        
        const config = { ...defaults, ...options };
        
        const buttonHtml = config.buttonText ? `
            <button class="empty-state-action inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all">
                ${RoutineUtils.escapeHtml(config.buttonText)}
            </button>
        ` : '';
        
        const emptyStateHtml = `
            <div class="empty-state col-span-full text-center py-16">
                <div class="inline-block p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-md mb-4">
                    <svg class="w-20 h-20 text-gray-400 dark:text-gray-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${config.icon}"/>
                    </svg>
                </div>
                <p class="text-lg sm:text-xl text-gray-700 dark:text-gray-300 font-bold mb-2">${RoutineUtils.escapeHtml(config.title)}</p>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">${RoutineUtils.escapeHtml(config.message)}</p>
                ${buttonHtml}
            </div>
        `;
        
        $(container).html(emptyStateHtml);
        
        if (config.buttonAction) {
            $(container).find('.empty-state-action').on('click', config.buttonAction);
        }
    }
    
    /**
     * Confirm dialog with custom styling
     * @param {string} message - Confirmation message
     * @param {string} confirmText - Confirm button text
     * @param {string} cancelText - Cancel button text
     * @returns {Promise<boolean>} True if confirmed
     */
    function confirmAction(message, confirmText = 'Confirm', cancelText = 'Cancel') {
        return new Promise((resolve) => {
            const modalId = `confirm-modal-${Date.now()}`;
            const escapedMessage = RoutineUtils.escapeHtml(message).replace(/\n/g, '<br>');
            
            const $modal = $(`
                <div id="${modalId}" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
                    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-7 animate__animated animate__fadeIn">
                        <div class="flex items-start gap-3">
                            <div class="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">
                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M5.455 19h13.09c1.54 0 2.49-1.667 1.722-3L13.722 5c-.77-1.333-2.674-1.333-3.444 0L3.733 16c-.768 1.333.182 3 1.722 3z"/>
                                </svg>
                            </div>
                            <div class="flex-1">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Please Confirm</h3>
                                <p class="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">${escapedMessage}</p>
                            </div>
                        </div>
                        <div class="mt-6 flex justify-end gap-3">
                            <button type="button" class="confirm-cancel px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                                ${RoutineUtils.escapeHtml(cancelText)}
                            </button>
                            <button type="button" class="confirm-accept px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all shadow-md hover:shadow-lg">
                                ${RoutineUtils.escapeHtml(confirmText)}
                            </button>
                        </div>
                    </div>
                </div>
            `);

            function cleanup(result) {
                $(document).off('keydown.confirmModal');
                $modal.removeClass('animate__fadeIn').addClass('animate__fadeOut');
                setTimeout(() => {
                    $modal.remove();
                    resolve(result);
                }, 150);
            }

            $modal.find('.confirm-cancel').on('click', () => cleanup(false));
            $modal.find('.confirm-accept').on('click', () => cleanup(true));
            $modal.on('click', (event) => {
                if (event.target === $modal[0]) {
                    cleanup(false);
                }
            });

            $(document).on('keydown.confirmModal', (event) => {
                if (event.key === 'Escape') {
                    cleanup(false);
                } else if (event.key === 'Enter') {
                    cleanup(true);
                }
            });

            $('body').append($modal);
            $modal.find('.confirm-accept').focus();
        });
    }
    
    /**
     * Open a modal by ID
     * @param {string} modalId - Modal element ID
     */
    function openModal(modalId) {
        $(`#${modalId}`).removeClass('hidden');
    }
    
    /**
     * Close a modal by ID
     * @param {string} modalId - Modal element ID
     */
    function closeModal(modalId) {
        $(`#${modalId}`).addClass('hidden');
    }
    
    /**
     * Toggle element visibility with animation
     * @param {jQuery|string} element - Element or selector
     * @param {boolean} show - True to show, false to hide
     */
    function toggleElement(element, show) {
        const $el = $(element);
        if (show) {
            $el.removeClass('hidden').fadeIn(300);
        } else {
            $el.fadeOut(300, function() {
                $(this).addClass('hidden');
            });
        }
    }
    
    /**
     * Check if user has seen a feature (using localStorage)
     * @param {string} featureKey - Unique feature identifier
     * @returns {boolean} True if user has seen feature
     */
    function hasSeenFeature(featureKey) {
        return localStorage.getItem(featureKey) === 'true';
    }
    
    /**
     * Mark feature as seen (using localStorage)
     * @param {string} featureKey - Unique feature identifier
     */
    function markFeatureAsSeen(featureKey) {
        localStorage.setItem(featureKey, 'true');
    }
    
    /**
     * Check if user is first-time user for a specific feature
     * @param {string} featureKey - Feature identifier
     * @param {Function} callback - Function to call if first-time
     */
    function checkFirstTimeUser(featureKey, callback) {
        if (!hasSeenFeature(featureKey)) {
            setTimeout(() => {
                callback();
                markFeatureAsSeen(featureKey);
            }, 1000);
        }
    }
    
    // Public API
    return {
        confirmAction,
        openModal,
        closeModal,
        showLoading,
        hideLoading,
        showSuccess,
        showError,
        showInfo,
        showEmptyState,
        toggleElement,
        hasSeenFeature,
        markFeatureAsSeen,
        checkFirstTimeUser
    };
})();

// Make available globally
window.UIHelpers = UIHelpers;

