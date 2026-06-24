const API_BASE = 'http://158.220.87.97:3000';

/**
 * Fetch the user's library grouped by category
 * @param {string} email
 */
export async function fetchLibrary(email) {
    const res = await fetch(`${API_BASE}/api/dashboard/library?email=${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error('Failed to fetch library');
    const data = await res.json();
    return data.library;
}

/**
 * Share a category and get a share token
 * @param {string} email
 * @param {string} category
 */
export async function shareCategory(email, category) {
    const res = await fetch(`${API_BASE}/api/library/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, category })
    });
    if (!res.ok) throw new Error('Failed to share category');
    const data = await res.json();
    return data.shareUrl;
}

/**
 * Fetch articles from a shared library token
 * @param {string} token
 */
export async function fetchSharedLibrary(token) {
    const res = await fetch(`${API_BASE}/api/shared/${token}`);
    if (!res.ok) throw new Error('Shared library not found');
    return res.json();
}
