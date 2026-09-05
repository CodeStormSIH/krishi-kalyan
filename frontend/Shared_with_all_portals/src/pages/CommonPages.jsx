import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserRound } from 'lucide-react';
import { Card, SectionTitle } from '../components/UI';
import { Badge, Button, Field } from '../components/Shared';
import { useStore } from '../services/store';
export { default as Support } from './Support';
export { default as Notifications } from './Notifications';
export { default as SettingsPage } from './Settings';
export { default as Login } from './Login';
export function Logout() {
  const {
    logout,
    session
  } = useStore();
  const nav = useNavigate();
  return <div className="logout-page"><Card><div className="logout-art"><ShieldCheck size={105} /></div><h2>Are you sure you want to logout?</h2><p>You will be logged out of the Krishi Kalyan {session.role} portal.</p><div className="button-row"><Button onClick={() => {
          logout();
          nav('/login', {
            replace: true,
            state: { role: session.role }
          });
        }}>Yes, Logout</Button><Button secondary onClick={() => nav(-1)}>Cancel</Button></div></Card></div>;
}
export function Profile() {
  const {
    data,
    session,
    update,
    toast
  } = useStore();
  const role = session.role;
  const [form, setForm] = useState(data.profiles[role]);
  const [error, setError] = useState('');
  const field = key => ({
    value: form[key] || '',
    onChange: e => setForm({
      ...form,
      [key]: e.target.value
    })
  });
  function photo(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      toast('Choose a JPG or PNG image smaller than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm({
      ...form,
      photo: reader.result
    });
    reader.readAsDataURL(file);
  }
  return <div className="page"><form onSubmit={e => {
      e.preventDefault();
      update('profiles', p => ({
        ...p,
        [role]: form
      }));
      if (role === 'farmer') update('tokens', rows => rows.map(t => t.farmerId === 'KRN123456' ? {
        ...t,
        name: form.name
      } : t));
      toast('Profile saved successfully.');
    }}><Card><SectionTitle title="Profile Information" /><div className="profile-main"><div className="form-col"><Field label="Full Name" required minLength={2} {...field('name')} /><Field label="Email Address" type="email" required {...field('email')} /><Field label="Mobile Number" pattern="[0-9]{10}" title="Enter a 10-digit mobile number" required {...field('phone')} />{role === 'farmer' ? <><Field label="Kisan ID" value="KRN123456" readOnly /><Field label="Date of Birth" type="date" max="2008-12-31" required {...field('dob')} /></> : <Field label="Role" value={role === 'admin' ? 'Super Admin' : 'Center Operator'} readOnly />}<Field label="Address" multiline required {...field('address')} /></div><div className="profile-photo"><div className="farmer-avatar">{form.photo ? <img src={form.photo} alt="Profile preview" /> : role === 'farmer' ? '👨🏽‍🌾' : <UserRound size={60} />}</div><Field label="Change Photo" type="file" accept="image/png,image/jpeg" onChange={photo} /><small>JPG, PNG up to 2 MB</small></div></div><Button type="submit">Save Profile</Button></Card></form>{role === 'farmer' && <div className="grid two mt"><Card><SectionTitle title="Aadhaar Information" /><div className="info-row"><span>Aadhaar Number</span><b>XXXX-XXXX-1234</b><Badge>Verified</Badge></div></Card><Card><SectionTitle title="Bank Information" /><div className="info-row"><span>Bank Name</span><b>State Bank of India</b><Badge>Verified</Badge></div><div className="info-row"><span>Account Number</span><b>XXXX-XXXX-5678</b></div><div className="info-row"><span>IFSC</span><b>SBIN0001234</b></div></Card></div>}<Card className="mt"><SectionTitle title="Change Demo Password" /><p className="muted">This updates a local demo credential. It is not a production authentication service.</p><form onSubmit={async e => {
        e.preventDefault();
        const el = e.currentTarget;
        const values = new FormData(el);
        const hash = async s => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map(b => b.toString(16).padStart(2, '0')).join('');
        if (values.get('new') !== values.get('confirm')) {
          setError('New passwords must match.');
          return;
        }
        const saved = localStorage.getItem(`krishi-password-${role}`);
        if (saved && (await hash(values.get('current'))) !== saved) {
          setError('Current demo password is incorrect.');
          return;
        }
        localStorage.setItem(`krishi-password-${role}`, await hash(values.get('new')));
        setError('');
        el.reset();
        toast('Demo password updated.');
      }}><div className="form-row"><Field label="Current Demo Password" type="password" name="current" required /><Field label="New Password" type="password" name="new" minLength={8} required /><Field label="Confirm Password" type="password" name="confirm" minLength={8} required /></div>{error && <p className="error" role="alert">{error}</p>}<Button type="submit">Update Password</Button></form></Card></div>;
}
