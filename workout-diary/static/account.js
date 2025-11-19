$(function () {
    const accountForm = $('#accountForm');
    const privacyForm = $('#privacyForm');
    const editButton = $('#editButton');
    const floatingEditButton = $('#floatingEditButton');
    const floatingEditContainer = $('#floatingEditContainer');
    const floatingSaveContainer = $('#floatingSaveContainer');
    const saveButtons = $('button#saveButton');
    const cancelEditButton = $('#cancelEditButton');
    const fieldDisplays = $('.field-display');
    const editFields = $('.field-input');
    const usernameInput = $('#username');
    const emailInput = $('#email');

    const heightCmInput = $('#height_cm');
    const heightFeetInput = $('#height_feet');
    const heightInchesInput = $('#height_inches');
    const weightKgInput = $('#weight_kg');
    const weightLbsInput = $('#weight_lbs');
    const targetWeightKgInput = $('#target_weight_kg');
    const preferredUnitsInput = $('#preferred_units');

    const saveButtonOriginalHtml = [];
    saveButtons.each(function (index) {
        saveButtonOriginalHtml[index] = $(this).html();
    });

    let isEditMode = false;
    let accountInitialState = captureAccountState();
    let privacyInitialState = capturePrivacyState();

    initializeHeightWeightFields();
    refreshAllDisplays();

    editButton.on('click', enterEditMode);
    if (floatingEditButton.length) {
        floatingEditButton.on('click', enterEditMode);
    }

    cancelEditButton.on('click', function () {
        restoreAccountState(accountInitialState);
        restorePrivacyState(privacyInitialState);
        refreshAllDisplays();
        exitEditMode();
    });

    accountForm.on('submit', function (e) {
        e.preventDefault();
        if (!isEditMode) return;
        saveAllChanges();
    });

    saveButtons.on('click', function () {
        // Submission handled via the form submit listener
    });

    if (privacyForm.length) {
        privacyForm.find('input[type="checkbox"]').on('change', function () {
            updatePrivacyToggleDisplay($(this));
        });

        $('#profile_visibility').on('change', function () {
            updateProfileVisibilityDisplay($(this).val());
        });

        $('#bio').on('input', function () {
            updateBioDisplay($(this).val());
        });
    }

    $(window).on('scroll', function () {
        if (isEditMode || !floatingEditContainer.length) return;
        if ($(this).scrollTop() > 250) {
            floatingEditContainer.removeClass('hidden');
        } else {
            floatingEditContainer.addClass('hidden');
        }
    });

    function enterEditMode() {
        if (isEditMode) return;
        isEditMode = true;

        // Hide all field displays except username and email
        fieldDisplays.each(function() {
            const $display = $(this);
            const $parent = $display.parent();
            // Check if this display is for username or email by checking if parent contains those inputs
            const isUsernameDisplay = $parent.find('#username').length > 0;
            const isEmailDisplay = $parent.find('#email').length > 0;
            
            // Only hide if it's NOT username or email display
            if (!isUsernameDisplay && !isEmailDisplay) {
                $display.addClass('hidden');
            }
        });
        
        editFields.removeClass('hidden');

        usernameInput.prop('readonly', true);
        emailInput.prop('readonly', true);

        if (floatingSaveContainer.length) {
            floatingSaveContainer.removeClass('hidden');
        }
        if (floatingEditContainer.length) {
            floatingEditContainer.addClass('hidden');
        }

        saveButtons.removeClass('hidden');
        editButton.addClass('hidden');

        $('html, body').animate({ scrollTop: accountForm.offset().top - 80 }, 300);
    }

    function exitEditMode() {
        if (!isEditMode) return;
        isEditMode = false;

        fieldDisplays.removeClass('hidden');
        editFields.addClass('hidden');

        if (floatingSaveContainer.length) {
            floatingSaveContainer.addClass('hidden');
        }
        saveButtons.addClass('hidden');
        editButton.removeClass('hidden');

        refreshAllDisplays();
    }

    function showSavingState(isSaving) {
        saveButtons.each(function (index) {
            const button = $(this);
            if (isSaving) {
                button.prop('disabled', true)
                    .addClass('opacity-75 cursor-wait')
                    .html('<svg class="animate-spin h-5 w-5 mr-2 inline-flex" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Saving...');
            } else {
                button.prop('disabled', false)
                    .removeClass('opacity-75 cursor-wait')
                    .html(saveButtonOriginalHtml[index]);
            }
        });
    }

    function saveAllChanges() {
        showSavingState(true);
        normalizeMetricFields();

        const accountPromise = submitForm(accountForm, accountForm.attr('action'));
        const privacyPromise = submitForm(privacyForm, '/account/privacy');

        $.when(accountPromise, privacyPromise)
            .done(function () {
                showToast('Changes saved successfully!', 'success');
                accountInitialState = captureAccountState();
                privacyInitialState = capturePrivacyState();
                refreshAllDisplays();
                exitEditMode();
            })
            .fail(function (_, xhr) {
                const message = xhr && xhr.responseJSON && xhr.responseJSON.error
                    ? xhr.responseJSON.error
                    : 'Error saving changes. Please try again.';
                showToast(message, 'error');
            })
            .always(function () {
                showSavingState(false);
            });
    }

    function submitForm(form, url) {
        if (!form || !form.length) {
            return $.Deferred().resolve().promise();
        }

        const data = new FormData(form[0]);
        form.find('input[type="checkbox"]').each(function () {
            const name = this.name;
            if (!name) return;
            data.set(name, $(this).is(':checked') ? 'true' : 'false');
        });

        return $.ajax({
            url: url,
            method: 'POST',
            data: data,
            processData: false,
            contentType: false
        });
    }

    function normalizeMetricFields() {
        const cm = parseFloat(heightCmInput.val());
        if (Number.isFinite(cm) && cm > 0) {
            heightCmInput.val(cm.toFixed(1));
        } else {
            heightCmInput.val('');
        }

        const kg = parseFloat(weightKgInput.val());
        if (Number.isFinite(kg) && kg > 0) {
            weightKgInput.val(kg.toFixed(1));
        } else {
            weightKgInput.val('');
        }
    }

    function captureAccountState() {
        const state = {};
        accountForm.find('input, textarea, select').each(function () {
            const element = $(this);
            const name = element.attr('name');
            if (!name) return;

            if (element.attr('type') === 'checkbox') {
                state[name] = element.prop('checked');
            } else {
                state[name] = element.val();
            }
        });

        state.height_feet = heightFeetInput.val();
        state.height_inches = heightInchesInput.val();
        state.weight_lbs = weightLbsInput.val();
        return state;
    }

    function restoreAccountState(state) {
        accountForm.find('input, textarea, select').each(function () {
            const element = $(this);
            const name = element.attr('name');
            if (!name || !(name in state)) return;

            if (element.attr('type') === 'checkbox') {
                element.prop('checked', !!state[name]);
            } else {
                element.val(state[name]);
            }
        });

        heightFeetInput.val(state.height_feet || '');
        heightInchesInput.val(state.height_inches || '');
        weightLbsInput.val(state.weight_lbs || '');

        syncHeightFromMetric();
        syncWeightFromMetric();
        updateTargetWeightDisplay(parseFloat(targetWeightKgInput.val()));
    }

    function capturePrivacyState() {
        const state = {};
        if (!privacyForm.length) return state;

        privacyForm.find('input, textarea, select').each(function () {
            const element = $(this);
            const name = element.attr('name');
            if (!name) return;

            if (element.attr('type') === 'checkbox') {
                state[name] = element.prop('checked');
            } else {
                state[name] = element.val();
            }
        });

        return state;
    }

    function restorePrivacyState(state) {
        if (!privacyForm.length) return;

        privacyForm.find('input, textarea, select').each(function () {
            const element = $(this);
            const name = element.attr('name');
            if (!name || !(name in state)) return;

            if (element.attr('type') === 'checkbox') {
                element.prop('checked', !!state[name]);
                updatePrivacyToggleDisplay(element);
            } else {
                element.val(state[name]);
            }
        });

        updateProfileVisibilityDisplay($('#profile_visibility').val());
        updateBioDisplay($('#bio').val());
    }

    function initializeHeightWeightFields() {
        heightFeetInput.on('input change', syncHeightFromImperial);
        heightInchesInput.on('input change', syncHeightFromImperial);
        heightCmInput.on('input change', syncHeightFromMetric);

        weightLbsInput.on('input change', syncWeightFromImperial);
        weightKgInput.on('input change', syncWeightFromMetric);

        syncHeightFromMetric();
        syncWeightFromMetric();
    }

    function syncHeightFromImperial() {
        const feet = parseInt(heightFeetInput.val(), 10) || 0;
        let inches = parseInt(heightInchesInput.val(), 10) || 0;

        if (inches >= 12) {
            const extraFeet = Math.floor(inches / 12);
            inches = inches % 12;
            heightFeetInput.val(feet + extraFeet);
            heightInchesInput.val(inches);
        }

        const totalInches = (parseInt(heightFeetInput.val(), 10) || 0) * 12 + (parseInt(heightInchesInput.val(), 10) || 0);
        if (totalInches <= 0) {
            heightCmInput.val('');
            updateHeightDisplay(null);
            return;
        }

        const cm = totalInches * 2.54;
        const rounded = Math.round(cm * 10) / 10;
        heightCmInput.val(rounded.toFixed(1));
        preferredUnitsInput.val('imperial');
        updateHeightDisplay(rounded);
    }

    function syncHeightFromMetric() {
        const cm = parseFloat(heightCmInput.val());
        if (!Number.isFinite(cm) || cm <= 0) {
            heightFeetInput.val('');
            heightInchesInput.val('');
            updateHeightDisplay(null);
            return;
        }

        const totalInches = cm / 2.54;
        let feet = Math.floor(totalInches / 12);
        let inches = Math.round(totalInches - feet * 12);

        if (inches === 12) {
            feet += 1;
            inches = 0;
        }

        heightFeetInput.val(feet);
        heightInchesInput.val(inches);
        preferredUnitsInput.val('metric');
        updateHeightDisplay(cm);
    }

    function syncWeightFromImperial() {
        const lbs = parseFloat(weightLbsInput.val());
        if (!Number.isFinite(lbs) || lbs <= 0) {
            weightKgInput.val('');
            updateWeightDisplay(null);
            return;
        }

        const kg = lbs / 2.2046226218;
        const rounded = Math.round(kg * 10) / 10;
        weightKgInput.val(rounded.toFixed(1));
        preferredUnitsInput.val('imperial');
        updateWeightDisplay(rounded);
    }

    function syncWeightFromMetric() {
        const kg = parseFloat(weightKgInput.val());
        if (!Number.isFinite(kg) || kg <= 0) {
            weightLbsInput.val('');
            updateWeightDisplay(null);
            return;
        }

        const lbs = kg * 2.2046226218;
        weightLbsInput.val(Math.round(lbs));
        preferredUnitsInput.val('metric');
        updateWeightDisplay(kg);
    }

    function updateHeightDisplay(cm) {
        const display = $('#heightDisplay');
        if (!display.length) return;

        if (!Number.isFinite(cm) || cm <= 0) {
            display.text('Not set');
            return;
        }

        const totalInches = cm / 2.54;
        let feet = Math.floor(totalInches / 12);
        let inches = Math.round(totalInches - feet * 12);

        if (inches === 12) {
            feet += 1;
            inches = 0;
        }

        const imperialPart = `${feet}'${inches}"`;
        const metricPart = `${cm.toFixed(1).replace(/\.0$/, '')} cm`;
        display.text(`${imperialPart} (${metricPart})`);
    }

    function updateWeightDisplay(kg) {
        const display = $('#weightDisplay');
        if (!display.length) return;

        if (!Number.isFinite(kg) || kg <= 0) {
            display.text('Not set');
            return;
        }

        const lbs = kg * 2.2046226218;
        const imperialPart = `${Math.round(lbs)} lbs`;
        const metricPart = `${kg.toFixed(1).replace(/\.0$/, '')} kg`;
        display.text(`${imperialPart} (${metricPart})`);
    }

    function updateTargetWeightDisplay(kg) {
        const display = $('#targetWeightDisplay');
        if (!display.length) return;

        if (!Number.isFinite(kg) || kg <= 0) {
            display.text('Not set');
            return;
        }

        const lbs = kg * 2.2046226218;
        const imperialPart = `${Math.round(lbs)} lbs`;
        const metricPart = `${kg.toFixed(1).replace(/\.0$/, '')} kg`;
        display.text(`${imperialPart} (${metricPart})`);
    }

    function formatDateDisplay(value) {
        if (!value) return 'Not set';
        
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    function refreshAllDisplays() {
        updateHeightDisplay(parseFloat(heightCmInput.val()));
        updateWeightDisplay(parseFloat(weightKgInput.val()));
        updateTargetWeightDisplay(parseFloat(targetWeightKgInput.val()));
        refreshBasicFieldDisplays();
        refreshPrivacyDisplays();
    }

    function refreshBasicFieldDisplays() {
        updateSimpleDisplay('#first_name');
        updateSimpleDisplay('#last_name');
        updateSimpleDisplay('#phone_number');
        updateSimpleDisplay('#address', value => value || 'Not set');
        updateSimpleDisplay('#date_of_birth', value => formatDateDisplay(value));
        updateSimpleDisplay('#gender');
        updateSimpleDisplay('#body_fat_percentage', value => value ? `${parseFloat(value).toFixed(1)}%` : 'Not set');
        updateSimpleDisplay('#activity_level');
        updateSimpleDisplay('#target_body_fat_percentage', value => value ? `${parseFloat(value).toFixed(1)}%` : 'Not set');
        updateSimpleDisplay('#weekly_weight_loss_goal', value => value ? `${parseFloat(value).toFixed(2)} kg/week` : 'Not set');
        updateSimpleDisplay('#medical_conditions', value => value || 'Not set');
        updateSimpleDisplay('#allergies', value => value || 'Not set');
        updateSimpleDisplay('#injuries', value => value || 'Not set');
        updateSimpleDisplay('#smoking_status');
        updateSimpleDisplay('#alcohol_consumption');
        updateSimpleDisplay('#motivation_level');
        updateSimpleDisplay('#dietary_preferences', (value, input) => {
            if (!value) return 'Not set';
            const optionText = input.find('option:selected').text();
            return optionText || value;
        });
        updateSimpleDisplay('#fitness_goal', (value, input) => {
            if (!value) return 'Not set';
            const optionText = input.find('option:selected').text();
            return optionText || value;
        });
        updateSimpleDisplay('#preferred_workout_time', value => formatTimeDisplay(value));
    }

    function refreshPrivacyDisplays() {
        if (!privacyForm.length) return;
        updateProfileVisibilityDisplay($('#profile_visibility').val());
        updateBioDisplay($('#bio').val());
        privacyForm.find('input[type="checkbox"]').each(function () {
            updatePrivacyToggleDisplay($(this));
        });
    }

    function updateSimpleDisplay(selector, formatter) {
        const input = $(selector);
        if (!input.length) return;
        const container = input.closest('div');
        const display = container.find('.field-display').first();
        if (!display.length) return;

        const rawValue = input.val();
        let formattedValue = rawValue;

        if (typeof formatter === 'function') {
            formattedValue = formatter(rawValue, input);
        } else {
            formattedValue = rawValue || 'Not set';
        }

        if (!formattedValue) {
            formattedValue = 'Not set';
        }

        display.text(formattedValue);
    }

    function formatTimeDisplay(value) {
        if (!value) {
            return 'Not set';
        }

        const normalized = value.trim();
        if (!normalized) return 'Not set';

        const timeParts = normalized.split(':');
        if (timeParts.length < 2) return normalized;

        const hours = parseInt(timeParts[0], 10);
        const minutes = timeParts[1].substring(0, 2);
        if (Number.isNaN(hours)) return normalized;

        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = (hours % 12) || 12;
        return `${displayHours}:${minutes} ${period}`;
    }

    function updateProfileVisibilityDisplay(value) {
        const display = $('#profile_visibility').closest('.space-y-3').find('.field-display');
        if (!display.length) return;

        let message = 'Not set';
        switch (value) {
            case 'public':
                message = 'Public - Anyone can find and view your profile';
                break;
            case 'friends_only':
                message = 'Friends Only - Only your friends can view your profile';
                break;
            case 'private':
                message = 'Private - Only you can view your profile';
                break;
        }
        display.text(message);
    }

    function updatePrivacyToggleDisplay(element) {
        const display = element.closest('.flex').find('.field-display');
        if (!display.length) return;
        display.text(element.is(':checked') ? 'Enabled' : 'Disabled');
    }

    function updateBioDisplay(value) {
        const display = $('#bio').closest('.space-y-3').find('.field-display');
        if (!display.length) return;
        display.text(value ? value : 'No bio added yet');
    }

    function showToast(message, type) {
        const baseClasses = 'fixed top-4 right-4 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold z-50 flex items-center gap-2';
        const icon = $('<span>').addClass('inline-flex');
        let classes = '';

        if (type === 'error') {
            classes = 'bg-red-50 text-red-700 border border-red-200';
            icon.html('<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>');
        } else {
            classes = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
            icon.html('<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>');
        }

        const toast = $('<div>').addClass(`${baseClasses} ${classes}`).append(icon).append($('<span>').text(message));
        $('body').append(toast);
        toast.delay(2800).fadeOut(400, function () {
            toast.remove();
        });
    }

    // ===================================
    // BLOCKED USERS MANAGEMENT
    // ===================================
    
    const blockedUsersToggle = $('#blockedUsersToggle');
    const blockedUsersContent = $('#blockedUsersContent');
    const blockedUsersList = $('#blockedUsersList');
    const blockedUsersEmpty = $('#blockedUsersEmpty');
    const blockedUsersCount = $('#blockedUsersCount');
    const blockedUsersChevron = $('#blockedUsersChevron');

    // Toggle collapsed section
    blockedUsersToggle.on('click', function() {
        blockedUsersContent.toggleClass('hidden');
        blockedUsersChevron.toggleClass('rotate-180');
    });

    // Load blocked users
    async function loadBlockedUsers() {
        try {
            const response = await $.get('/account/blocked');
            const blockedUsers = response.blocked_users || [];
            
            updateBlockedUsersCount(blockedUsers.length);
            
            if (blockedUsers.length === 0) {
                blockedUsersList.empty();
                blockedUsersEmpty.removeClass('hidden');
            } else {
                blockedUsersEmpty.addClass('hidden');
                renderBlockedUsers(blockedUsers);
            }
        } catch (error) {
            console.error('Error loading blocked users:', error);
        }
    }

    function updateBlockedUsersCount(count) {
        const text = count === 0 ? 'Blocked Users' : `Blocked Users (${count})`;
        blockedUsersCount.text(text);
    }

    function renderBlockedUsers(users) {
        blockedUsersList.empty();
        
        users.forEach(user => {
            const initials = (user.first_name?.[0] || '') + (user.last_name?.[0] || '') || '?';
            const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
            
            const userHtml = `
                <div class="flex items-center justify-between py-2 px-2 bg-white dark:bg-gray-700 rounded border border-slate-200 dark:border-gray-600">
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                        <div class="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-300 flex-shrink-0">
                            ${initials}
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">${name}</p>
                            <p class="text-xs text-slate-500 dark:text-slate-400 truncate">@${user.username}</p>
                        </div>
                    </div>
                    <button class="unblock-user-btn ml-2 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors" 
                            data-user-id="${user.user_id}" 
                            data-username="${user.username}">
                        Unblock
                    </button>
                </div>
            `;
            
            blockedUsersList.append(userHtml);
        });

        // Attach unblock event handlers
        $('.unblock-user-btn').on('click', function() {
            const userId = $(this).data('user-id');
            const username = $(this).data('username');
            unblockUser(userId, username);
        });
    }

    function getCsrfToken() {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; XSRF-TOKEN=`);
        if (parts.length === 2) {
            return decodeURIComponent(parts.pop().split(';').shift());
        }
        return null;
    }

    async function unblockUser(userId, username) {
        try {
            const csrfToken = getCsrfToken();
            await $.ajax({
                url: `/friends/api/block/${userId}`,
                method: 'DELETE',
                contentType: 'application/json',
                headers: {
                    'X-CSRFToken': csrfToken
                }
            });
            
            showToast('User unblocked successfully', 'success');
            loadBlockedUsers();
            
        } catch (error) {
            console.error('Error unblocking user:', error);
            const errorMessage = error.responseJSON?.error || 'Failed to unblock user';
            showToast(errorMessage, 'error');
        }
    }

    // Load blocked users on page load
    loadBlockedUsers();
});