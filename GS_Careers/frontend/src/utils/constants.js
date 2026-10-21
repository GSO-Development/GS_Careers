export const EXPERIENCE_OPTIONS = [
    '0 years',
    '0-1 years',
    '1-2 years',
    '3-4 years',
    '5-7 years',
    '8-10 years',
    '10+ years'
];

// Keep these aliases for backward-compat with imports
export const OVERALL_EXPERIENCE_OPTIONS = EXPERIENCE_OPTIONS;
export const RELEVANT_EXPERIENCE_OPTIONS = EXPERIENCE_OPTIONS;

// Ordered rank map for "at least" filtering (higher = more experience)
export const EXPERIENCE_RANK = {
    '0 years':    0,
    '0-1 years':  1,
    '1-2 years':  2,
    '3-4 years':  3,
    '5-7 years':  4,
    '8-10 years': 5,
    '10+ years':  6,
};

/**
 * Returns all experience tiers >= the given minimum level.
 * Used on the client side for any local filtering.
 */
export const getExperienceAtLeast = (minLevel) => {
    const minRank = EXPERIENCE_RANK[minLevel] ?? 0;
    return EXPERIENCE_OPTIONS.filter(opt => (EXPERIENCE_RANK[opt] ?? 0) >= minRank);
};

export const QUALIFICATION_OPTIONS = [
    'O/L',
    'A/L',
    'Diploma',
    'Bachelors Degree',
    'Masters Degree',
    'PhD',
    'Professional Certification'
];

export const EMPLOYMENT_TYPES = [
    'Full-Time',
    'Part-Time',
    'Contract',
    'Internship'
];

export const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
};

export const isExpired = (expireDate) => {
    return new Date(expireDate) < new Date();
};

export const daysLeft = (expireDate) => {
    const diff = new Date(expireDate) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

/**
 * Universal Copy to Clipboard utility
 * Handles HTTPS, HTTP (LAN IP like 172.16.2.47), mobile, and older browsers seamlessly.
 */
export const copyToClipboard = async (text) => {
    if (!text) return false;
    
    // 1. Try Clipboard API if available in secure context
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn('Async Clipboard API failed, attempting fallback:', err);
        }
    }

    // 2. Reliable Fallback using textarea + execCommand('copy')
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        textArea.setAttribute('readonly', '');
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        if (navigator.userAgent.match(/ipad|iphone/i)) {
            const range = document.createRange();
            range.selectNodeContents(textArea);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            textArea.setSelectionRange(0, 999999);
        }

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
    } catch (err) {
        console.error('Fallback copy failed:', err);
        return false;
    }
};
