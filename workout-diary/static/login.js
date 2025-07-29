$(document).ready(function () {
    // Cache DOM elements
    const $loginForm = $('#loginForm');
    const $registerForm = $('#registerForm');
    const $errorMessage = $('#error-message');
    const $submitButton = $('#submitButton');
    const $buttonText = $('#buttonText');
    const $loadingSpinner = $('#loadingSpinner');
    
    // Password visibility toggle

    $('.toggle-password').on('click', function() {
        const $input = $($(this).data('target'));
        const type = $input.attr('type') === 'password' ? 'text' : 'password';
        $input.attr('type', type);
        $(this).text(type === 'password' ? '👁️' : '👁️‍🗨️');
    });

    // Form toggle functionality
    $('#toggle-form').on('click', function (event) {
        event.preventDefault();
        
        const $formTitle = $('#form-title');
        const $toggleButton = $(this);

        $registerForm.fadeToggle(300);
        $loginForm.fadeToggle(300);
        
        if ($registerForm.is(':visible')) {
            $formTitle.text('Register');
            $toggleButton.text('Login');
        } else {
            $formTitle.text('Login');
            $toggleButton.text('Register');
        }
        
        // Clear forms and error messages
        $loginForm[0].reset();
        $registerForm[0].reset();
        $errorMessage.hide();
    });

    // Input validation
    $('input[required]').on('input', function() {
        $(this).toggleClass('border-red-500', !$(this).val().trim());
    });

    // Login form submission
    $loginForm.on('submit', function (event) {
        event.preventDefault();
        
        const username = $('#login-username').val();
        const password = $('#login-password').val();
        const rememberMe = $('#remember-me').prop('checked');
        
        // Show loading state
        $submitButton.prop('disabled', true);
        $buttonText.text('Logging in...');
        $loadingSpinner.removeClass('hidden');
        $errorMessage.hide();

        $.ajax({
            url: '/auth/login',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ 
                username, 
                password,
                remember_me: rememberMe 
            }),
            success: function (data) {
                // if (data.token) {
                //     localStorage.setItem('auth_token', data.token);
                // }
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                }
            },
            error: function (xhr) {
                const errorMessage = xhr.responseJSON?.message || 'An error occurred while trying to log in. Please try again.';
                $errorMessage
                    .text(errorMessage)
                    .removeClass('hidden bg-green-100 text-green-700')
                    .addClass('bg-red-100 text-red-700')
                    .fadeIn();
                
                // Reset form state
                $submitButton.prop('disabled', false);
                $buttonText.text('Login');
                $loadingSpinner.addClass('hidden');
            }
        });
    });


    // Remember me functionality
    const rememberedUsername = localStorage.getItem('remembered_username');
    if (rememberedUsername) {
        $('#login-username').val(rememberedUsername);
        $('#remember-me').prop('checked', true);
    }

    // Update remembered username when checkbox changes
    $('#remember-me').on('change', function() {
        if ($(this).is(':checked')) {
            localStorage.setItem('remembered_username', $('#login-username').val());
        } else {
            localStorage.removeItem('remembered_username');
        }
    });

    // Clear error message when user starts typing
    $('input').on('input', function() {
        $errorMessage.fadeOut();
    });
});