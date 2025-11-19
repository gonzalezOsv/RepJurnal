# Template Components

This folder contains reusable HTML template components that are used across the application.

## 📦 Component Inventory

### Routine Management (My Routines Page)
- **`routine_card.html`** - Complete routine card with exercises, badges, and actions

### Workout Logger (Rep Logger Page)
- **`empty_state.html`** - Empty state display for workout log
- **`delete_exercise_modal.html`** - Confirmation modal for deleting exercises  
- **`exercise_card.html`** - Main exercise card container
- **`variation_row_cardio.html`** - Cardio exercise variation row
- **`variation_row_strength.html`** - Strength exercise variation row

## Purpose

Separating template components into their own files provides:

- ✅ **Better Organization:** Keep template files small and focused
- ✅ **Reusability:** Use the same component in multiple pages
- ✅ **Maintainability:** Easy to find and modify specific components
- ✅ **Syntax Highlighting:** Full HTML syntax support in component files
- ✅ **Version Control:** Track changes to individual components

## How to Use

### 1. Create a Component

Create a new `.html` file in this folder with your template:

```html
<!-- my_component.html -->
<template id="my-component-template">
    <div class="my-component">
        <h3 class="component-title"></h3>
        <p class="component-content"></p>
    </div>
</template>
```

### 2. Include in Your Page

Use Jinja2's `include` directive in your main template:

```html
<!-- In your main template file -->
{% include 'components/my_component.html' %}
```

### 3. Use in JavaScript

Clone and populate the template in your JavaScript:

```javascript
// Clone the template
const template = document.getElementById('my-component-template');
const clone = template.content.cloneNode(true);
const $component = $(clone);

// Populate with data
$component.find('.component-title').text('My Title');
$component.find('.component-content').text('My Content');

// Append to DOM
$('#container').append($component);
```

## Available Components

### `routine_card.html`
**Template ID:** `routine-card-template`

**Purpose:** Renders workout routine cards with all features (badges, visibility, exercises)

**Used In:** `my_routines.html`

**JavaScript:** `static/my_routines.js`

**Features:**
- Supports imported and user-created routines
- Public/Private visibility badges
- Collapsible exercise list
- Action buttons (Edit, Delete, Share, Start)

**Example Usage:**
```javascript
const $card = cloneRoutineCardTemplate();
populateRoutineCard($card, routineData);
$('#routines-container').append($card);
```

## Best Practices

### 1. Naming Convention
- **File Name:** `snake_case.html` (e.g., `routine_card.html`)
- **Template ID:** `kebab-case-template` (e.g., `routine-card-template`)
- **CSS Classes:** Use semantic, descriptive names

### 2. Documentation
- Add comments explaining the template's purpose
- Document required data structure
- List all dynamic elements that need population

### 3. Placeholder Elements
- Use semantic class names (e.g., `.routine-name`, `.component-title`)
- Hide elements that are conditionally shown (e.g., `.hidden` class)
- Use empty attributes that will be populated (e.g., `data-routine-id=""`)

### 4. Styling
- Include all Tailwind classes in the template
- Use conditional classes added via JavaScript for dynamic styling
- Keep styling consistent with the app's design system

## Template Structure Guidelines

### Good Template Example ✅
```html
<template id="user-card-template">
    <div class="user-card" data-user-id="">
        <h3 class="user-name"></h3>
        <p class="user-bio hidden"></p>
        <span class="user-badge hidden"></span>
        <button class="action-btn"></button>
    </div>
</template>
```

**Why it's good:**
- Semantic class names
- Elements start hidden if conditional
- Clear structure
- Empty data attributes for JavaScript to populate

### Bad Template Example ❌
```html
<template id="card">
    <div class="card">
        <h3></h3>
        <p></p>
    </div>
</template>
```

**Why it's bad:**
- No semantic class names
- Can't target specific elements easily
- No indication of what data goes where
- Non-descriptive template ID

## Integration with JavaScript

### Helper Function Pattern

Create helper functions for each template:

```javascript
// Clone template
function cloneMyComponentTemplate() {
    const template = document.getElementById('my-component-template');
    return $(template.content.cloneNode(true));
}

// Populate template
function populateMyComponent($component, data) {
    $component.find('.component-title').text(data.title);
    $component.find('.component-content').text(data.content);
    
    if (data.showBadge) {
        $component.find('.component-badge')
            .removeClass('hidden')
            .text(data.badgeText);
    }
    
    return $component;
}

// Attach events
function attachMyComponentEvents($container) {
    $container.find('.action-btn').on('click', function() {
        // Handle click
    });
}
```

## Performance Considerations

### Benefits of Separate Component Files

1. **Browser Caching:** Components can be cached separately
2. **Parallel Loading:** Flask can process includes in parallel
3. **Lazy Loading:** Only load components when the page needs them
4. **Cleaner Main Templates:** Reduced file size improves readability

### Template Cloning Performance

- ✅ **Fast:** Cloning is faster than parsing HTML strings
- ✅ **Efficient:** Browser parses template once, clones many times
- ✅ **Memory:** Better memory management than string concatenation

## Future Components

Consider creating components for:

- `friend_card.html` - Friend profile cards
- `exercise_row.html` - Exercise form rows
- `workout_card.html` - Workout log cards
- `notification.html` - Toast notifications
- `modal_header.html` - Reusable modal headers

## References

- [MDN: HTML Template Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template)
- [Jinja2: Include](https://jinja.palletsprojects.com/en/3.1.x/templates/#include)
- [jQuery: Working with Templates](https://learn.jquery.com/using-jquery-core/manipulating-elements/)

## Changelog

### 2025-10-30
- Created `components/` folder
- Added `routine_card.html` template
- Refactored `my_routines.js` to use template-based rendering
- Reduced `my_routines.js` from 2944 lines to 1524 lines (~48% reduction)

