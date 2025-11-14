(function (window) {
    'use strict';

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return decodeURIComponent(parts.pop().split(';').shift());
        }
        return null;
    }

    function isSafeMethod(method) {
        return /^(GET|HEAD|OPTIONS|TRACE)$/i.test(method || '');
    }

    function getCsrfToken() {
        return getCookie('XSRF-TOKEN');
    }

    function applyCsrfHeader(headers, method) {
        if (isSafeMethod(method)) {
            return headers;
        }
        const token = getCsrfToken();
        if (!token) {
            return headers;
        }
        if (!headers) {
            headers = {};
        }
        if (headers instanceof Headers) {
            headers.set('X-CSRF-Token', token);
        } else {
            headers['X-CSRF-Token'] = token;
        }
        return headers;
    }

    // Patch window.fetch to include the CSRF token automatically
    if (typeof window.fetch === 'function') {
        const originalFetch = window.fetch.bind(window);
        window.fetch = function (input, init = {}) {
            const method = (init.method || (input && input.method) || 'GET').toUpperCase();
            init.headers = applyCsrfHeader(init.headers, method);
            return originalFetch(input, init);
        };
    }

    // Configure jQuery AJAX to include the CSRF token
    if (window.jQuery) {
        window.jQuery.ajaxPrefilter(function (options, originalOptions, jqXHR) {
            const method = (options.type || 'GET').toUpperCase();
            if (isSafeMethod(method)) {
                return;
            }
            const token = getCsrfToken();
            if (token) {
                jqXHR.setRequestHeader('X-CSRF-Token', token);
            }
        });
    }

    window.CSRF = {
        getToken: getCsrfToken
    };
})(window);

