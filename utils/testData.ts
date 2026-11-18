/** Records are named so they are easy to find and delete by hand afterwards. */
export const uniqueName = (prefix = 'QA-AUTO') => `${prefix} ${new Date().toISOString().replace(/[:.]/g, '-')}`;

// Top suggestion for this one is a different place, so the typed value survives (see SLG-01).
export const SAFE_ADDRESS = '999 Nonexistent Builder Lane, Denver, CO 80202';
