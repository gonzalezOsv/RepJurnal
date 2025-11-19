// register.js
$(document).ready(function() {
    // Cache DOM elements
    const $registerForm = $('#registerForm');
    const $errorMessage = $('#error-message');
    const $submitButton = $('#submitButton');
    const $buttonText = $('#buttonText');
    const $loadingSpinner = $('#loadingSpinner');
    const $passwordInput = $('#register-password');
    const $confirmPasswordInput = $('#register-confirm-password');
    const $passwordStrength = $('#password-strength div');
    const $passwordRequirements = $('#password-requirements');
    const $usernameInput = $('#register-username');
    const $usernameValidation = $('#username-validation');

    const USERNAME_MIN_LENGTH = 3;
    const USERNAME_REGEX = /^[A-Za-z0-9]+$/;
    let usernameTimeout;
    let activeUsernameRequest = 0;
    const usernameState = {
        value: '',
        status: 'empty'
    };

    function getCsrfToken() {
        return $('#registerForm input[name="csrf_token"]').val() || (window.CSRF && window.CSRF.getToken && window.CSRF.getToken());
    }

    function showFormError(message) {
        $errorMessage
            .text(message)
            .removeClass('hidden bg-green-100 text-green-700')
            .addClass('bg-red-100 text-red-700');
    }

    function clearFormError() {
        $errorMessage
            .text('')
            .removeClass('bg-red-100 text-red-700 bg-green-100 text-green-700')
            .addClass('hidden');
    }

    function updateUsernameFeedback(message, variant = 'info') {
        const variantClass = variant === 'success'
            ? 'text-green-600'
            : variant === 'error'
                ? 'text-red-500'
                : 'text-gray-500';

        $usernameValidation
            .text(message || '')
            .toggleClass('hidden', !message)
            .removeClass('text-green-600 text-red-500 text-gray-500');

        if (message) {
            $usernameValidation.addClass(variantClass);
        }
    }

    function performUsernameAvailabilityCheck(username) {
        const csrfToken = getCsrfToken();
        const requestId = ++activeUsernameRequest;
        const payload = csrfToken ? { username, csrf_token: csrfToken } : { username };

        usernameState.value = username;
        usernameState.status = 'checking';

        updateUsernameFeedback('Checking availability...', 'info');

        return $.ajax({
            url: '/auth/check-username',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            beforeSend: function(xhr) {
                if (csrfToken) {
                    xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                }
            }
        })
        .done(function(data) {
            if (requestId !== activeUsernameRequest || $usernameInput.val().trim() !== username) {
                return;
            }

            if (data.available) {
                usernameState.status = 'available';
                updateUsernameFeedback('Username is available', 'success');
            } else {
                usernameState.status = 'taken';
                updateUsernameFeedback('Username is already taken', 'error');
            }
        })
        .fail(function() {
            if (requestId !== activeUsernameRequest || $usernameInput.val().trim() !== username) {
                return;
            }

            usernameState.status = 'error';
            updateUsernameFeedback('Could not verify username availability. Please try again.', 'error');
        });
    }

    function handleUsernameInput() {
        const rawValue = $usernameInput.val();
        const username = rawValue.trim();

        clearTimeout(usernameTimeout);

        if (rawValue !== username) {
            $usernameInput.val(username);
        }

        if (!username) {
            usernameState.value = '';
            usernameState.status = 'empty';
            updateUsernameFeedback('');
            return;
        }

        if (!USERNAME_REGEX.test(username)) {
            usernameState.value = username;
            usernameState.status = 'invalid';
            updateUsernameFeedback('Username can only contain letters and numbers', 'error');
            return;
        }

        if (username.length < USERNAME_MIN_LENGTH) {
            usernameState.value = username;
            usernameState.status = 'incomplete';
            updateUsernameFeedback(`Username must be at least ${USERNAME_MIN_LENGTH} characters`, 'info');
            return;
        }

        usernameState.value = username;
        usernameState.status = 'checking';
        updateUsernameFeedback('Checking availability...', 'info');

        usernameTimeout = setTimeout(() => {
            performUsernameAvailabilityCheck(username);
        }, 400);
    }

    async function ensureUsernameIsAvailable() {
        const username = $usernameInput.val().trim();
        $usernameInput.val(username);

        if (!username) {
            usernameState.value = '';
            usernameState.status = 'empty';
            updateUsernameFeedback('Please enter a username', 'error');
            showFormError('Please enter a username');
            $usernameInput.focus();
            return false;
        }

        if (!USERNAME_REGEX.test(username)) {
            usernameState.value = username;
            usernameState.status = 'invalid';
            updateUsernameFeedback('Username can only contain letters and numbers', 'error');
            showFormError('Username can only contain letters and numbers');
            $usernameInput.focus();
            return false;
        }

        if (username.length < USERNAME_MIN_LENGTH) {
            usernameState.value = username;
            usernameState.status = 'incomplete';
            updateUsernameFeedback(`Username must be at least ${USERNAME_MIN_LENGTH} characters`, 'error');
            showFormError(`Username must be at least ${USERNAME_MIN_LENGTH} characters`);
            $usernameInput.focus();
            return false;
        }

        if (usernameState.value === username && usernameState.status === 'available') {
            return true;
        }

        clearTimeout(usernameTimeout);

        try {
            await performUsernameAvailabilityCheck(username);
        } catch (error) {
            // handled in fail callback
        }

        if (usernameState.value === username && usernameState.status === 'available') {
            clearFormError();
            return true;
        }

        if (usernameState.status === 'taken') {
            showFormError('Username is already taken. Please choose another.');
        } else if (usernameState.status === 'error') {
            showFormError('We could not verify the username. Please try again.');
        } else if (usernameState.status === 'checking') {
            showFormError('Please wait until the username check is complete.');
        }

        $usernameInput.focus();
        return false;
    }

    $usernameInput.on('input', handleUsernameInput);

    $usernameInput.on('blur', function() {
        const username = $usernameInput.val().trim();

        if (!username) {
            return;
        }

        if (!USERNAME_REGEX.test(username) || username.length < USERNAME_MIN_LENGTH) {
            return;
        }

        if (usernameState.value === username && ['available', 'taken'].includes(usernameState.status)) {
            return;
        }

        clearTimeout(usernameTimeout);
        performUsernameAvailabilityCheck(username);
    });

    // Password requirements regex
    const passwordRequirements = {
        length: /.{8,}/,
        uppercase: /[A-Z]/,
        lowercase: /[a-z]/,
        number: /[0-9]/,
        special: /[!@#$%^&*(),.?":{}|<>]/
    };

    // Password toggle visibility
    $('.toggle-password').on('click', function() {
        const $input = $($(this).data('target'));
        const type = $input.attr('type') === 'password' ? 'text' : 'password';
        $input.attr('type', type);
        $(this).text(type === 'password' ? '👁️' : '👁️‍🗨️');
    });

    // Check password strength
    function checkPasswordStrength(password) {
        let strength = 0;
        let requirementsMet = 0;

        // Check each requirement
        Object.entries(passwordRequirements).forEach(([requirement, regex]) => {
            const $requirement = $passwordRequirements.find(`[data-requirement="${requirement}"]`);
            const isValid = regex.test(password);
            
            $requirement.toggleClass('text-gray-500 text-green-600', isValid);
            $requirement.find('span').text(isValid ? '✓' : '✗');
            
            if (isValid) {
                requirementsMet++;
                strength += 20;
            }
        });

        // Update strength bar
        $passwordStrength.css('width', `${strength}%`);
        if (strength <= 20) {
            $passwordStrength.css('background-color', '#ef4444'); // red
        } else if (strength <= 40) {
            $passwordStrength.css('background-color', '#f97316'); // orange
        } else if (strength <= 60) {
            $passwordStrength.css('background-color', '#eab308'); // yellow
        } else if (strength <= 80) {
            $passwordStrength.css('background-color', '#22c55e'); // green
        } else {
            $passwordStrength.css('background-color', '#15803d'); // dark green
        }

        return requirementsMet === Object.keys(passwordRequirements).length;
    }

    // Check password match
    function checkPasswordMatch() {
        const password = $passwordInput.val();
        const confirmPassword = $confirmPasswordInput.val();
        const $passwordMatch = $('#password-match');

        if (confirmPassword) {
            if (password === confirmPassword) {
                $passwordMatch
                    .removeClass('hidden text-red-500')
                    .addClass('text-green-600')
                    .text('Passwords match');
                return true;
            } else {
                $passwordMatch
                    .removeClass('hidden text-green-600')
                    .addClass('text-red-500')
                    .text('Passwords do not match');
                return false;
            }
        }
        return false;
    }

    // Password input events
    $passwordInput.on('input', function() {
        checkPasswordStrength($(this).val());
    });

    // Confirm password input events
    $confirmPasswordInput.on('input', checkPasswordMatch);

    // Form submission
    $registerForm.on('submit', async function(event) {
        event.preventDefault();

        clearFormError();

        const usernameIsValid = await ensureUsernameIsAvailable();
        if (!usernameIsValid) {
            return;
        }

        // Validate password requirements
        if (!checkPasswordStrength($passwordInput.val())) {
            showFormError('Please meet all password requirements');
            return;
        }

        // Validate password match
        if (!checkPasswordMatch()) {
            showFormError('Passwords do not match');
            return;
        }

        // Show loading state
        $submitButton.prop('disabled', true);
        $buttonText.text('Creating account...');
        $loadingSpinner.removeClass('hidden');
        clearFormError();

        // Gather form data
        const csrfToken = getCsrfToken();

        const formData = {
            first_name: $('#register-first-name').val(),
            last_name: $('#register-last-name').val(),
            username: $usernameInput.val(),
            email: $('#register-email').val(),
            password: $passwordInput.val(),
            terms_accepted: $('#terms').is(':checked'),
            csrf_token: csrfToken
        };

        $.ajax({
            url: '/auth/register',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            beforeSend: function(xhr) {
                if (csrfToken) {
                    xhr.setRequestHeader('X-CSRF-Token', csrfToken);
                }
            },
            success: function(data) {
                $errorMessage
                .text('Account created successfully! Redirecting...')
                .removeClass('hidden bg-red-100 text-red-700')
                .addClass('bg-green-100 text-green-700');
        
            // Redirect immediately or after a short delay
            setTimeout(() => {
                window.location.href = data.redirect_url;
            }, 500); // Reduced timeout
            },
            error: function(xhr) {
                const errorMsg = xhr.responseJSON?.message || 'An error occurred during registration. Please try again.';
                showFormError(errorMsg);
                
                // Reset form state
                $submitButton.prop('disabled', false);
                $buttonText.text('Create Account');
                $loadingSpinner.addClass('hidden');
                
                // Highlight problematic fields if specified in the error response
                if (xhr.responseJSON?.fields) {
                    Object.keys(xhr.responseJSON.fields).forEach(field => {
                        $(`#register-${field}`)
                            .addClass('border-red-500')
                            .siblings('.field-error')
                            .text(xhr.responseJSON.fields[field])
                            .removeClass('hidden');
                    });
                }
            }
        });
    });
    
    // Clear error styling on input
    $('input').on('input', function() {
        $(this)
            .removeClass('border-red-500')
            .siblings('.field-error')
            .addClass('hidden');
        clearFormError();
    });
    
    // Validate email format
    $('#register-email').on('input', function() {
        const email = $(this).val();
        const $emailValidation = $('#email-validation');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
        if (email && !emailRegex.test(email)) {
            $emailValidation
                .removeClass('hidden text-green-600')
                .addClass('text-red-500')
                .text('Please enter a valid email address');
        } else if (email) {
            $emailValidation
                .removeClass('hidden text-red-500')
                .addClass('text-green-600')
                .text('Valid email format');
        } else {
            $emailValidation.addClass('hidden');
        }
    });
    
    // Terms checkbox validation
    $('#terms').on('change', function() {
        const $termsError = $(this).siblings('.field-error');
        if ($(this).is(':checked')) {
            $termsError.addClass('hidden');
        }
    });
    
    // Prevent form submission when pressing Enter if validation fails
    $(window).on('keydown', function(event) {
        if (event.key === 'Enter') {
            if (!checkPasswordStrength($passwordInput.val()) || !checkPasswordMatch()) {
                event.preventDefault();
                showFormError('Please fix all validation errors before submitting');
            }
        }
    });
    
    // Handle paste events on password fields (allow confirm password pasting)
    $('.password-input').on('paste', function(e) {
        if (this.id !== 'register-confirm-password') {
            e.preventDefault();
            showFormError('Please type your password manually for security');
        }
    });
    
    // Clean up on page unload
    $(window).on('unload', function() {
        // Clear any sensitive data from forms
        $registerForm[0].reset();
    });
});