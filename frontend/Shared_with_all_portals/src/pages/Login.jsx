import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, Phone, ShieldCheck, UsersRound } from 'lucide-react';
import { Card } from '../components/UI';
import { Button, Field } from '../components/Shared';
import ThemeToggle from '../components/ThemeToggle';
import { useStore } from '../services/store';
import { useLoginFlow } from '../services/useLoginFlow';
import '../styles/login.css';

const roles = [
  ['farmer', 'Farmer Portal', 'Book tokens and track procurement', UsersRound],
  ['operator', 'Procurement Center', 'Manage queues and procurement', Building2],
  ['admin', 'Admin Portal', 'Oversee centers and operations', ShieldCheck],
];

function LoginField({ error, icon: Icon = UsersRound, ...props }) {
  return <div className="login-input-wrap">
    <Icon size={17} aria-hidden="true" />
    <Field {...props} aria-invalid={Boolean(error)} aria-describedby={error ? `${props.name}-error` : undefined} />
    {error && <p className="login-error" id={`${props.name}-error`} role="alert">{error}</p>}
  </div>;
}

function PasswordField({ label, name, error, ...props }) {
  const [visible, setVisible] = useState(false);
  return <div className="login-password-field">
    <LoginField label={label} name={name} error={error} icon={LockKeyhole} type={visible ? 'text' : 'password'} {...props} />
    <button className="linkish login-password-toggle" type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(value => !value)}>
      {visible ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  </div>;
}

function OtpForm({ auth }) {
  const { state, field, errors, loading, submit, back, resend, resendIn } = auth;
  return <form onSubmit={submit} noValidate aria-busy={loading}>
    <div className="otp-summary">
      <span>Logging in to</span><strong>{roles.find(([role]) => role === state.role)?.[1]}</strong>
      <small>{state.simulated ? 'Demo OTP auto-filled for your registered mobile number ending in ' : 'OTP sent to your registered mobile number ending in '}••••{state.mobileLastTwo}</small>
    </div>
    <Field label="Enter verification code" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" className="otp-input" maxLength={6} placeholder="• • • • • •" required autoFocus disabled={loading} {...field('otp')} aria-invalid={Boolean(errors.otp)} aria-describedby={errors.otp ? 'otp-error' : undefined} />
    {errors.otp && <p className="login-error" id="otp-error" role="alert">{errors.otp}</p>}
    {errors.form && <p className="login-error" role="alert">{errors.form}</p>}
    <Button type="submit" disabled={loading}>{loading ? 'Please wait…' : 'Verify OTP'}</Button>
    <div className="login-secondary-actions">
      <button type="button" className="linkish" onClick={back}>Back / Edit details</button>
      <button type="button" className="linkish" disabled={loading || resendIn > 0} onClick={resend}>{resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}</button>
    </div>
  </form>;
}

function CreateAccountForm({ onBack, auth }) {
  return <form onSubmit={event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    auth.register(Object.fromEntries(['username', 'password', 'aadhaar', 'phone', 'email'].map(name => [name, String(data.get(name) || '')])));
  }} aria-busy={auth.loading}>
    <div className="login-fields">
      <LoginField label="Username" name="username" type="text" autoComplete="username" pattern=".*\S.*" required />
      <PasswordField label="Password" name="password" autoComplete="new-password" minLength={8} title="Use at least 8 characters." required />
      <LoginField label="Aadhaar Number" name="aadhaar" icon={ShieldCheck} type="text" inputMode="numeric" autoComplete="off" pattern="[0-9]{12}" maxLength={12} title="Enter a valid 12-digit Aadhaar number." required />
      <LoginField label="Phone Number" name="phone" icon={Phone} type="tel" inputMode="numeric" autoComplete="tel-national" pattern="[6-9][0-9]{9}" maxLength={10} title="Enter a valid 10-digit Indian mobile number." required />
      <LoginField label="Email" name="email" icon={Mail} type="email" autoComplete="email" required />
    </div>
    {auth.errors.form && <p className="login-error" role="alert">{auth.errors.form}</p>}
    <Button type="submit" disabled={auth.loading}>{auth.loading ? 'Please wait…' : 'Create new account'}</Button>
    <div className="login-secondary-actions"><button type="button" className="linkish" onClick={onBack}>Back to login</button></div>
  </form>;
}

function AdminAadhaarAuth({ onSuccess, onBack }) {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('admin');
  const [aadhaarId, setAadhaarId] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoMessage, setDemoMessage] = useState('');

  const requestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/admin/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, aadhaar_id: aadhaarId.replace(/\s+/g, '') })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to request OTP');
      setDemoMessage(`Demo OTP: ${data.demo_otp} (UIDAI Sandbox Simulated)`);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/admin/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, aadhaar_id: aadhaarId.replace(/\s+/g, ''), otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid OTP');
      onSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAadhaarChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 12) val = val.substring(0, 12);
    let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    setAadhaarId(formatted);
  };

  return (
    <div>
      {step === 1 ? (
        <form onSubmit={requestOtp} noValidate aria-busy={loading}>
          <div className="login-fields">
            <LoginField label="Admin Username" name="username" type="text" value={username} onChange={e => setUsername(e.target.value)} required disabled={loading} />
            <LoginField label="Aadhaar ID" name="aadhaarId" icon={ShieldCheck} type="text" inputMode="numeric" autoComplete="off" placeholder="XXXX XXXX XXXX" value={aadhaarId} onChange={handleAadhaarChange} required disabled={loading} />
          </div>
          {error && <p className="login-error" role="alert">{error}</p>}
          <Button type="submit" disabled={loading || aadhaarId.replace(/\s+/g, '').length !== 12}>{loading ? 'Please wait…' : 'Generate OTP'}</Button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} noValidate aria-busy={loading}>
          {demoMessage && (
            <div style={{ background: '#dbeafe', color: '#1e40af', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '0.875rem' }}>
              <strong>{demoMessage}</strong>
            </div>
          )}
          <div className="otp-summary">
            <span>Verifying Aadhaar</span><strong>XXXX-XXXX-{aadhaarId.slice(-4)}</strong>
          </div>
          <div className="login-fields">
            <Field label="Enter OTP" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" className="otp-input" maxLength={6} placeholder="• • • • • •" required autoFocus disabled={loading} value={otp} onChange={e => setOtp(e.target.value)} />
          </div>
          {error && <p className="login-error" role="alert">{error}</p>}
          <Button type="submit" disabled={loading || otp.length !== 6}>{loading ? 'Please wait…' : 'Verify OTP & Enter Portal'}</Button>
          <div className="login-secondary-actions">
            <button type="button" className="linkish" onClick={() => setStep(1)}>Back</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function Login({ initialRole = 'farmer' }) {
  const [view, setView] = useState('login');
  const [showDirectReset, setShowDirectReset] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [resetPasswordStr, setResetPasswordStr] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const { login, toast } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useLoginFlow(location.state?.role || initialRole, account => {
    localStorage.setItem('krishi_user', JSON.stringify(account));
    localStorage.setItem('krishi_token', account.access_token);
    login({ role: account.role, name: account.full_name || account.username, username: account.username });
    
    if (account.role === 'farmer') {
      navigate('/farmer/dashboard', { replace: true });
    } else if (account.role === 'operator' || account.role === 'mandi') {
      navigate('/procurement-center', { replace: true });
    } else if (account.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else {
      navigate(`/${account.role}/dashboard`, { replace: true });
    }
  });
  const { state, errors, loading, field, submit, chooseRole, recover } = auth;
  const { role, step, flow } = state;
  const normalFarmer = role === 'farmer' && flow === 'login';
  const steps = view === 'create-account' && step !== 'otp-verification' ? ['Create account'] : normalFarmer ? ['Login'] : flow === 'forgot-password'
    ? ['Identity verification', 'OTP verification', 'Reset password']
    : [flow === 'login' ? 'Account details' : 'Identity verification', 'OTP verification'];
  const stepIndex = step === 'reset-password' ? 2 : step === 'otp-verification' ? 1 : 0;
  const title = step === 'otp-verification' ? 'Verify OTP' : view === 'create-account' ? 'Create new account' : flow === 'forgot-username' ? 'Recover Username' : flow === 'forgot-password' ? 'Reset Password' : 'Login to continue';

  return (
    <div className="login-page">
      <ThemeToggle className="login-theme-toggle" />
      <div className="login-story">
        <img className="login-brand-logo" src="/logo.png" alt="Krishi Kalyan logo" />
        <h1>Krishi Kalyan</h1>
        <span>ONE PLATFORM. EVERY HARVEST.</span>
        <h2>A secure step<br />before your portal.</h2>
        <p>Choose the correct role, confirm your contact details, and verify the SMS OTP to continue.</p>
        <div className="login-features">
          <span>✓ Role-based access</span><span>✓ Mobile verification</span><span>✓ Email Verification</span>
        </div>
        <div className="login-crops">🌾 🌾 🌾</div>
      </div>
      <Card className="login-card">
        <div className="login-card__heading">
          <div className="login-card__icon"><ShieldCheck size={22} aria-hidden="true" /></div>
          <div><h2>{title}</h2><p className="muted">{view === 'create-account' && step !== 'otp-verification' ? 'Enter your details to create a Farmer account.' : step === 'reset-password' ? 'Choose a new password with at least 8 characters.' : step === 'otp-verification' ? 'Enter the code sent to your registered mobile.' : normalFarmer ? 'Enter your username and password to continue.' : 'Verify your registered account details to continue.'}</p></div>
        </div>
        <ol className="login-steps" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label="Login progress">
          {steps.map((label, index) => <li key={label} className={index <= stepIndex ? 'is-active' : ''} aria-current={index === stepIndex ? 'step' : undefined}><span>{index < stepIndex ? <CheckCircle2 size={15} /> : index + 1}</span>{label}</li>)}
        </ol>
        <fieldset className="login-role-fieldset">
          <legend>Login as</legend>
          <div className="role-options login-role-options">
            {roles.map(([value, label, description, Icon]) => <button type="button" className={role === value ? 'selected' : ''} aria-pressed={role === value} key={value} onClick={() => { setView('login'); chooseRole(value); }}>
              <Icon size={21} aria-hidden="true" /><span><b>{label}</b><small>{description}</small></span>
              <span className="role-radio" aria-hidden="true">{role === value ? '●' : '○'}</span>
            </button>)}
          </div>
        </fieldset>
        {role === 'admin' ? (
          <AdminAadhaarAuth 
            onSuccess={(account) => {
              localStorage.setItem('krishi_user', JSON.stringify(account.user));
              localStorage.setItem('krishi_token', account.access_token);
              login({ role: account.role, name: account.user.username, username: account.user.username });
              navigate('/admin/dashboard', { replace: true });
            }}
            onBack={() => { chooseRole('farmer'); setView('login'); }}
          />
        ) : step === 'otp-verification' ? <OtpForm auth={auth} /> : view === 'create-account' ? <CreateAccountForm auth={auth} onBack={() => { chooseRole('farmer'); setView('login'); }} /> : <form onSubmit={submit} noValidate aria-busy={loading} key={`${role}-${flow}-${step}`}>
          <div className="login-fields">
            {step === 'credentials' && <LoginField label={role === 'operator' ? 'Center ID' : 'Username'} name="identifier" type="text" autoComplete="username" required disabled={loading} error={errors.identifier} {...field('identifier')} />}
            {normalFarmer || step === 'reset-password' ? <>
              <PasswordField label={step === 'reset-password' ? 'New Password' : 'Password'} name="password" autoComplete={step === 'reset-password' ? 'new-password' : 'current-password'} required disabled={loading} error={errors.password} {...field('password')} />
              {step === 'reset-password' && <PasswordField label="Confirm New Password" name="confirm" autoComplete="new-password" required disabled={loading} error={errors.confirm} {...field('confirm')} />}
            </> : <LoginField label="Aadhaar Number" name="aadhaar" icon={ShieldCheck} type="text" inputMode="numeric" autoComplete="off" maxLength={12} required disabled={loading} error={errors.aadhaar} {...field('aadhaar')} />}
          </div>
          {normalFarmer && <div className="login-secondary-actions login-recovery-actions">
            <button type="button" className="linkish" onClick={() => recover('forgot-username')}>Forgot username?</button>
            <button type="button" className="linkish" onClick={() => setShowDirectReset(true)}>Forgot password? (Password bhool gaye?)</button>
          </div>}
          {errors.form && <p className="login-error" role="alert">{errors.form}</p>}
          <Button type="submit" disabled={loading}>{loading ? 'Please wait…' : step === 'reset-password' ? 'Reset Password' : normalFarmer ? 'Login' : flow === 'login' ? 'Send OTP' : 'Continue'}</Button>
        </form>}
        {view === 'login' && normalFarmer && <div className="login-secondary-actions"><button type="button" className="linkish" onClick={() => { chooseRole('farmer'); setView('create-account'); }}>Create new account</button></div>}
        {flow !== 'login' && <div className="login-secondary-actions"><button type="button" className="linkish" onClick={() => { chooseRole('farmer'); setView('login'); }}>Back to login</button></div>}
        {showDirectReset && (
          <div className="login-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <Card className="login-card" style={{ zIndex: 1001, background: 'var(--surface)', margin: '1rem', width: '100%', maxWidth: '400px' }}>
              <div className="login-card__heading">
                <div className="login-card__icon"><ShieldCheck size={22} aria-hidden="true" /></div>
                <div><h2>Reset Password</h2><p className="muted">Enter your phone number and a new password.</p></div>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setResetLoading(true);
                setResetError('');
                try {
                  const res = await fetch('/api/v1/auth/portal/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone_number: resetPhone, new_password: resetPasswordStr })
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.detail || 'Reset failed');
                  toast('Password successfully updated. Please login.');
                  setShowDirectReset(false);
                  setResetPhone('');
                  setResetPasswordStr('');
                } catch (err) {
                  setResetError(err.message);
                } finally {
                  setResetLoading(false);
                }
              }}>
                <div className="login-fields">
                  <LoginField label="Phone Number" name="resetPhone" value={resetPhone} onChange={e => setResetPhone(e.target.value)} icon={Phone} type="tel" inputMode="numeric" required />
                  <PasswordField label="New Password" name="resetPassword" value={resetPasswordStr} onChange={e => setResetPasswordStr(e.target.value)} minLength={8} required />
                </div>
                {resetError && <p className="login-error" role="alert">{resetError}</p>}
                <Button type="submit" disabled={resetLoading}>{resetLoading ? 'Please wait...' : 'Update Password'}</Button>
                <div className="login-secondary-actions">
                  <button type="button" className="linkish" onClick={() => setShowDirectReset(false)}>Cancel</button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}
