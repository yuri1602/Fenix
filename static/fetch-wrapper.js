// Fetch wrapper with automatic credentials and session handling
// This ensures cookies work properly on mobile/tablet devices

const originalFetch = window.fetch;

window.fetch = function(url, options = {}) {
    // Automatically add credentials to all requests
    if (!options.credentials) {
        options.credentials = 'same-origin';
    }
    
    return originalFetch(url, options)
        .then(response => {
            // If session expired (401), redirect to login
            if (response.status === 401 && !url.includes('/api/login')) {
                window.location.href = '/login';
                throw new Error('Session expired');
            }
            return response;
        })
        .catch(error => {
            // Re-throw the error to be handled by the caller
            throw error;
        });
};

