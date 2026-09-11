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

export default function Login({ initialRole = 'farmer' }) {
  const [view, setView] = useState('login');
  const { login } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useLoginFlow(location.state?.role || initialRole, account => {
    localStorage.setItem('krishi_user', JSON.stringify(account));
    localStorage.setItem('krishi_token', account.access_token);
    login({ role: account.role, name: account.full_name || account.username, username: account.username });
    navigate(`/${account.role}/dashboard`, { replace: true });
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
        {step === 'otp-verification' ? <OtpForm auth={auth} /> : view === 'create-account' ? <CreateAccountForm auth={auth} onBack={() => { chooseRole('farmer'); setView('login'); }} /> : <form onSubmit={submit} noValidate aria-busy={loading} key={`${role}-${flow}-${step}`}>
          <div className="login-fields">
            {step === 'credentials' && <LoginField label={role === 'operator' ? 'Center ID' : 'Username'} name="identifier" type="text" autoComplete="username" required disabled={loading} error={errors.identifier} {...field('identifier')} />}
            {normalFarmer || step === 'reset-password' ? <>
              <PasswordField label={step === 'reset-password' ? 'New Password' : 'Password'} name="password" autoComplete={step === 'reset-password' ? 'new-password' : 'current-password'} required disabled={loading} error={errors.password} {...field('password')} />
              {step === 'reset-password' && <PasswordField label="Confirm New Password" name="confirm" autoComplete="new-password" required disabled={loading} error={errors.confirm} {...field('confirm')} />}
            </> : <LoginField label="Aadhaar Number" name="aadhaar" icon={ShieldCheck} type="text" inputMode="numeric" autoComplete="off" maxLength={12} required disabled={loading} error={errors.aadhaar} {...field('aadhaar')} />}
          </div>
          {normalFarmer && <div className="login-secondary-actions login-recovery-actions">
            <button type="button" className="linkish" onClick={() => recover('forgot-username')}>Forgot username?</button>
            <button type="button" className="linkish" onClick={() => recover('forgot-password')}>Forgot password?</button>
          </div>}
          {errors.form && <p className="login-error" role="alert">{errors.form}</p>}
          <Button type="submit" disabled={loading}>{loading ? 'Please wait…' : step === 'reset-password' ? 'Reset Password' : normalFarmer ? 'Login' : flow === 'login' ? 'Send OTP' : 'Continue'}</Button>
        </form>}
        {view === 'login' && normalFarmer && <div className="login-secondary-actions"><button type="button" className="linkish" onClick={() => { chooseRole('farmer'); setView('create-account'); }}>Create new account</button></div>}
        {flow !== 'login' && <div className="login-secondary-actions"><button type="button" className="linkish" onClick={() => { chooseRole('farmer'); setView('login'); }}>Back to login</button></div>}
      </Card>
    </div>
  );
}
