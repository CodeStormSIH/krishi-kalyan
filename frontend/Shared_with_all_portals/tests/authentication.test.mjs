import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { AuthError, autofilledOtp, loginAuth, safeAccount, safeChallenge } from '../src/services/loginAuth.js';
import { api } from '../src/services/api.js';

const require = createRequire(import.meta.url);
let slots, cursor, authenticated, service, calls;
const hooks = {
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
  },
  useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
  useEffect() {},
};
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/services/useLoginFlow.js', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'boundary', setup(build) {
    build.onResolve({ filter: /loginAuth$/ }, args => ({ path: args.path, external: true }));
  } }],
});
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(id => {
  if (id === 'react') return hooks;
  if (id.endsWith('loginAuth')) return { AuthError, autofilledOtp, loginAuth, safeAccount, safeChallenge, authErrorMessage: error => ({ INVALID_OTP: 'Incorrect verification code.', EXPIRED_OTP: 'Verification code has expired.' })[error.code] || 'Unable to complete authentication.' };
  return require(id);
}, module, module.exports);
const { useLoginFlow } = module.exports;
const render = (role = 'farmer') => { cursor = 0; return useLoginFlow(role, account => authenticated.push(account), service); };
const set = (name, value) => render().field(name).onChange({ target: { value } });
const submit = () => render().submit({ preventDefault() {} });
// Synthetic service responses exist only in tests, never in application code.
const account = role => ({ access_token: 'test-token', user_id: 'test-user', role, username: 'test-user' });
const challenge = () => ({ challengeId: 'test-challenge', mobileLastTwo: '42', resendAfterSeconds: 30 });
beforeEach(() => {
  slots = []; cursor = 0; authenticated = []; calls = [];
  api.portalAuth = async () => { throw new Error('Test backend unavailable'); };
  service = {
    loginFarmer: async (...args) => { calls.push(['login', ...args]); return account('farmer'); },
    requestIdentity: async details => { calls.push(['identity', details]); return challenge(); },
    verifyOtp: async (...args) => { calls.push(['verify', ...args]); return account(render().state.role); },
    resendOtp: async (...args) => { calls.push(['resend', ...args]); return challenge(); },
    resetPassword: async (...args) => { calls.push(['reset', ...args]); return account('farmer'); },
  };
});

test('every authentication API operation fails closed on backend failure', async () => {
  const original = api.portalAuth;
  api.portalAuth = async () => { throw new Error('offline'); };
  try {
    for (const operation of Object.values(loginAuth)) await assert.rejects(operation(), error => error.code === 'UNAVAILABLE');
  } finally { api.portalAuth = original; }
});
test('server simulation OTP auto-fills for staff, is verified through the backend, and never accepts SMS codes from a response', async () => {
  for (const role of ['admin', 'operator']) {
    render().chooseRole(role);
    service.requestIdentity = async () => ({ ...challenge(), delivery_method: 'SIMULATED', dev_otp: '000123' });
    set('identifier', 'test-staff'); set('aadhaar', '000000000000'); await submit();
    assert.equal(render().fields.otp, '000123'); assert.equal(authenticated.length, role === 'admin' ? 0 : 1);
    await submit(); assert.equal(authenticated.at(-1).role, role);
    assert.deepEqual(calls.at(-1), ['verify', 'test-challenge', '000123']);
  }
  assert.equal(autofilledOtp({ delivery_method: 'SMS', dev_otp: '000123' }), '');
  assert.equal(autofilledOtp({ delivery_method: 'SIMULATED', dev_otp: '123' }), '');
});
test('farmer registration advances to the shared OTP screen and requires backend verification', async () => {
  const details = { username: 'test', password: 'test-password', aadhaar: '000000000000', phone: '9000000000', email: 'test@example.test' };
  service.registerFarmer = async payload => { calls.push(['register', payload]); return { ...challenge(), delivery_method: 'SIMULATED', dev_otp: '000123' }; };
  await render().register(details);
  assert.deepEqual(calls[0], ['register', details]);
  assert.equal(render().state.flow, 'register');
  assert.equal(render().fields.password, '');
  assert.equal(authenticated.length, 0);
  await submit(); assert.equal(authenticated[0].role, 'farmer');
});
test('farmer credentials authenticate directly; blank fields and unavailable services never authenticate', async () => {
  await submit(); assert.equal(calls.length, 0);
  set('identifier', 'farmer'); set('password', 'test-password');
  service.loginFarmer = loginAuth.loginFarmer;
  await submit(); assert.equal(authenticated.length, 0); assert.ok(render().errors.form);
  service.loginFarmer = async () => account('farmer');
  await submit(); assert.equal(authenticated.length, 1);
  assert.ok(Object.values(render().fields).every(value => value === ''));
  assert.equal(render().state.step, 'credentials');
});
test('admin and procurement validate identifier and Aadhaar and share the OTP flow', async () => {
  for (const role of ['admin', 'operator']) {
    render().chooseRole(role);
    set('identifier', 'test-identifier'); set('aadhaar', '123');
    await submit(); assert.ok(render().errors.aadhaar);
    set('aadhaar', '0000 0000 0000'); await submit();
    assert.equal(render().state.step, 'otp-verification');
    assert.equal(render().state.mobileLastTwo, '42');
    assert.equal(render().fields.aadhaar, '');
    set('otp', '000000'); await submit();
    assert.equal(authenticated.at(-1).role, role);
  }
});
test('duplicate sends are prevented and a stale identity response cannot undo a role switch', async () => {
  let release;
  service.requestIdentity = () => { calls.push('identity'); return new Promise(resolve => { release = resolve; }); };
  render().chooseRole('admin'); set('identifier', 'test-admin'); set('aadhaar', '000000000000');
  const pending = submit(); await submit(); assert.equal(calls.length, 1);
  render().chooseRole('farmer'); release(challenge()); await pending;
  assert.equal(render().state.role, 'farmer'); assert.equal(render().state.step, 'credentials');
  assert.equal(authenticated.length, 0); assert.ok(Object.values(render().fields).every(value => value === ''));
});
test('switching roles discards passwords and ignores a pending login success', async () => {
  let release;
  service.loginFarmer = () => new Promise(resolve => { release = resolve; });
  set('identifier', 'farmer'); set('password', 'test-password');
  const pending = submit(); render().chooseRole('operator');
  assert.equal(render().fields.password, '');
  release(account('farmer')); await pending; assert.equal(authenticated.length, 0);
});
test('username recovery authenticates only after OTP; invalid and expired OTP stay inline', async () => {
  render().recover('forgot-username'); set('aadhaar', '000000000000'); await submit();
  assert.equal(calls[0][1].flow, 'forgot-username'); assert.equal(authenticated.length, 0);
  set('otp', '000000');
  for (const code of ['INVALID_OTP', 'EXPIRED_OTP']) {
    service.verifyOtp = async () => { throw new AuthError(code); };
    await submit(); assert.equal(authenticated.length, 0); assert.ok(render().errors.form);
  }
  service.verifyOtp = async () => account('farmer');
  await submit(); assert.equal(authenticated[0].username, 'test-user');
});
test('password reset requires a server grant and matching policy-compliant passwords', async () => {
  render().recover('forgot-password'); set('aadhaar', '000000000000'); await submit();
  set('otp', '000000');
  service.verifyOtp = async () => ({});
  await submit(); assert.equal(render().state.step, 'otp-verification');
  service.verifyOtp = async () => ({ resetToken: 'test-reset-grant' });
  await submit(); assert.equal(render().state.step, 'reset-password'); assert.equal(authenticated.length, 0);
  await submit(); assert.ok(render().errors.password); assert.ok(render().errors.confirm);
  set('password', 'new-test-password'); set('confirm', 'different'); await submit(); assert.ok(render().errors.confirm);
  set('confirm', 'new-test-password'); await submit();
  assert.deepEqual(calls.at(-1), ['reset', 'test-reset-grant', 'new-test-password']);
  assert.equal(authenticated.length, 1);
});
test('resend enforces cooldown, prevents duplicate requests, and rotates the challenge', async () => {
  render().recover('forgot-username'); set('aadhaar', '000000000000'); await submit();
  await render().resend(); assert.equal(calls.length, 1);
  const originalNow = Date.now;
  Date.now = () => originalNow() + 60000;
  try {
    let release;
    service.resendOtp = () => { calls.push(['resend']); return new Promise(resolve => { release = resolve; }); };
    const pending = render().resend(); await render().resend(); assert.equal(calls.length, 2);
    release({ ...challenge(), challengeId: 'rotated' }); await pending;
    assert.equal(render().state.challengeId, 'rotated'); assert.ok(render().resendIn > 0);
  } finally { Date.now = originalNow; }
});
test('response guards reject wrong roles and full phones, and strip sensitive data', () => {
  assert.throws(() => safeAccount(account('farmer'), 'admin'));
  assert.throws(() => safeAccount({ ...account('admin'), access_token: '' }, 'admin'));
  assert.throws(() => safeChallenge({ ...challenge(), mobileLastTwo: '0000000042' }));
  const safe = safeAccount({ ...account('farmer'), aadhaar: '000000000000', password: 'secret', otp: '000000', phone_number: '0000000042', resetToken: 'secret' }, 'farmer');
  for (const key of ['aadhaar', 'password', 'otp', 'phone_number', 'resetToken']) assert.equal(key in safe, false);
});
