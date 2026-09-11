import { api } from './api.js';
// Portal authentication uses the existing request transport and SMS gateways.
// The backend owns identities, password hashes, OTP challenges and reset grants.
/** @typedef {'farmer'|'operator'|'admin'} LoginRole */
/** @typedef {'login'|'forgot-username'|'forgot-password'|'register'} AuthFlow */
/** @typedef {string} AadhaarNumber */
/** @typedef {{challengeId: string, mobileLastTwo: string, resendAfterSeconds: number, dev_otp?: string, delivery_method?: string}} Challenge */
/** @typedef {{access_token: string, role: LoginRole, user_id: string, username: string, full_name?: string}} AuthenticatedAccount */
/** @typedef {{resetToken: string}} ResetGrant */
/**
 * Backend requirements:
 * - requestIdentity: validate role/account/Aadhaar association, send SMS to the
 *   registered phone, return an opaque challenge bound to that role and flow.
 * - resendOtp: enforce cooldown, rotate code, return fresh challenge metadata.
 * - verifyOtp: enforce expiry/attempt limits; return an authenticated account
 *   (including recovered username) or a short-lived single-use reset grant.
 * - resetPassword: validate/consume the grant, enforce password policy, update
 *   the password, and return an authenticated farmer account.
 * Never return Aadhaar, full phone, or passwords in these responses.
 * Only development/test simulated SMS responses include dev_otp for auto-fill.
 * Normalize server errors to AuthError codes; never render raw server messages.
 * Existing UI password policy is at least 8 characters; backend must enforce it.
 *
 * @typedef {Object} LoginAuthService
 * @property {(username: string, password: string) => Promise<AuthenticatedAccount>} loginFarmer
 * @property {(details: {username: string, password: string, aadhaar: string, phone: string, email: string}) => Promise<Challenge>} registerFarmer
 * @property {(details: {role: LoginRole, flow: AuthFlow, identifier: string, aadhaar: AadhaarNumber}) => Promise<Challenge>} requestIdentity
 * @property {(challengeId: string) => Promise<Challenge>} resendOtp
 * @property {(challengeId: string, otp: string) => Promise<AuthenticatedAccount|ResetGrant>} verifyOtp
 * @property {(resetToken: string, password: string) => Promise<AuthenticatedAccount>} resetPassword
 */
export class AuthError extends Error {
  constructor(code) { super(code); this.code = code; }
}
async function call(operation, payload) {
  try { return await api.portalAuth(operation, payload); }
  catch (error) { throw new AuthError(error.code || 'UNAVAILABLE'); }
}
/** @type {LoginAuthService} */
export const loginAuth = {
  loginFarmer: (username, password) => call('login', { username, password }),
  registerFarmer: details => call('register', details),
  requestIdentity: details => call('identity', details),
  resendOtp: challengeId => call('resend', { challengeId }),
  verifyOtp: (challengeId, otp) => call('verify', { challengeId, otp }),
  resetPassword: (resetToken, password) => call('reset-password', { resetToken, password }),
};

export function authErrorMessage(error) {
  const messages = {
    UNAVAILABLE: 'This authentication service is not available yet. Please try again later.',
    INVALID_CREDENTIALS: 'Username or password is incorrect.',
    INVALID_IDENTITY: 'Unable to verify an account with these details.',
    INVALID_OTP: 'Incorrect verification code.',
    EXPIRED_OTP: 'Verification code has expired. Request a new code.',
    EXPIRED_RESET: 'Password reset verification has expired. Please start again.',
    RATE_LIMITED: 'Too many attempts. Please wait before trying again.',
    PASSWORD_POLICY: 'Password does not meet the required password policy.',
    ACCOUNT_UNAVAILABLE: 'Unable to create an account with these details. Try logging in or recovering your account.',
  };
  return error instanceof AuthError && Object.hasOwn(messages, error.code)
    ? messages[error.code] : 'Unable to complete authentication. Please try again.';
}

export function autofilledOtp(response) {
  // Only server-issued simulation codes may be filled; no generated fallback.
  return response?.delivery_method === 'SIMULATED' && typeof response.dev_otp === 'string' && /^\d{6}$/.test(response.dev_otp) ? response.dev_otp : '';
}

export function safeChallenge(response) {
  if (!response || typeof response.challengeId !== 'string' || !response.challengeId ||
      !/^\d{2}$/.test(response.mobileLastTwo) || typeof response.mobileLastTwo !== 'string' ||
      !Number.isInteger(response.resendAfterSeconds) || response.resendAfterSeconds < 0) {
    throw new AuthError('INVALID_RESPONSE');
  }
  return { challengeId: response.challengeId, mobileLastTwo: response.mobileLastTwo,
    resendAt: Date.now() + Math.max(30, response.resendAfterSeconds) * 1000 };
}

export function safeAccount(response, role) {
  if (!response || response.role?.toLowerCase() !== role ||
      typeof response.access_token !== 'string' || !response.access_token.trim() ||
      typeof response.user_id !== 'string' || !response.user_id ||
      typeof response.username !== 'string' || !response.username) {
    throw new AuthError('INVALID_RESPONSE');
  }
  // Explicit allowlist: never persist identity/OTP/reset response payloads.
  return { access_token: response.access_token, role, user_id: response.user_id,
    username: response.username, full_name: typeof response.full_name === 'string' ? response.full_name : '' };
}
