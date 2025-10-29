
$(document).ready(function () {
    const form = $('#accountForm');
    const editButton = $('#editButton');
    const saveButton = $('#saveButton');
    const inputs = form.find('input:not([type="submit"]), textarea, select');
    
    // Initial state setup
    const initialValues = {};
    inputs.each(function() {
        initialValues[this.name] = $(this).val();
    });

    // Function to toggle edit mode
    function toggleEditMode(isEditable) {
        if (isEditable) {
            // Show inputs, hide displays
            $('.field-display').addClass('hidden');
            inputs.each(function() {
                const input = $(this);
                const isReadonlyField = input.attr('id') === 'username' || input.attr('id') === 'email';
                
                if (!isReadonlyField) {
                    // Show and enable editable fields
                    input.removeClass('hidden');
                    if (input.is('input, textarea')) {
                        input.prop('readonly', false);
                        input.prop('disabled', false);
                    } else if (input.is('select')) {
                        input.prop('disabled', false);
                    }
                }
                // Username/email are always visible (already shown)
            });
        } else {
            // Show displays, hide inputs (except username/email which stay as readonly inputs)
            inputs.each(function() {
                const input = $(this);
                const isReadonlyField = input.attr('id') === 'username' || input.attr('id') === 'email';
                
                if (!isReadonlyField) {
                    // Hide input and show display
                    input.addClass('hidden');
                    
                    // Find the display element (it's a sibling, not a child)
                    const fieldContainer = input.closest('div');
                    const display = fieldContainer.find('.field-display').first();
                    
                    if (display.length) {
                        let displayValue = input.val();
                        
                        // Format display values
                        if (input.attr('id') === 'height_cm' && displayValue) {
                            displayValue = displayValue + ' cm';
                        } else if (input.attr('id') === 'weight_kg' && displayValue) {
                            displayValue = displayValue + ' kg';
                        } else if (input.attr('id') === 'preferred_workout_time' && displayValue) {
                            // Format time (HH:mm to 12-hour format)
                            const timeParts = displayValue.split(':');
                            if (timeParts.length === 2) {
                                const hours = parseInt(timeParts[0]);
                                const minutes = timeParts[1];
                                const period = hours >= 12 ? 'PM' : 'AM';
                                const displayHours = hours % 12 || 12;
                                displayValue = displayHours + ':' + minutes + ' ' + period;
                            }
                        }
                        
                        // Update display text
                        display.text(displayValue || 'Not set').removeClass('hidden');
                    }
                }
            });
        }

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

    // Initialize all fields as display mode on page load (text view, not inputs)
    toggleEditMode(false);

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
                
                // Update initial values
                inputs.each(function() {
                    initialValues[this.name] = $(this).val();
                });
                
                // Reset form state - this will update displays with new values
                toggleEditMode(false);
                saveButton.prop('disabled', false)
                         .html('<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Save');
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
                         .html('<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Save');
            }
        });
    });

    // Handle escape key to cancel editing
    $(document).on('keyup', function(e) {
        if (e.key === "Escape" && editButton.hasClass('hidden')) {
            // Only cancel if we're in edit mode
            // Reset form values
            inputs.each(function() {
                const input = $(this);
                const isReadonlyField = input.attr('id') === 'username' || input.attr('id') === 'email';
                if (!isReadonlyField) {
                    input.val(initialValues[this.name]);
                }
            });
            toggleEditMode(false);
        }
    });

    // Prevent form submission unless save button is clicked
    form.on('submit', function(e) {
        e.preventDefault();
        // Only submit via AJAX when save button is clicked
    });
});