$(document).ready(function () {

    $('#mobileMenuButton').on('click', function (event) {
            const menu = document.getElementById('mobileMenu');
            menu.classList.toggle('hidden');
          });



    $('#logoutLink').on('click', function (event) {
        event.preventDefault(); // Prevent the default link behavior

        $.ajax({
            url: '/logout', // Logout endpoint
            type: 'POST',
            contentType: 'application/json',
            success: function (data) {
                if (data.redirect_url) {
                    window.location.href = data.redirect_url; // Redirect after successful logout
                } else {
                    console.error('Logout failed: No redirect URL.');
                }
            },
            error: function (xhr) {
                console.error('Error during logout:', xhr.responseText || 'Unknown error');
            }
        });
    });
});