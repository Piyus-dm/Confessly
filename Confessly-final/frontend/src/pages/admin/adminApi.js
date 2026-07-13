// tiny fetch helpers for admin endpoints, cookie auth

export async function adminFetch(path) {
    const res = await fetch(path, { credentials: 'include' });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message || 'Request failed');
    return body;
}

export async function adminPost(path, data) {
    const res = await fetch(path, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message || 'Request failed');
    return body;
}

export async function adminDelete(path) {
    const res = await fetch(path, {
        method: 'DELETE',
        credentials: 'include',
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message || 'Request failed');
    return body;
}
