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

    // // Username availability check
    // let usernameTimeout;
    // $('#register-username').on('input', function() {
    //     const username = $(this).val();
    //     const $usernameValidation = $('#username-validation');

    //     clearTimeout(usernameTimeout);
    //     if (username.length >= 3) {
    //         usernameTimeout = setTimeout(() => {
    //             $.ajax({
    //                 url: '/auth/check-username',
    //                 type: 'POST',
    //                 contentType: 'application/json',
    //                 data: JSON.stringify({ username }),
    //                 success: function(data) {
    //                     if (data.available) {
    //                         $usernameValidation
    //                             .removeClass('hidden text-red-500')
    //                             .addClass('text-green-600')
    //                             .text('Username is available');
    //                     } else {
    //                         $usernameValidation
    //                             .removeClass('hidden text-green-600')
    //                             .addClass('text-red-500')
    //                             .text('Username is already taken');
    //                     }
    //                 }
    //             });
    //         }, 500);
    //     } else {
    //         $usernameValidation.addClass('hidden');
    //     }
    // });

    // Form submission
    $registerForm.on('submit', function(event) {
        event.preventDefault();

        // Validate password requirements
        if (!checkPasswordStrength($passwordInput.val())) {
            $errorMessage
                .text('Please meet all password requirements')
                .removeClass('hidden')
                .addClass('bg-red-100 text-red-700');
            return;
        }

        // Validate password match
        if (!checkPasswordMatch()) {
            $errorMessage
                .text('Passwords do not match')
                .removeClass('hidden')
                .addClass('bg-red-100 text-red-700');
            return;
        }

        // Show loading state
        $submitButton.prop('disabled', true);
        $buttonText.text('Creating account...');
        $loadingSpinner.removeClass('hidden');
        $errorMessage.addClass('hidden');

        // Gather form data
        const formData = {
            first_name: $('#register-first-name').val(),
            last_name: $('#register-last-name').val(),
            username: $('#register-username').val(),
            email: $('#register-email').val(),
            password: $passwordInput.val(),
            terms_accepted: $('#terms').is(':checked')
        };

        $.ajax({
            url: '/auth/register',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
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
                $errorMessage
                    .text(errorMsg)
                    .removeClass('hidden bg-green-100 text-green-700')
                    .addClass('bg-red-100 text-red-700');
                
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
        $errorMessage.addClass('hidden');
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
                $errorMessage
                    .text('Please fix all validation errors before submitting')
                    .removeClass('hidden')
                    .addClass('bg-red-100 text-red-700');
            }
        }
    });
    
    // Handle paste events on password fields
    $('.password-input').on('paste', function(e) {
        e.preventDefault();
        $errorMessage
            .text('Please type your password manually for security')
            .removeClass('hidden')
            .addClass('bg-red-100 text-red-700');
    });
    
    // Clean up on page unload
    $(window).on('unload', function() {
        // Clear any sensitive data from forms
        $registerForm[0].reset();
    });
});