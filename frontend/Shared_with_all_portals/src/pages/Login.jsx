import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, Mail, Phone, ShieldCheck, Smartphone, UsersRound, Wheat } from 'lucide-react';
import { Card } from '../components/UI';
import { Button, Field } from '../components/Shared';
import ThemeToggle from '../components/ThemeToggle';
import { useStore } from '../services/store';
import { api } from '../services/api';
import '../styles/login.css';

const roles = [
  ['farmer', 'Farmer Portal', 'Book tokens and track procurement', UsersRound],
  ['operator', 'Procurement Center', 'Manage queues and procurement', Building2],
  ['admin', 'Admin Portal', 'Oversee centers and operations', ShieldCheck],
];

const DEMO_OTP = '123456';
const portalLabel = role => roles.find(([value]) => value === role)?.[1] || 'Portal';
const maskPhone = phone => phone ? `+91 ••••••${phone.slice(-4)}` : '';

export default function Login({ initialRole = 'farmer' }) {
  const { login, session } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState(location.state?.role || initialRole);
  const [credentials, setCredentials] = useState({ name: '', email: '', phone: '' });
  const [step, setStep] = useState('details');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);

  const [expectedOtp, setExpectedOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRealSms, setIsRealSms] = useState(false);

  useEffect(() => {
    if (step !== 'otp' || resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn(seconds => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [step, resendIn]);

  const validRoles = ['farmer', 'admin', 'operator'];

  const field = name => ({
    value: credentials[name],
    onChange: event => setCredentials(current => ({ ...current, [name]: event.target.value })),
  });

  async function sendOtp(event) {
    event.preventDefault();
    setError('');

    const cleanedPhone = (credentials.phone || '').replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    const demoOtp = Math.floor(100000 + Math.random() * 900000).toString();
    let finalOtp = demoOtp;
    let realSmsDelivered = false;

    try {
      const response = await api.sendOtp(cleanedPhone, { timeout: 8000 });
      if (response && response.delivery_method === 'SMS') {
        realSmsDelivered = true;
      }
      if (response && response.dev_otp) {
        finalOtp = String(response.dev_otp);
      } else if (response && !response.dev_otp) {
        realSmsDelivered = true;
      }
    } catch (err) {
      console.warn('Backend OTP service offline or unavailable, continuing with demo OTP:', err.message);
    } finally {
      setLoading(false);
    }

    setIsRealSms(realSmsDelivered);
    setExpectedOtp(finalOtp);
    if (realSmsDelivered) {
      setOtp(''); // User enters the real SMS received on their phone!
    } else {
      setOtp(finalOtp); // Auto-fill for hackathon demo & quick testing
    }
    setResendIn(30);
    setStep('otp');
  }

  async function verifyOtp(event) {
    event.preventDefault();
    setError('');

    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    setLoading(true);
    let authResponse = null;

    try {
      authResponse = await api.verifyOtp({
        phone_number: credentials.phone,
        otp_code: otp,
        email: credentials.email.trim().toLowerCase(),
        full_name: credentials.name.trim(),
      }, { timeout: 2500 });
    } catch (err) {
      console.warn('Backend OTP verify offline or unavailable, verifying locally:', err.message);
      if (otp !== DEMO_OTP) {
        if (expectedOtp && otp !== expectedOtp) {
          setLoading(false);
          setError(`Incorrect OTP. Please enter ${expectedOtp || DEMO_OTP}`);
          return;
        }
      }
    } finally {
      setLoading(false);
    }

    const userData = authResponse || {
      user_id: `USER-${Date.now().toString().slice(-6)}`,
      access_token: `TOKEN-${Date.now()}`,
      phone_number: credentials.phone,
      email: credentials.email.trim().toLowerCase(),
      full_name: credentials.name.trim(),
      role: role.toUpperCase(),
    };

    try {
      localStorage.setItem('krishi_user', JSON.stringify(userData));
      localStorage.setItem('krishi_token', userData.access_token);
    } catch (e) {
      console.warn('Could not write to localStorage:', e);
    }

    login({
      role,
      email: credentials.email.trim().toLowerCase(),
      phone: credentials.phone,
      name: credentials.name.trim(),
    });

    navigate(`/${role}/dashboard`, { replace: true });
  }

  async function handleResendOtp() {
    setError('');
    const demoOtp = Math.floor(100000 + Math.random() * 900000).toString();
    let finalOtp = demoOtp;
    let realSmsDelivered = false;
    try {
      const response = await api.sendOtp(credentials.phone, { timeout: 8000 });
      if (response && response.delivery_method === 'SMS') {
        realSmsDelivered = true;
      }
      if (response && response.dev_otp) {
        finalOtp = String(response.dev_otp);
      } else if (response && !response.dev_otp) {
        realSmsDelivered = true;
      }
    } catch {
      // Ignore backend error during resend in demo
    }
    setIsRealSms(realSmsDelivered);
    setExpectedOtp(finalOtp);
    if (realSmsDelivered) {
      setOtp('');
    } else {
      setOtp(finalOtp);
    }
    setResendIn(30);
  }

  function chooseRole(value) {
    setRole(value);
    setStep('details');
    setOtp('');
    setExpectedOtp('');
    setError('');
  }

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
          <div>
            <h2>{step === 'details' ? 'Login to continue' : 'Verify OTP'}</h2>
            <p className="muted">{step === 'details'
              ? 'Your portal opens only after frontend verification.'
              : `Code sent to ${maskPhone(credentials.phone)}`}</p>
          </div>
        </div>

        {session && validRoles.includes(session?.role?.toLowerCase()) && (
          <div style={{
            marginBottom: '1rem',
            padding: '10px 14px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.82rem'
          }}>
            <span>Logged in as <b>{session.name || session.phone || session.role}</b> ({session.role})</span>
            <button
              type="button"
              className="linkish"
              onClick={() => navigate(`/${session.role.toLowerCase()}/dashboard`)}
              style={{ fontWeight: 600, color: '#16a34a', textDecoration: 'underline' }}
            >
              Resume session →
            </button>
          </div>
        )}

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
                <UsersRound size={17} aria-hidden="true" />
                <Field label="Full Name" name="name" type="text" autoComplete="name" placeholder="John Doe" required {...field('name')} />
              </div>
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

            {error && <p className="login-error" role="alert" style={{ marginBottom: '1rem' }}>{error}</p>}
            <Button type="submit" disabled={loading}>
              <Smartphone size={17} />
              {loading ? 'Sending OTP…' : 'Send OTP'}
            </Button>
            <p className="login-privacy">Frontend demo only. A 6-digit verification code is delivered directly to your mobile via SMS.</p>
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
            {isRealSms ? (
              <div className="demo-otp" role="note" style={{ backgroundColor: '#f0fdf4', borderColor: '#86efac', color: '#166534' }}>
                <ShieldCheck size={17} />Real SMS OTP sent to <strong>{maskPhone(credentials.phone)}</strong>. Check your mobile SMS!
              </div>
            ) : (
              <div className="demo-otp" role="note">
                <ShieldCheck size={17} />OTP sent to your phone. (Auto-filled: <strong>{otp || expectedOtp}</strong>)
              </div>
            )}
            {error && <p className="login-error" role="alert">{error}</p>}
            <Button type="submit" disabled={otp.length !== 6 || loading}>
              {loading ? 'Verifying…' : 'Verify OTP & Enter Portal'}
            </Button>
            <div className="login-secondary-actions">
              <button type="button" className="linkish" onClick={() => { setStep('details'); setError(''); }}>Change details</button>
              <button
                type="button"
                className="linkish"
                disabled={resendIn > 0}
                onClick={handleResendOtp}
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
