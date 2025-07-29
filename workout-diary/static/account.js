
$(document).ready(function () {
    const form = $('#accountForm');
    const editButton = $('#editButton');
    const saveButton = $('#saveButton');
    const inputs = form.find('input, textarea');
    
    // Initial state setup
    const initialValues = {};
    inputs.each(function() {
        initialValues[this.name] = $(this).val();
    });

    // Function to toggle edit mode
    function toggleEditMode(isEditable) {
        inputs.each(function() {
            const input = $(this);
            input.prop('readonly', !isEditable);
            
            // Toggle background color
            if (isEditable) {
                input.removeClass('bg-gray-100')
                     .addClass('bg-white');
            } else {
                input.addClass('bg-gray-100')
                     .removeClass('bg-white');
            }
        });

        // Toggle button visibility with animation
        if (isEditable) {
            editButton.addClass('hidden');
            saveButton.removeClass('hidden')
                     .css('opacity', '0')
                     .animate({ opacity: 1 }, 200);
        } else {
            saveButton.addClass('hidden');
            editButton.removeClass('hidden')
                     .css('opacity', '0')
                     .animate({ opacity: 1 }, 200);
        }
    }

    // Edit button click handler
    editButton.on('click', function() {
        toggleEditMode(true);
    });

    // Save button click handler
    saveButton.on('click', function(e) {
        e.preventDefault();
        
        // Add loading state to save button
        saveButton.prop('disabled', true)
                 .html('<svg class="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Saving...');

        // Collect form data
        const formData = new FormData(form[0]);
        
        // Submit form data via AJAX
        $.ajax({
            url: form.attr('action'),
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                // Update initial values
                inputs.each(function() {
                    initialValues[this.name] = $(this).val();
                });
                
                // Show success message
                const successMessage = $('<div>')
                    .addClass('fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg transition-opacity duration-500')
                    .text('Changes saved successfully!')
                    .appendTo('body')
                    .delay(3000)
                    .fadeOut(500, function() { $(this).remove(); });
                
                // Reset form state
                toggleEditMode(false);
                saveButton.prop('disabled', false)
                         .html('<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Save Changes');
            },
            error: function(xhr, status, error) {
                // Show error message
                const errorMessage = $('<div>')
                    .addClass('fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-md shadow-lg transition-opacity duration-500')
                    .text('Error saving changes. Please try again.')
                    .appendTo('body')
                    .delay(3000)
                    .fadeOut(500, function() { $(this).remove(); });
                
                // Reset button state
                saveButton.prop('disabled', false)
                         .html('<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Save Changes');
            }
        });
    });

    // Handle escape key to cancel editing
    $(document).on('keyup', function(e) {
        if (e.key === "Escape" && !editButton.hasClass('hidden')) {
            // Reset form values
            inputs.each(function() {
                $(this).val(initialValues[this.name]);
            });
            toggleEditMode(false);
        }
    });
});