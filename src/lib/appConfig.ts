/**
 * Public web URL of Splitley. Use this for links shared outside the app
 * (referral links, emails). window.location.origin is wrong inside the
 * Capacitor WebView, where it is https://localhost.
 */
export const APP_WEB_URL = 'https://splitley.com';

export const PRIVACY_POLICY_URL = `${APP_WEB_URL}/privacy`;
