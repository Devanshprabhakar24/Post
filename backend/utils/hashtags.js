function extractHashtags(input) {
    const source = Array.isArray(input) ? input.join(' ') : String(input || '');
    const matches = source.match(/#([A-Za-z0-9_]+)/g) || [];

    return Array.from(
        new Set(
            matches
                .map((tag) => String(tag).replace(/^#/, '').trim().toLowerCase())
                .filter(Boolean)
        )
    );
}

function normalizeHashtag(tag) {
    return String(tag || '').replace(/^#/, '').trim().toLowerCase();
}

module.exports = {
    extractHashtags,
    normalizeHashtag
};