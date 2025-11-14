/**
 * Friends Template Helpers Module
 * Functions for rendering friend cards, user search results, requests, and activity feed
 * Depends on: RoutineUtils (for escapeHtml)
 */

const FriendsTemplateHelpers = (() => {
    
    // ===================================
    // FRIEND CARD FUNCTIONS
    // ===================================
    
    /**
     * Clone the friend card template
     * @returns {jQuery} Cloned template element
     */
    function cloneFriendCard() {
        const template = document.getElementById('friend-card-template');
        if (!template) {
            console.error('Friend card template not found!');
            return $('<div></div>');
        }
        const clone = template.content.cloneNode(true);
        return $(clone.firstElementChild);
    }
    
    /**
     * Populate a friend card with data
     * @param {jQuery} $card - The cloned card element
     * @param {Object} friend - Friend data object
     */
    function populateFriendCard($card, friend) {
        // Set data attributes
        $card.find('.view-friend-profile').attr('data-user-id', friend.user_id);
        $card.find('.remove-friend')
            .attr('data-friendship-id', friend.friendship_id)
            .attr('data-username', RoutineUtils.escapeHtml(friend.username));
        
        // Set avatar initials
        const initials = getInitials(friend.first_name, friend.last_name);
        $card.find('.friend-avatar').text(initials);
        
        // Set user info
        $card.find('.friend-name').text(`${friend.first_name} ${friend.last_name}`);
        $card.find('.friend-username').text(`@${friend.username}`);
        $card.find('.friend-since').text(`Friends since ${formatDate(friend.created_at)}`);
        
        // Set bio if exists
        if (friend.bio) {
            $card.find('.friend-bio-container').removeClass('hidden');
            $card.find('.friend-bio').text(`"${friend.bio}"`);
        }
    }
    
    // ===================================
    // USER SEARCH CARD FUNCTIONS
    // ===================================
    
    /**
     * Clone the user search card template
     * @returns {jQuery} Cloned template element
     */
    function cloneUserSearchCard() {
        const template = document.getElementById('user-search-card-template');
        if (!template) {
            console.error('User search card template not found!');
            return $('<div></div>');
        }
        const clone = template.content.cloneNode(true);
        return $(clone.firstElementChild);
    }
    
    /**
     * Populate a user search card with data
     * @param {jQuery} $card - The cloned card element
     * @param {Object} user - User data object
     */
    function populateUserSearchCard($card, user) {
        // Set avatar initials
        const initials = getInitials(user.first_name, user.last_name);
        $card.find('.user-avatar').text(initials);
        
        // Set user info
        $card.find('.user-name').text(`${user.first_name} ${user.last_name}`);
        $card.find('.user-username').text(`@${user.username}`);
        
        // Set action button based on friendship status
        const $actionContainer = $card.find('.action-button-container');
        if (user.friendship_status === 'friends') {
            $actionContainer.html(`
                <span class="px-3 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold rounded-lg text-sm">
                    <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Friends
                </span>
            `);
        } else if (user.friendship_status === 'pending') {
            $actionContainer.html(`
                <span class="px-3 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold rounded-lg text-sm">
                    <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Pending
                </span>
            `);
        } else {
            $actionContainer.html(`
                <button class="send-friend-request px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all text-sm" data-user-id="${user.user_id}" data-username="${RoutineUtils.escapeHtml(user.username)}">
                    <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                    </svg>
                    Add Friend
                </button>
            `);
        }
    }
    
    // ===================================
    // FRIEND REQUEST CARD FUNCTIONS
    // ===================================
    
    /**
     * Clone the friend request card template
     * @returns {jQuery} Cloned template element
     */
    function cloneFriendRequestCard() {
        const template = document.getElementById('friend-request-card-template');
        if (!template) {
            console.error('Friend request card template not found!');
            return $('<div></div>');
        }
        const clone = template.content.cloneNode(true);
        return $(clone.firstElementChild);
    }
    
    /**
     * Populate a friend request card with data
     * @param {jQuery} $card - The cloned card element
     * @param {Object} request - Request data object
     * @param {string} type - 'incoming' or 'outgoing'
     */
    function populateFriendRequestCard($card, request, type = 'incoming') {
        // Set avatar initials
        const initials = getInitials(request.first_name, request.last_name);
        $card.find('.request-avatar').text(initials);
        
        // Set user info
        $card.find('.request-name').text(`${request.first_name} ${request.last_name}`);
        $card.find('.request-username').text(`@${request.username}`);
        $card.find('.request-date').text(getTimeAgo(new Date(request.created_at)));
        
        // Set action buttons based on type
        const $actionsContainer = $card.find('.request-actions');
        if (type === 'incoming') {
            $actionsContainer.html(`
                <button class="accept-request px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-lg transition-all text-sm" data-request-id="${request.request_id}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                </button>
                <button class="decline-request px-3 py-2 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold rounded-lg transition-all text-sm" data-request-id="${request.request_id}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            `);
        } else {
            $actionsContainer.html(`
                <button class="cancel-request px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-all text-sm" data-request-id="${request.request_id}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Cancel
                </button>
            `);
        }
    }
    
    // ===================================
    // ACTIVITY CARD FUNCTIONS
    // ===================================
    
    /**
     * Clone the activity card template
     * @returns {jQuery} Cloned template element
     */
    function cloneActivityCard() {
        const template = document.getElementById('activity-card-template');
        if (!template) {
            console.error('Activity card template not found!');
            return $('<div></div>');
        }
        const clone = template.content.cloneNode(true);
        return $(clone.firstElementChild);
    }
    
    /**
     * Populate an activity card with data
     * @param {jQuery} $card - The cloned card element
     * @param {Object} activity - Activity data object
     */
    function populateActivityCard($card, activity) {
        // Set avatar initials
        const initials = getInitials(activity.first_name, activity.last_name);
        $card.find('.activity-avatar').text(initials);
        
        // Set user name
        $card.find('.activity-user-name').text(`${activity.first_name} ${activity.last_name}`);
        
        // Set date
        const date = new Date(activity.workout_date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeAgo = getTimeAgo(date);
        $card.find('.activity-date').text(`${timeAgo} • ${dateStr}`);
        
        // Set stats
        $card.find('.activity-exercises-count').text(activity.exercises_count);
        $card.find('.activity-total-sets').text(activity.total_sets);
        $card.find('.activity-body-parts-count').text(activity.body_parts_count);
        $card.find('.activity-total-volume').text(Math.round(activity.total_volume).toLocaleString());
    }
    
    // ===================================
    // HELPER FUNCTIONS
    // ===================================
    
    /**
     * Get initials from first and last name
     * @param {string} firstName 
     * @param {string} lastName 
     * @returns {string} Initials (e.g., "JD")
     */
    function getInitials(firstName, lastName) {
        const first = firstName ? firstName.charAt(0).toUpperCase() : '';
        const last = lastName ? lastName.charAt(0).toUpperCase() : '';
        return first + last || '?';
    }
    
    /**
     * Format date string for display
     * @param {string} dateString 
     * @returns {string} Formatted date
     */
    function formatDate(dateString) {
        if (!dateString) return 'Recently';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 7) {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} month${months !== 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
    }
    
    /**
     * Get relative time string (e.g., "2 hours ago", "3 days ago")
     * @param {Date} date 
     * @returns {string} Relative time string
     */
    function getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    // Public API
    return {
        cloneFriendCard,
        populateFriendCard,
        cloneUserSearchCard,
        populateUserSearchCard,
        cloneFriendRequestCard,
        populateFriendRequestCard,
        cloneActivityCard,
        populateActivityCard,
        getInitials,
        formatDate,
        getTimeAgo
    };
})();

// Make available globally
window.FriendsTemplateHelpers = FriendsTemplateHelpers;





