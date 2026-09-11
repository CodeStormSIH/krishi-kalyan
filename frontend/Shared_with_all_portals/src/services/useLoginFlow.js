import { useEffect, useRef, useState } from 'react';
import { AuthError, authErrorMessage, autofilledOtp, loginAuth, safeAccount, safeChallenge } from './loginAuth';

/**
 * @typedef {import('./loginAuth').LoginRole} LoginRole
 * @typedef {import('./loginAuth').AuthFlow} AuthFlow
 * @typedef {{role: LoginRole, flow: 'login', step: 'credentials'} |
 * {role: 'farmer', flow: 'forgot-username'|'forgot-password', step: 'identity-verification'} |
 * {role: LoginRole, flow: AuthFlow, step: 'otp-verification', challengeId: string, mobileLastTwo: string, resendAt: number} |
 * {role: 'farmer', flow: 'forgot-password', step: 'reset-password', resetToken: string}} AuthState
 */
const emptyFields = () => ({ identifier: '', aadhaar: '', password: '', confirm: '', otp: '' });
export function useLoginFlow(initialRole, onAuthenticated, service = loginAuth) {
  /** @type {[AuthState, Function]} */
  const [state, setState] = useState({ role: ['farmer', 'operator', 'admin'].includes(initialRole) ? initialRole : 'farmer', flow: 'login', step: 'credentials' });
  const [fields, setFields] = useState(emptyFields);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const generation = useRef(0);
  const busy = useRef(false);
  useEffect(() => () => { generation.current += 1; }, []);
  useEffect(() => {
    if (state.step !== 'otp-verification') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state.step]);

  function changeState(next) {
    generation.current += 1;
    busy.current = false;
    setLoading(false);
    setFields(emptyFields());
    setErrors({});
    setState(next);
  }
  function chooseRole(role) { changeState({ role, flow: 'login', step: 'credentials' }); }
  function recover(flow) { changeState({ role: 'farmer', flow, step: 'identity-verification' }); }
  function back() {
    if (state.flow === 'login' || state.flow === 'register') chooseRole(state.role);
    else recover(state.flow);
  }
  function field(name) {
    return { value: fields[name], onChange: event => {
      let value = event.target.value;
      if (name === 'aadhaar' || name === 'otp') value = value.replace(/\D/g, '').slice(0, name === 'otp' ? 6 : 12);
      setFields(current => ({ ...current, [name]: value }));
      setErrors(current => ({ ...current, [name]: '', form: '' }));
    } };
  }
  async function run(action) {
    if (busy.current) return;
    busy.current = true;
    const version = generation.current;
    setLoading(true);
    setErrors({});
    try {
      const commit = await action();
      if (version === generation.current) commit();
    } catch (error) {
      if (version === generation.current) setErrors({ form: authErrorMessage(error) });
    } finally {
      if (version === generation.current) { busy.current = false; setLoading(false); }
    }
  }
  function complete(response) {
    const account = safeAccount(response, state.role);
    return () => { setFields(emptyFields()); onAuthenticated(account); };
  }
  function enterOtp(response, flow = state.flow) {
    const challenge = safeChallenge(response);
    const otp = autofilledOtp(response);
    return () => { setFields({ ...emptyFields(), otp }); setNow(Date.now());
      setState({ role: state.role, flow, step: 'otp-verification', ...challenge, simulated: Boolean(otp) }); };
  }
  async function register(details) {
    if (state.role !== 'farmer' || state.flow !== 'login') return;
    await run(async () => enterOtp(await service.registerFarmer(details), 'register'));
  }
  async function submit(event) {
    event.preventDefault();
    if (busy.current) return;
    const validation = {};
    const normalFarmer = state.role === 'farmer' && state.flow === 'login';
    if (state.step === 'credentials' || state.step === 'identity-verification') {
      if (state.step === 'credentials' && !fields.identifier.trim()) validation.identifier = state.role === 'operator' ? 'Enter your Center ID.' : 'Enter your username.';
      if (normalFarmer) {
        if (!fields.password) validation.password = 'Enter your password.';
      } else if (!/^\d{12}$/.test(fields.aadhaar)) validation.aadhaar = 'Enter a valid 12-digit Aadhaar number.';
    } else if (state.step === 'otp-verification') {
      if (!/^\d{6}$/.test(fields.otp)) validation.otp = 'Enter a valid 6-digit verification code.';
    } else {
      if (fields.password.length < 8) validation.password = 'Use at least 8 characters.';
      if (!fields.confirm) validation.confirm = 'Confirm your new password.';
      else if (fields.password !== fields.confirm) validation.confirm = 'Passwords do not match.';
    }
    if (Object.keys(validation).length) { setErrors(validation); return; }
    await run(async () => {
      if (state.step === 'reset-password') return complete(await service.resetPassword(state.resetToken, fields.password));
      if (state.step === 'otp-verification') {
        const response = await service.verifyOtp(state.challengeId, fields.otp);
        if (state.flow !== 'forgot-password') return complete(response);
        if (typeof response?.resetToken !== 'string' || !response.resetToken) throw new AuthError('INVALID_RESPONSE');
        return () => changeState({ role: 'farmer', flow: 'forgot-password', step: 'reset-password', resetToken: response.resetToken });
      }
      if (normalFarmer) return complete(await service.loginFarmer(fields.identifier.trim(), fields.password));
      return enterOtp(await service.requestIdentity({ role: state.role, flow: state.flow, identifier: fields.identifier.trim(), aadhaar: fields.aadhaar }));
    });
  }
  async function resend() {
    if (state.step !== 'otp-verification' || Date.now() < state.resendAt) return;
    await run(async () => {
      return enterOtp(await service.resendOtp(state.challengeId));
    });
  }
  return { state, fields, errors, loading, field, submit, register, resend, chooseRole, recover, back,
    resendIn: state.step === 'otp-verification' ? Math.max(0, Math.ceil((state.resendAt - now) / 1000)) : 0 };
}
