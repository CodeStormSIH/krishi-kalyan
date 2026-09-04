import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Mail, Phone, ShieldCheck, Smartphone, UsersRound, Wheat } from 'lucide-react';
import { Card } from '../components/UI';
import { Button, Field } from '../components/Shared';
import { useStore } from '../services/store';
import '../styles/login.css';

export const DEMO_OTP = '123456';

const roles = [
  ['farmer', 'Farmer Portal', 'Book tokens and track procurement', UsersRound],
  ['operator', 'Procurement Center', 'Manage queues and procurement', Building2],
  ['admin', 'Admin Portal', 'Oversee centers and operations', ShieldCheck],
];

const portalLabel = role => roles.find(([value]) => value === role)?.[1] || 'Portal';
const maskPhone = phone => phone ? `+91 ••••••${phone.slice(-4)}` : '';

export default function Login({ initialRole = 'farmer' }) {
  const { login, session } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState(location.state?.role || initialRole);
  const [credentials, setCredentials] = useState({ email: '', phone: '' });
  const [step, setStep] = useState('details');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (step !== 'otp' || resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn(seconds => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [step, resendIn]);

  if (session) return <Navigate to={`/${session.role}/dashboard`} replace />;

  const field = name => ({
    value: credentials[name],
    onChange: event => setCredentials(current => ({ ...current, [name]: event.target.value })),
  });

  function sendOtp(event) {
    event.preventDefault();
    setError('');
    setOtp('');
    setResendIn(30);
    setStep('otp');
  }

  function verifyOtp(event) {
    event.preventDefault();
    if (otp !== DEMO_OTP) {
      setError('Incorrect OTP. For this frontend demo, use 123456.');
      return;
    }
    login({
      role,
      email: credentials.email.trim().toLowerCase(),
      phone: credentials.phone,
    });
    navigate(`/${role}/dashboard`, { replace: true });
  }

  function chooseRole(value) {
    setRole(value);
    setStep('details');
    setOtp('');
    setError('');
  }

  return (
    <div className="login-page">
      <div className="login-story">
        <img className="login-brand-logo" src="/logo.png" alt="Krishi Kalyan logo" width="250"/>
          <h1>Krishi Kalyan</h1>
        <span>ONE PLATFORM. EVERY HARVEST.</span>
        <h2>A secure step<br />before your portal.</h2>
        <p>Choose the correct role, confirm your contact details, and verify the simulated OTP to continue.</p>
        <div className="login-features">
          <span>✓ Role-based access</span><span>✓ Mobile verification</span><span>✓ Frontend demonstration</span>
        </div>
        <div className="login-crops">🌾 🌾 🌾</div>
      </div>

      <Card className="login-card">
        <div className="login-card__heading">
          <div className="login-card__icon"><ShieldCheck size={22} aria-hidden="true" /></div>
          <div>
            <h2>{step === 'details' ? 'Login to continue' : 'Verify OTP'}</h2>
            <p className="muted">{step === 'details'
              ? 'Your portal opens only after frontend verification.'
              : `Code sent to ${maskPhone(credentials.phone)}`}</p>
          </div>
        </div>

        <ol className="login-steps" aria-label="Login progress">
          <li className="is-active"><span>{step === 'otp' ? <CheckCircle2 size={15} /> : '1'}</span>Account details</li>
          <li className={step === 'otp' ? 'is-active' : ''}><span>2</span>OTP verification</li>
        </ol>

        {step === 'details' ? (
          <form onSubmit={sendOtp}>
            <fieldset className="login-role-fieldset">
              <legend>Login as</legend>
              <div className="role-options login-role-options">
                {roles.map(([value, label, description, Icon]) => (
                  <button
                    type="button"
                    className={role === value ? 'selected' : ''}
                    aria-pressed={role === value}
                    key={value}
                    onClick={() => chooseRole(value)}
                  >
                    <Icon size={21} aria-hidden="true" />
                    <span><b>{label}</b><small>{description}</small></span>
                    <span className="role-radio" aria-hidden="true">{role === value ? '●' : '○'}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="login-fields">
              <div className="login-input-wrap">
                <Mail size={17} aria-hidden="true" />
                <Field label="Email address" name="email" type="email" autoComplete="email" placeholder="name@example.com" required {...field('email')} />
              </div>
              <div className="login-input-wrap">
                <Phone size={17} aria-hidden="true" />
                <Field
                  label="Mobile number"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="10-digit mobile number"
                  pattern="[6-9][0-9]{9}"
                  title="Enter a valid 10-digit Indian mobile number"
                  maxLength={10}
                  required
                  {...field('phone')}
                  onChange={event => setCredentials(current => ({
                    ...current,
                    phone: event.target.value.replace(/\D/g, '').slice(0, 10),
                  }))}
                />
              </div>
            </div>

            <Button type="submit"><Smartphone size={17} />Send OTP</Button>
            <p className="login-privacy">Frontend demo only. No email, phone number, or OTP is sent to an external service.</p>
          </form>
        ) : (
          <form onSubmit={verifyOtp}>
            <div className="otp-summary">
              <span>Logging in to</span><strong>{portalLabel(role)}</strong>
              <small>{credentials.email} · {maskPhone(credentials.phone)}</small>
            </div>
            <Field
              label="Enter 6-digit OTP"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="otp-input"
              value={otp}
              onChange={event => {
                setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="• • • • • •"
              autoFocus
              required
            />
            <div className="demo-otp" role="note"><ShieldCheck size={17} />Frontend demo OTP: <strong>{DEMO_OTP}</strong></div>
            {error && <p className="login-error" role="alert">{error}</p>}
            <Button type="submit" disabled={otp.length !== 6}>Verify OTP & Enter Portal</Button>
            <div className="login-secondary-actions">
              <button type="button" className="linkish" onClick={() => { setStep('details'); setError(''); }}>Change details</button>
              <button
                type="button"
                className="linkish"
                disabled={resendIn > 0}
                onClick={() => { setOtp(''); setError(''); setResendIn(30); }}
              >
                {resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
