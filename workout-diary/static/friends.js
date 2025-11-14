/**
 * Friends Page JavaScript
 * Handles friend management, search, requests, and social interactions
 */

$(document).ready(function() {
    let searchTimeout = null;
    let currentTab = 'friendsList';
    
    function getCsrfToken() {
        if (window.CSRF && typeof window.CSRF.getToken === 'function') {
            const token = window.CSRF.getToken();
            if (token) {
                window.__CSRF_TOKEN_CACHE = token;
                return token;
            }
        }
        
        if (window.__CSRF_TOKEN_CACHE) {
            return window.__CSRF_TOKEN_CACHE;
        }
        
        try {
            $.ajax({
                url: '/api/csrf-token',
                method: 'GET',
                async: false,
                success: function(response) {
                    if (response && response.csrfToken) {
                        window.__CSRF_TOKEN_CACHE = response.csrfToken;
                    }
                },
                error: function() {
                    console.warn('[friends.js] Failed to fetch CSRF token via fallback request');
                }
            });
        } catch (error) {
            console.warn('[friends.js] CSRF fallback error:', error);
        }
        
        return window.__CSRF_TOKEN_CACHE || null;
    }
    
    console.log('[friends.js] CSRF-enhanced version active');
    
    // ===================================
    // PRIVACY SETTINGS ENFORCEMENT
    // ===================================
    const userPrivacySettings = window.USER_PRIVACY_SETTINGS || {
        showRoutinesToPublic: false,
        profileVisibility: 'private',
        showStatsToFriends: false,
        showWorkoutsToFriends: false
    };
    
    console.log('User Privacy Settings:', userPrivacySettings);
    
    // Initialize page
    init();
    
    function init() {
        try {
            // Check if privacy banner was previously dismissed
            const bannerDismissed = localStorage.getItem('friends_privacy_banner_dismissed');
            if (bannerDismissed === 'true' && $('#privacyInfoBanner').length) {
                $('#privacyInfoBanner').hide();
            }
            
            setupEventListeners();
            switchTab('friendsList'); // Load friends list by default
            checkIncomingRequests(); // Check for pending requests
        } catch (error) {
            console.error('Error initializing friends page:', error);
            UIHelpers.showError('Failed to initialize friends page. Please refresh.');
        }
    }
    
    // ===================================
    // EVENT LISTENERS
    // ===================================
    
    function setupEventListeners() {
        // Dismiss privacy banner
        $('#dismissPrivacyBanner').on('click', function() {
            $('#privacyInfoBanner').slideUp(300, function() {
                $(this).remove();
            });
            // Remember dismissal in localStorage
            localStorage.setItem('friends_privacy_banner_dismissed', 'true');
        });
        
        // Tab switching
        $('.friend-tab').on('click', function() {
            const tabId = $(this).attr('id');
            
            // Map tab IDs to section names
            let sectionName;
            switch(tabId) {
                case 'friendsListTab':
                    sectionName = 'friendsList';
                    break;
                case 'findFriendsTab':
                    sectionName = 'findFriends';
                    break;
                case 'requestsTab':
                    sectionName = 'requests';
                    break;
                default:
                    console.error('Unknown tab ID:', tabId);
                    return;
            }
            
            switchTab(sectionName);
        });
        
        // Search input with debounce
        $('#userSearchInput').on('input', function() {
            const query = $(this).val().trim();
            
            clearTimeout(searchTimeout);
            
            if (query.length < 2) {
                $('#searchResultsContainer').html(`
                    <div class="col-span-full text-center py-8 sm:py-12">
                        <svg class="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <p class="text-slate-500 dark:text-slate-400 text-sm sm:text-base">Enter at least 2 characters to search</p>
                    </div>
                `);
                return;
            }
            
            searchTimeout = setTimeout(() => {
                searchUsers(query);
            }, 300);
        });
        
        // Close modal
        $(document).on('click', '#friendProfileModal', function(e) {
            if (e.target === this) {
                closeFriendProfile();
            }
        });
        
        // Remove Friend Modal handlers
        $('#confirmRemoveFriend').on('click', function() {
            confirmRemoveFriend();
        });
        
        $('#cancelRemoveFriend').on('click', function() {
            closeRemoveFriendModal();
        });
        
        // Close remove friend modal on backdrop click
        $(document).on('click', '#removeFriendModal', function(e) {
            if (e.target === this) {
                closeRemoveFriendModal();
            }
        });
        
        // Close remove friend modal on ESC key
        $(document).on('keydown', function(e) {
            if (e.key === 'Escape' && !$('#removeFriendModal').hasClass('hidden')) {
                closeRemoveFriendModal();
            }
        });
    }
    
    // ===================================
    // TAB SWITCHING
    // ===================================
    
    function switchTab(tabName) {
        currentTab = tabName;
        
        try {
            // Update tab styles
            $('.friend-tab').removeClass('bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md');
            $('.friend-tab').addClass('text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700');
            
            const targetTab = $(`#${tabName}Tab`);
            if (targetTab.length === 0) {
                console.error('Tab not found:', tabName);
                UIHelpers.showError('Tab not found. Please refresh the page.');
                return;
            }
            
            targetTab.removeClass('text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700');
            targetTab.addClass('bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md');
            
            // Hide all sections
            $('.tab-content').addClass('hidden');
            
            // Show selected section and load data
            switch(tabName) {
                case 'friendsList':
                    $('#friendsListSection').removeClass('hidden');
                    loadFriendsList();
                    break;
                case 'findFriends':
                    $('#findFriendsSection').removeClass('hidden');
                    // Clear search results when switching to find friends
                    $('#searchResultsContainer').html(`
                        <div class="col-span-full text-center py-8 sm:py-12">
                            <svg class="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                            <p class="text-slate-500 dark:text-slate-400 text-sm sm:text-base">Start typing to discover new fitness friends</p>
                        </div>
                    `);
                    break;
                case 'requests':
                    $('#requestsSection').removeClass('hidden');
                    loadFriendRequests();
                    break;
                default:
                    console.error('Unknown tab:', tabName);
                    UIHelpers.showError('Unknown tab. Please refresh the page.');
            }
        } catch (error) {
            console.error('Error switching tab:', error);
            UIHelpers.showError('Failed to switch tab. Please refresh the page.');
        }
    }
    
    // ===================================
    // FRIENDS LIST
    // ===================================
    
    async function loadFriendsList() {
        // Show loading state
        $('#friendsListContainer').html(`
            <div class="col-span-full text-center py-8 sm:py-12">
                <div class="animate-spin inline-block w-6 h-6 sm:w-8 sm:h-8 border-2 border-current border-t-transparent rounded-full text-blue-500" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
                <p class="mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400">Loading your fitness circle...</p>
            </div>
        `);
        
        try {
            const response = await $.ajax({
                url: '/friends/api/list',
                method: 'GET',
                timeout: 10000
            });
            
            const friends = response.friends || [];
            $('#friendsCount').text(friends.length).removeClass('hidden');
            
            if (friends.length === 0) {
                $('#friendsListContainer').html(`
                    <div class="col-span-full text-center py-8 sm:py-12">
                        <div class="max-w-md mx-auto">
                            <!-- Icon -->
                            <div class="relative mb-6">
                                <svg class="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                </svg>
                            </div>
                            
                            <!-- Main Message -->
                            <h3 class="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Your Fitness Community Awaits!</h3>
                            <p class="text-slate-600 dark:text-slate-400 mb-4 text-sm sm:text-base">Connect with others to share routines, compare progress, and stay motivated together!</p>
                            
                            <!-- Benefits List -->
                            <div class="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800/50 dark:to-blue-900/20 rounded-xl p-4 sm:p-6 mb-6 text-left">
                                <h4 class="font-bold text-slate-800 dark:text-slate-200 mb-3 text-center text-sm sm:text-base">Why connect with friends?</h4>
                                <ul class="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                    <li class="flex items-center gap-2">
                                        <svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                        </svg>
                                        Share and discover new workout routines
                                    </li>
                                    <li class="flex items-center gap-2">
                                        <svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                        </svg>
                                        Compare progress and celebrate achievements
                                    </li>
                                    <li class="flex items-center gap-2">
                                        <svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                        </svg>
                                        Stay motivated with friendly competition
                                    </li>
                                </ul>
                            </div>
                            
                            <!-- Action Buttons -->
                            <div class="flex flex-col sm:flex-row gap-3 justify-center">
                                <button id="goToFindFriends" class="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg text-sm sm:text-base">
                                    <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                    </svg>
                                    Find Friends
                                </button>
                                <button id="refreshFriendsList" class="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all text-sm sm:text-base">
                                    <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                    </svg>
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </div>
                `);
                
                // Attach event listeners
                $('#goToFindFriends').on('click', function() {
                    switchTab('findFriends');
                });
                
                $('#refreshFriendsList').on('click', function() {
                    loadFriendsList();
                });
                
                return;
            }
            
            renderFriendsCards(friends);
            
        } catch (error) {
            console.error('Error loading friends list:', error);
            $('#friendsListContainer').html(`
                <div class="col-span-full text-center py-8 sm:py-12">
                    <svg class="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-rose-300 dark:text-rose-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <h3 class="text-lg sm:text-xl font-bold text-rose-700 dark:text-rose-300 mb-2">Failed to Load Friends</h3>
                    <p class="text-slate-500 dark:text-slate-400 mb-4 text-sm sm:text-base">There was an error loading your friends list. Please try again.</p>
                    <button id="retryLoadFriends" class="px-4 py-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold rounded-lg transition-all text-sm sm:text-base">
                        Retry
                    </button>
                </div>
            `);
            
            $('#retryLoadFriends').on('click', () => loadFriendsList());
        }
    }
    
    function renderFriendsCards(friends) {
        const container = $('#friendsListContainer');
        container.empty();
        
        if (friends.length === 0) {
            return;
        }
        
        // Show friends count
        $('#friendsCount').text(friends.length).removeClass('hidden');
        
        friends.forEach((friend, index) => {
            // Clone template and populate with data
            const $card = FriendsTemplateHelpers.cloneFriendCard();
            FriendsTemplateHelpers.populateFriendCard($card, friend);
            
            // Add card to container
            container.append($card);
        });
        
        // Attach event listeners after a short delay to ensure DOM is ready
        setTimeout(() => {
            $('.view-friend-profile').off('click').on('click', function() {
                const userId = $(this).data('user-id');
                viewFriendProfile(userId);
            });
            
            $('.remove-friend').off('click').on('click', function() {
                const friendshipId = $(this).data('friendship-id');
                const username = $(this).data('username');
                
                // Show remove friend modal
                showRemoveFriendModal(friendshipId, username);
            });
        }, 100);
    }
    
    // ===================================
    // USER SEARCH
    // ===================================
    
    async function searchUsers(query) {
        console.log('🔍 SEARCH USERS called with query:', query);
        
        try {
            console.log('📝 Setting loading state for search...');
            $('#searchResultsContainer').html(`
                <div class="col-span-full text-center py-8">
                    <div class="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent rounded-full text-indigo-600"></div>
                    <p class="mt-4 text-gray-500 dark:text-gray-400">Searching...</p>
                </div>
            `);
            
            console.log('🌐 Making API request to /friends/api/search with query:', query);
            const response = await $.get('/friends/api/search', { q: query });
            console.log('📡 Search API response received:', response);
            
            const users = response.users || [];
            console.log('👥 Users found:', users.length, users);
            
            if (users.length === 0) {
                console.log('❌ No users found, showing empty state');
                $('#searchResultsContainer').html(`
                    <div class="col-span-full text-center py-16">
                        <svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <p class="text-gray-500 dark:text-gray-400 text-lg">No users found matching "${RoutineUtils.escapeHtml(query)}"</p>
                    </div>
                `);
                return;
            }
            
            console.log('🎨 Rendering search results...');
            renderSearchResults(users);
            console.log('✅ Search results rendered successfully');
            
        } catch (error) {
            console.error('❌ Error searching users:', error);
            console.error('Error details:', error.responseText, error.status);
            $('#searchResultsContainer').html(`
                <div class="col-span-full text-center py-12">
                    <p class="text-red-600 dark:text-red-400">Error searching users. Please try again.</p>
                </div>
            `);
        }
    }
    
    function renderSearchResults(users) {
        const container = $('#searchResultsContainer');
        container.empty();
        
        users.forEach((user) => {
            // Determine friendship status for template
            let friendshipStatus = 'none';
            if (user.is_friend) {
                friendshipStatus = 'friends';
            } else if (user.has_pending_request) {
                friendshipStatus = 'pending';
            }
            
            // Prepare user object with friendship status
            const userData = {
                ...user,
                friendship_status: friendshipStatus
            };
            
            // Clone template and populate with data
            const $card = FriendsTemplateHelpers.cloneUserSearchCard();
            FriendsTemplateHelpers.populateUserSearchCard($card, userData);
            
            // Add card to container
            container.append($card);
        });
        
        // Attach event listeners
        $('.send-friend-request').on('click', function() {
            const userId = $(this).data('user-id');
            const username = $(this).data('username');
            sendFriendRequest(userId, username);
        });
        
        $('.view-friend-profile').on('click', function() {
            const userId = $(this).data('user-id');
            viewFriendProfile(userId);
        });
    }
    
    // ===================================
    // FRIEND REQUESTS
    // ===================================
    
    async function checkIncomingRequests() {
        try {
            const response = await $.get('/friends/api/requests/incoming');
            const requests = response.requests || [];
            
            if (requests.length > 0) {
                $('#requestBadge').removeClass('hidden');
                $('#requestCount').text(requests.length);
                $('#requestPlural').text(requests.length === 1 ? '' : 's');
                $('#requestTabBadge').text(requests.length).removeClass('hidden');
            } else {
                $('#requestBadge').addClass('hidden');
                $('#requestTabBadge').addClass('hidden');
            }
            
        } catch (error) {
            console.error('Error checking friend requests:', error);
        }
    }
    
    async function loadFriendRequests() {
        console.log('Loading friend requests...');
        
        try {
            const [incomingResponse, outgoingResponse] = await Promise.all([
                $.ajax({
                    url: '/friends/api/requests/incoming',
                    method: 'GET',
                    timeout: 10000
                }),
                $.ajax({
                    url: '/friends/api/requests/outgoing',
                    method: 'GET',
                    timeout: 10000
                })
            ]);
            
            console.log('Friend requests API responses:', { incomingResponse, outgoingResponse });
            
            const incomingRequests = incomingResponse.requests || [];
            const outgoingRequests = outgoingResponse.requests || [];
            
            renderIncomingRequests(incomingRequests);
            renderOutgoingRequests(outgoingRequests);
            
        } catch (error) {
            console.error('Error loading friend requests:', error);
            $('#incomingRequestsContainer').html(`
                <div class="text-center py-8">
                    <svg class="w-12 h-12 mx-auto text-red-300 dark:text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <p class="text-red-600 dark:text-red-400 mb-4">Failed to load friend requests</p>
                    <button id="retryRequests" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all text-sm">
                        Retry
                    </button>
                </div>
            `);
            
            $('#outgoingRequestsContainer').html(`
                <div class="text-center py-8">
                    <p class="text-red-600 dark:text-red-400">Failed to load sent requests</p>
                </div>
            `);
            
            $('#retryRequests').on('click', () => loadFriendRequests());
        }
    }
    
    function renderIncomingRequests(requests) {
        const container = $('#incomingRequestsContainer');
        
        if (requests.length === 0) {
            container.html(`
                <div class="text-center py-8">
                    <svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                    </svg>
                    <p class="text-gray-500 dark:text-gray-400">No incoming friend requests</p>
                </div>
            `);
            return;
        }
        
        container.empty();
        requests.forEach(request => {
            // Prepare request data for template
            const requestData = {
                request_id: request.request_id,
                first_name: request.sender_first_name,
                last_name: request.sender_last_name,
                username: request.sender_username,
                created_at: request.created_at
            };
            
            // Clone template and populate with data
            const $card = FriendsTemplateHelpers.cloneFriendRequestCard();
            FriendsTemplateHelpers.populateFriendRequestCard($card, requestData, 'incoming');
            
            // Add card to container
            container.append($card);
        });
        
        // Attach event listeners
        $('.accept-request').on('click', function() {
            const requestId = $(this).data('request-id');
            acceptFriendRequest(requestId);
        });
        
        $('.decline-request').on('click', function() {
            const requestId = $(this).data('request-id');
            declineFriendRequest(requestId);
        });
    }
    
    function renderOutgoingRequests(requests) {
        const container = $('#outgoingRequestsContainer');
        
        if (requests.length === 0) {
            container.html(`
                <div class="text-center py-8">
                    <svg class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                    </svg>
                    <p class="text-gray-500 dark:text-gray-400">No outgoing friend requests</p>
                </div>
            `);
            return;
        }
        
        container.empty();
        requests.forEach(request => {
            // Prepare request data for template
            const requestData = {
                request_id: request.request_id,
                first_name: request.receiver_first_name,
                last_name: request.receiver_last_name,
                username: request.receiver_username,
                created_at: request.created_at
            };
            
            // Clone template and populate with data
            const $card = FriendsTemplateHelpers.cloneFriendRequestCard();
            FriendsTemplateHelpers.populateFriendRequestCard($card, requestData, 'outgoing');
            
            // Add card to container
            container.append($card);
        });
        
        // Attach event listeners
        $('.cancel-request').on('click', function() {
            const requestId = $(this).data('request-id');
            cancelFriendRequest(requestId);
        });
    }
    
    // ===================================
    // FRIEND REQUEST ACTIONS
    // ===================================
    
    async function sendFriendRequest(userId, username) {
        console.log('📤 SEND FRIEND REQUEST called for user:', username, 'ID:', userId);
        
        try {
            console.log('🌐 Making API request to send friend request...');
            const csrfToken = getCsrfToken();
            await $.ajax({
                url: '/friends/api/requests/send',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    receiver_id: userId,
                    csrf_token: csrfToken
                }),
                beforeSend: function(xhr) {
                    if (csrfToken) {
                        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                    }
                }
            });
            
            console.log('✅ Friend request sent successfully');
            UIHelpers.showSuccess(`Friend request sent to @${username}!`);
            
            // Refresh search results
            const query = $('#userSearchInput').val().trim();
            console.log('🔄 Refreshing search results with query:', query);
            if (query.length >= 2) {
                searchUsers(query);
            }
            
        } catch (error) {
            console.error('❌ Error sending friend request:', error);
            console.error('Error details:', error.responseText, error.status);
            const errorMsg = error.responseJSON?.error || 'Failed to send friend request';
            UIHelpers.showError(errorMsg);
        }
    }
    
    async function acceptFriendRequest(requestId) {
        try {
            const csrfToken = getCsrfToken();
            await $.ajax({
                url: `/friends/api/requests/${requestId}/accept`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ csrf_token: csrfToken }),
                beforeSend: function(xhr) {
                    if (csrfToken) {
                        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                    }
                }
            });
            UIHelpers.showSuccess('Friend request accepted!');
            loadFriendRequests();
            checkIncomingRequests();
            
        } catch (error) {
            console.error('Error accepting friend request:', error);
            UIHelpers.showError('Failed to accept friend request');
        }
    }
    
    async function declineFriendRequest(requestId) {
        try {
            const csrfToken = getCsrfToken();
            await $.ajax({
                url: `/friends/api/requests/${requestId}/decline`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ csrf_token: csrfToken }),
                beforeSend: function(xhr) {
                    if (csrfToken) {
                        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                    }
                }
            });
            UIHelpers.showSuccess('Friend request declined');
            loadFriendRequests();
            checkIncomingRequests();
            
        } catch (error) {
            console.error('Error declining friend request:', error);
            UIHelpers.showError('Failed to decline friend request');
        }
    }
    
    async function cancelFriendRequest(requestId) {
        try {
            const csrfToken = getCsrfToken();
            await $.ajax({
                url: `/friends/api/requests/${requestId}/cancel`,
                method: 'DELETE',
                contentType: 'application/json',
                data: JSON.stringify({ csrf_token: csrfToken }),
                beforeSend: function(xhr) {
                    if (csrfToken) {
                        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                    }
                }
            });
            UIHelpers.showSuccess('Friend request cancelled');
            loadFriendRequests();
            
        } catch (error) {
            console.error('Error cancelling friend request:', error);
            UIHelpers.showError('Failed to cancel friend request');
        }
    }
    
    // ===================================
    // FRIEND MANAGEMENT
    // ===================================
    
    // Store current removal data
    let pendingRemoval = {
        friendshipId: null,
        username: null
    };
    
    // Show remove friend confirmation modal
    function showRemoveFriendModal(friendshipId, username) {
        pendingRemoval.friendshipId = friendshipId;
        pendingRemoval.username = username;
        
        // Update modal with username
        $('#removeFriendUsername').text(`@${RoutineUtils.escapeHtml(username)}`);
        
        // Show modal with animation
        $('#removeFriendModal').removeClass('hidden')
            .css({ opacity: 0 })
            .animate({ opacity: 1 }, 200);
        
        // Focus on cancel button for accessibility
        setTimeout(() => {
            $('#cancelRemoveFriend').focus();
        }, 100);
    }
    
    // Close remove friend modal
    function closeRemoveFriendModal() {
        $('#removeFriendModal').animate({ opacity: 0 }, 200, function() {
            $(this).addClass('hidden');
        });
        pendingRemoval.friendshipId = null;
        pendingRemoval.username = null;
    }
    
    // Confirm remove friend
    function confirmRemoveFriend() {
        if (pendingRemoval.friendshipId) {
            const friendshipId = pendingRemoval.friendshipId;
            closeRemoveFriendModal();
            removeFriend(friendshipId);
        }
    }
    
    async function removeFriend(friendshipId) {
        try {
            const csrfToken = getCsrfToken();
            await $.ajax({
                url: `/friends/api/${friendshipId}`,
                method: 'DELETE',
                contentType: 'application/json',
                data: JSON.stringify({ csrf_token: csrfToken }),
                beforeSend: function(xhr) {
                    if (csrfToken) {
                        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                    }
                }
            });
            UIHelpers.showSuccess('Friend removed');
            loadFriendsList();
            
        } catch (error) {
            console.error('Error removing friend:', error);
            UIHelpers.showError('Failed to remove friend');
        }
    }
    
    // ===================================
    // FRIEND PROFILE
    // ===================================
    
    async function viewFriendProfile(userId) {
        try {
            const response = await $.get(`/friends/api/${userId}/profile`);
            const profile = response.profile;
            
            renderFriendProfile(profile);
            
        } catch (error) {
            console.error('Error loading friend profile:', error);
            UIHelpers.showError('Failed to load profile');
        }
    }
    
    function renderFriendProfile(profile) {
        const hasStats = profile.stats !== undefined;
        
        // Calculate workout streak (7-day weeks)
        let workoutStreak = 0;
        if (hasStats && profile.stats.last_workout_date) {
            const lastWorkout = new Date(profile.stats.last_workout_date);
            const today = new Date();
            const diffTime = today - lastWorkout;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 7) {
                workoutStreak = Math.ceil(diffDays / 7); // Day 1-7 = Week 1, Day 8-14 = Week 2, etc.
            }
        }
        
        const modalContent = `
            <div class="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl max-w-md w-full mx-4 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <!-- Header with Name -->
                <div class="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 px-4 sm:px-6 py-4 sm:py-5 relative">
                    <button id="closeFriendProfile" class="absolute top-3 right-3 text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-all">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                    
                    <div class="text-center">
                        <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-2xl sm:text-3xl mx-auto mb-3">
                            ${getInitials(profile.first_name, profile.last_name)}
                        </div>
                        <h3 class="text-xl sm:text-2xl font-bold text-white mb-1">${RoutineUtils.escapeHtml(profile.first_name)} ${RoutineUtils.escapeHtml(profile.last_name)}</h3>
                        <p class="text-blue-100 text-sm sm:text-base">@${RoutineUtils.escapeHtml(profile.username)}</p>
                    </div>
                </div>
                
                <!-- Content -->
                <div class="p-4 sm:p-6">
                    <!-- Bio Section -->
                    ${profile.bio ? `
                        <div class="mb-4 sm:mb-6">
                            <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                                <p class="text-slate-700 dark:text-slate-300 text-sm sm:text-base italic text-center">"${RoutineUtils.escapeHtml(profile.bio)}"</p>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${hasStats ? `
                        <!-- Stats Section -->
                        <div class="mb-4 sm:mb-6">
                            <h5 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 text-center">Workout Stats</h5>
                            <div class="grid grid-cols-2 gap-3 sm:gap-4">
                                <div class="text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4">
                                    <p class="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">${profile.stats.total_workouts}</p>
                                    <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Workouts</p>
                                </div>
                                <div class="text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4">
                                    <p class="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">${workoutStreak}</p>
                                    <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Week ${workoutStreak > 0 ? workoutStreak : 'Off'}</p>
                                </div>
                                <div class="text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4">
                                    <p class="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">${profile.stats.total_sets}</p>
                                    <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Total Sets</p>
                                </div>
                                <div class="text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 sm:p-4">
                                    <p class="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">${profile.stats.total_routines_created}</p>
                                    <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Routines</p>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <!-- Stats Hidden - Privacy Notice -->
                        <div class="mb-4 sm:mb-6">
                            <div class="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-xl p-4 text-center">
                                <svg class="w-12 h-12 mx-auto text-amber-500 dark:text-amber-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                </svg>
                                <p class="text-sm text-amber-800 dark:text-amber-300 font-semibold mb-1">Stats Are Private</p>
                                <p class="text-xs text-amber-700 dark:text-amber-400">This user has chosen not to share workout statistics</p>
                            </div>
                        </div>
                    `}
                    
                    <!-- Action Buttons -->
                    <div class="space-y-3">
                        <button id="viewFriendRoutines" class="w-full px-4 py-3 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg text-sm sm:text-base" data-user-id="${profile.user_id}">
                            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                            View Routines
                        </button>
                        ${profile.is_friend ? `
                            <button id="viewFriendWorkouts" class="w-full px-4 py-3 sm:px-6 sm:py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg text-sm sm:text-base" data-user-id="${profile.user_id}">
                                <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                </svg>
                                Recent Workouts
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        $('#friendProfileModal').html(modalContent).removeClass('hidden');
        
        // Attach event listeners
        $('#closeFriendProfile').on('click', closeFriendProfile);
        $('#viewFriendRoutines').on('click', function() {
            const userId = $(this).data('user-id');
            viewFriendRoutines(userId);
        });
        $('#viewFriendWorkouts').on('click', function() {
            const userId = $(this).data('user-id');
            viewFriendWorkouts(userId);
        });
    }
    
    function closeFriendProfile() {
        $('#friendProfileModal').addClass('hidden');
    }
    
    async function viewFriendRoutines(userId) {
        try {
            // Show loading state
            showFriendRoutinesModal(userId, 'loading');
            
            // Fetch friend's public routines
            const response = await $.ajax({
                url: `/friends/api/${userId}/routines`,
                method: 'GET',
                timeout: 10000
            });
            
            const routines = response.routines || [];
            console.log('📊 Friend Routines Response:', routines);
            console.log('📝 First Routine:', routines[0]);
            if (routines[0]) {
                console.log('💪 First Routine Exercises:', routines[0].exercises);
            }
            showFriendRoutinesModal(userId, 'loaded', routines);
            
        } catch (error) {
            console.error('Error loading friend routines:', error);
            
            // Check if it's a privacy restriction error
            if (error.status === 403 && error.responseJSON?.error) {
                showFriendRoutinesModal(userId, 'privacy-restricted', error.responseJSON.error);
            } else {
                showFriendRoutinesModal(userId, 'error');
            }
        }
    }
    
    function showFriendRoutinesModal(userId, state, routinesOrMessage = []) {
        let modalContent = '';
        
        if (state === 'loading') {
            modalContent = `
                <div class="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl max-w-2xl w-full mx-4 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 px-4 sm:px-6 py-4 sm:py-5 relative">
                        <button id="closeRoutinesModal" class="absolute top-3 right-3 text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-all">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                        <div class="text-center">
                            <h3 class="text-xl sm:text-2xl font-bold text-white">Public Routines</h3>
                            <p class="text-blue-100 text-sm sm:text-base">Loading routines...</p>
                        </div>
                    </div>
                    <div class="p-4 sm:p-6 text-center py-12">
                        <div class="animate-spin inline-block w-8 h-8 border-2 border-current border-t-transparent rounded-full text-blue-500"></div>
                        <p class="mt-3 text-slate-500 dark:text-slate-400">Loading routines...</p>
                    </div>
                </div>
            `;
        } else if (state === 'privacy-restricted') {
            const errorMessage = typeof routinesOrMessage === 'string' ? routinesOrMessage : 'This user has disabled routine sharing';
            modalContent = `
                <div class="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl max-w-md w-full mx-4 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div class="bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700 px-4 sm:px-6 py-4 sm:py-5 relative">
                        <button id="closeRoutinesModal" class="absolute top-3 right-3 text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-all">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                        <div class="text-center">
                            <h3 class="text-xl sm:text-2xl font-bold text-white">Privacy Settings</h3>
                            <p class="text-amber-100 text-sm sm:text-base">Routines Not Shared</p>
                        </div>
                    </div>
                    <div class="p-4 sm:p-6 text-center py-8">
                        <svg class="w-16 h-16 mx-auto text-amber-400 dark:text-amber-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                        <h3 class="text-lg font-bold text-amber-800 dark:text-amber-300 mb-2">Routines Are Private</h3>
                        <p class="text-slate-600 dark:text-slate-400 mb-4 text-sm">${RoutineUtils.escapeHtml(errorMessage)}</p>
                        <div class="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-lg p-4 text-left">
                            <p class="text-xs text-amber-800 dark:text-amber-300">
                                <strong>🔒 Privacy Info:</strong> This user has chosen to keep their routines private. They can enable routine sharing in their Account Settings.
                            </p>
                        </div>
                    </div>
                </div>
            `;
        } else if (state === 'error') {
            modalContent = `
                <div class="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl max-w-2xl w-full mx-4 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div class="bg-gradient-to-r from-rose-500 to-red-600 dark:from-rose-600 dark:to-red-700 px-4 sm:px-6 py-4 sm:py-5 relative">
                        <button id="closeRoutinesModal" class="absolute top-3 right-3 text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-all">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                        <div class="text-center">
                            <h3 class="text-xl sm:text-2xl font-bold text-white">Error Loading Routines</h3>
                            <p class="text-rose-100 text-sm sm:text-base">Failed to load routines</p>
                        </div>
                    </div>
                    <div class="p-4 sm:p-6 text-center py-12">
                        <svg class="w-16 h-16 mx-auto text-rose-300 dark:text-rose-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        <h3 class="text-lg font-bold text-rose-700 dark:text-rose-300 mb-2">Failed to Load Routines</h3>
                        <p class="text-slate-500 dark:text-slate-400 mb-4">There was an error loading the routines. Please try again.</p>
                        <button id="retryRoutines" class="px-4 py-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold rounded-lg transition-all">
                            Retry
                        </button>
                    </div>
                </div>
            `;
        } else if (state === 'loaded') {
            const routines = Array.isArray(routinesOrMessage) ? routinesOrMessage : [];
            console.log('🎨 Rendering routines modal with:', routines.length, 'routines');
            routines.forEach((r, idx) => {
                console.log(`  Routine ${idx}: ${r.routine_name}, Exercises: ${r.exercises?.length || 0}`);
            });
            modalContent = `
                <div class="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl max-w-2xl w-full mx-4 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 px-4 sm:px-6 py-4 sm:py-5 relative">
                        <button id="closeRoutinesModal" class="absolute top-3 right-3 text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-all">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                        <div class="text-center">
                            <h3 class="text-xl sm:text-2xl font-bold text-white">Public Routines</h3>
                            <p class="text-blue-100 text-sm sm:text-base">${routines.length} routine${routines.length !== 1 ? 's' : ''} available</p>
                        </div>
                    </div>
                    <div class="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
                        ${routines.length === 0 ? `
                            <div class="text-center py-8 sm:py-12">
                                <svg class="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                </svg>
                                <h3 class="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">No Public Routines</h3>
                                <p class="text-slate-500 dark:text-slate-400">This user hasn't shared any public routines yet.</p>
                            </div>
                        ` : `
                            <div class="space-y-4">
                                ${routines.map(routine => `
                                    <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700">
                                        <div class="flex items-start justify-between mb-3">
                                            <div class="flex-1 min-w-0">
                                                <h4 class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1 truncate">${RoutineUtils.escapeHtml(routine.routine_name)}</h4>
                                                <p class="text-sm text-slate-600 dark:text-slate-400 mb-2">${routine.exercises?.length || 0} exercises</p>
                                                ${routine.description ? `<p class="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">${RoutineUtils.escapeHtml(routine.description)}</p>` : ''}
                                            </div>
                                            <div class="ml-4 flex-shrink-0">
                                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                                    Public
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <!-- Exercises Dropdown -->
                                        ${routine.exercises && routine.exercises.length > 0 ? `
                                            <div class="mb-4">
                                                <button class="routine-exercises-toggle w-full flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" data-routine-id="${routine.routine_id}">
                                                    <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">View Exercises (${routine.exercises.length})</span>
                                                    <svg class="routine-exercises-arrow w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                                    </svg>
                                                </button>
                                                <div class="routine-exercises-content hidden mt-3 space-y-2 max-h-48 overflow-y-auto">
                                                    ${routine.exercises.map((exercise, index) => `
                                                        <div class="bg-white dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                                                            <div class="flex items-start justify-between">
                                                                <div class="flex-1">
                                                                    <div class="flex items-center gap-2 mb-1">
                                                                        <span class="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">${index + 1}</span>
                                                                        <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">${RoutineUtils.escapeHtml(exercise.exercise_name)}</span>
                                                                        <span class="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">${exercise.exercise_type}</span>
                                                                    </div>
                                                                    ${exercise.exercise_type === 'strength' ? `
                                                                        <div class="text-xs text-slate-600 dark:text-slate-400">
                                                                            ${exercise.sets ? `${exercise.sets} sets` : ''} 
                                                                            ${exercise.reps ? `× ${exercise.reps} reps` : ''} 
                                                                            ${exercise.weight ? `@ ${exercise.weight}${exercise.unit || 'lbs'}` : ''}
                                                                        </div>
                                                                    ` : `
                                                                        <div class="text-xs text-slate-600 dark:text-slate-400">
                                                                            ${exercise.duration_minutes ? `${exercise.duration_minutes} min` : ''} 
                                                                            ${exercise.intensity ? `• ${exercise.intensity} intensity` : ''}
                                                                        </div>
                                                                    `}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            </div>
                                        ` : ''}
                                        
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                                <span class="flex items-center gap-1">
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                    </svg>
                                                    ${formatDate(routine.created_at)}
                                                </span>
                                            </div>
                                            ${routine.already_imported_by_user ? `
                                                <button class="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-semibold rounded-lg cursor-not-allowed text-sm" disabled>
                                                    <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                                    </svg>
                                                    Already Imported
                                                </button>
                                            ` : `
                                                <button class="copy-routine-btn px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg text-sm" data-routine-id="${routine.routine_id}" data-routine-name="${RoutineUtils.escapeHtml(routine.routine_name)}">
                                                    <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                                    </svg>
                                                    Copy to My Routines
                                                </button>
                                            `}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>
            `;
        }
        
        // Create or update the routines modal
        if ($('#routinesModal').length === 0) {
            $('body').append(`
                <div id="routinesModal" class="hidden fixed inset-0 bg-slate-900/60 dark:bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    ${modalContent}
                </div>
            `);
        } else {
            $('#routinesModal').html(modalContent);
        }
        
        $('#routinesModal').removeClass('hidden');
        
        // Attach event listeners
        $('#closeRoutinesModal').on('click', closeRoutinesModal);
        $('#retryRoutines').on('click', () => viewFriendRoutines(userId));
        
        // Copy routine buttons
        $('.copy-routine-btn').on('click', function() {
            const routineId = $(this).data('routine-id');
            const routineName = $(this).data('routine-name');
            copyFriendRoutine(routineId, routineName);
        });
        
        // Exercises dropdown toggle
        $('.routine-exercises-toggle').on('click', function() {
            const content = $(this).siblings('.routine-exercises-content');
            const arrow = $(this).find('.routine-exercises-arrow');
            
            if (content.hasClass('hidden')) {
                content.removeClass('hidden').slideDown(300);
                arrow.css('transform', 'rotate(180deg)');
            } else {
                content.slideUp(300, function() {
                    $(this).addClass('hidden');
                });
                arrow.css('transform', 'rotate(0deg)');
            }
        });
    }
    
    function closeRoutinesModal() {
        $('#routinesModal').addClass('hidden');
    }
    
    async function copyFriendRoutine(routineId, routineName) {
        // Find the button that was clicked
        const $button = $(`.copy-routine-btn[data-routine-id="${routineId}"]`);
        const originalButtonHtml = $button.html();
        
        // Show "Copying..." state
        $button.prop('disabled', true).html(`
            <svg class="w-4 h-4 animate-spin inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Copying...
        `);
        
        try {
            const csrfToken = getCsrfToken();
            const response = await $.ajax({
                url: `/friends/api/routines/${routineId}/copy`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ csrf_token: csrfToken }),
                beforeSend: function(xhr) {
                    if (csrfToken) {
                        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                    }
                }
            });
            
            // Check if it was restored or newly copied
            if (response.restored) {
                UIHelpers.showSuccess(`🔄 "${routineName}" restored to your imported routines!`);
            } else {
                UIHelpers.showSuccess(`✅ "${routineName}" copied to your imported routines!`);
            }
            
            // Update button to "Already Imported" state
            $button.prop('disabled', true)
                .removeClass('bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700')
                .addClass('bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 cursor-not-allowed')
                .html(`
                    <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Already Imported
                `);
            
        } catch (error) {
            console.error('Error copying routine:', error);
            const errorMsg = error.responseJSON?.error || 'Failed to copy routine';
            
            // Check if it's a privacy restriction error
            if (error.responseJSON?.privacy_restriction || error.status === 403) {
                // Privacy restriction - hide the button and show notice
                $button.prop('disabled', true)
                    .removeClass('bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700')
                    .addClass('bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-300 cursor-not-allowed')
                    .html(`
                        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                        Privacy Restricted
                    `);
                UIHelpers.showError(errorMsg || 'This routine cannot be copied due to privacy settings', 6000);
            }
            // Check if already imported
            else if (errorMsg.includes('already') || errorMsg.includes('duplicate')) {
                // Change button to "Already Imported" state
                $button.prop('disabled', true)
                    .removeClass('bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700')
                    .addClass('bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 cursor-not-allowed')
                    .html(`
                        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Already Imported
                    `);
                UIHelpers.showError('You already have this routine in your collection');
            } else {
                // Other error - restore button
                $button.prop('disabled', false).html(originalButtonHtml);
                UIHelpers.showError(errorMsg);
            }
        }
    }
    
    async function viewFriendWorkouts(userId) {
        try {
            // Show loading state  
            const loadingHtml = `
                <div class="text-center py-8">
                    <div class="animate-spin inline-block w-8 h-8 border-2 border-current border-t-transparent rounded-full text-blue-500"></div>
                    <p class="mt-3 text-slate-500 dark:text-slate-400">Loading workouts...</p>
                </div>
            `;
            
            // Fetch friend's recent workouts
            const response = await $.ajax({
                url: `/friends/api/${userId}/workouts/recent`,
                method: 'GET',
                timeout: 10000
            });
            
            const workouts = response.workouts || [];
            // TODO: Display workouts in a modal
            UIHelpers.showSuccess(`Loaded ${workouts.length} recent workouts!`);
            
        } catch (error) {
            console.error('Error loading friend workouts:', error);
            
            // Handle privacy restriction error
            if (error.status === 403) {
                UIHelpers.showError('This user has disabled workout sharing with friends');
            } else {
                UIHelpers.showError('Failed to load workouts');
            }
        }
    }
    
    // ===================================
    // ACTIVITY FEED
    // ===================================
    
    // ===================================
    // ACTIVITY FEED - DISABLED FOR NOW
    // This feature needs further development
    // Commented out: 2025-01-04
    // ===================================
    
    /*
    async function loadActivityFeed() {
        console.log('Loading activity feed...');
        
        // Show loading state
        $('#activityFeedContainer').html(`
            <div class="text-center py-12">
                <div class="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent rounded-full text-indigo-600" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
                <p class="mt-4 text-gray-500 dark:text-gray-400">Loading activity feed...</p>
            </div>
        `);
        
        try {
            const response = await $.ajax({
                url: '/friends/api/feed',
                method: 'GET',
                timeout: 10000
            });
            
            console.log('Activity feed API response:', response);
            const activities = response.activities || [];
            
            if (activities.length === 0) {
                $('#activityFeedContainer').html(`
                    <div class="text-center py-16">
                        <svg class="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        <h3 class="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">No Recent Activity</h3>
                        <p class="text-gray-500 dark:text-gray-400">Add more friends to see their workout activity!</p>
                    </div>
                `);
                return;
            }
            
            renderActivityFeed(activities);
            
        } catch (error) {
            console.error('Error loading activity feed:', error);
            $('#activityFeedContainer').html(`
                <div class="text-center py-12">
                    <svg class="w-16 h-16 mx-auto text-red-300 dark:text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <h3 class="text-xl font-bold text-red-700 dark:text-red-300 mb-2">Failed to Load Activity</h3>
                    <p class="text-gray-500 dark:text-gray-400 mb-6">There was an error loading the activity feed. Please try again.</p>
                    <button id="retryActivityFeed" class="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl transition-all">
                        Retry
                    </button>
                </div>
            `);
            
            $('#retryActivityFeed').on('click', () => loadActivityFeed());
        }
    }
    
    function renderActivityFeed(activities) {
        const container = $('#activityFeedContainer');
        container.empty();
        
        activities.forEach(activity => {
            // Clone template and populate with data
            const $card = FriendsTemplateHelpers.cloneActivityCard();
            FriendsTemplateHelpers.populateActivityCard($card, activity);
            
            // Add card to container
            container.append($card);
        });
    }
    */
    
    // ===================================
    // HELPER FUNCTIONS
    // ===================================
    
    function getInitials(firstName, lastName) {
        const first = firstName ? firstName.charAt(0).toUpperCase() : '';
        const last = lastName ? lastName.charAt(0).toUpperCase() : '';
        return first + last || '?';
    }
    
    // Helper function for formatting relative dates
    function formatDate(dateString) {
        if (!dateString) return 'Recently';
        
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        if (days < 365) return `${Math.floor(days / 30)} months ago`;
        return `${Math.floor(days / 365)} years ago`;
    }
    
    function getTimeAgo(date) {
        const now = new Date();
        const diff = Math.floor((now - date) / 1000); // seconds
        
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
        return date.toLocaleDateString();
    }
    
    // Note: escapeHtml, showSuccess, showError now provided by shared modules
    // RoutineUtils.escapeHtml() → RoutineUtils.escapeHtml()
    // showSuccess() → UIHelpers.showSuccess()
    // showError() → UIHelpers.showError()
});

