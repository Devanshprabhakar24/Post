const VERIFIED_EMAILS_KEY = 'post-explorer-verified-emails';
const TEST_OTP = '123456';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RULES = [
    { key: 'length', label: 'At least 8 characters' },
    { key: 'upper', label: 'One uppercase letter' },
    { key: 'lower', label: 'One lowercase letter' },
    { key: 'number', label: 'One number' },
    { key: 'special', label: 'One special character' },
    { key: 'noSpaces', label: 'No spaces' }
];

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
    return EMAIL_REGEX.test(normalizeEmail(email));
}

function getVerifiedEmails() {
    try {
        const raw = localStorage.getItem(VERIFIED_EMAILS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
        return [];
    }
}

function isEmailVerified(email) {
    const normalized = normalizeEmail(email);
    return getVerifiedEmails().includes(normalized);
}

function markEmailVerified(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) {
        return;
    }

    const emails = new Set(getVerifiedEmails());
    emails.add(normalized);
    localStorage.setItem(VERIFIED_EMAILS_KEY, JSON.stringify(Array.from(emails)));
}

function validateTestOtp(value) {
    return String(value || '').trim() === TEST_OTP;
}

function validatePassword(password) {
    const value = String(password || '');

    const checks = {
        length: value.length >= 8,
        upper: /[A-Z]/.test(value),
        lower: /[a-z]/.test(value),
        number: /\d/.test(value),
        special: /[^A-Za-z0-9]/.test(value),
        noSpaces: !/\s/.test(value)
    };

    return {
        valid: Object.values(checks).every(Boolean),
        checks
    };
}

export {
    TEST_OTP,
    PASSWORD_RULES,
    normalizeEmail,
    isValidEmail,
    isEmailVerified,
    markEmailVerified,
    validateTestOtp,
    validatePassword
};
