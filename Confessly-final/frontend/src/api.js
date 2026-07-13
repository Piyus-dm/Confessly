// vite proxy routes /api to the backend, cookies handle auth

export function apiUrl(path) {
    return path;
}

// fetch wrapper that always sends cookies
export function apiFetch(path, options = {}) {
    return fetch(apiUrl(path), {
        credentials: 'include',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
}

// multipart upload — no content-type so the browser sets the boundary
export function apiUpload(path, formData) {
    return fetch(apiUrl(path), {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });
}
