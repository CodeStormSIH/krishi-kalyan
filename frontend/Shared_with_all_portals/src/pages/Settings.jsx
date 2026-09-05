import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { Card, SectionTitle } from '../components/UI';
import { Button, Field, Tabs } from '../components/Shared';
import { useStore } from '../services/store';
export default function Settings() {
  const {
    data,
    session,
    update,
    toast
  } = useStore();
  const role = session.role,
    admin = role === 'admin';
  const tabs = admin ? ['General Settings', 'System Configuration', 'Notifications', 'Security', 'Integration Settings'] : ['Center Information', 'Operating Hours', 'Notification Settings'];
  const selectedCenter = data.centers.find(c => c.name === data.selectedCenter);
  const initialForm = admin ? data.settings.admin : {
    ...data.settings.operator,
    ...selectedCenter,
    code: selectedCenter.id
  };
  const [tab, setTab] = useState(tabs[0]),
    [form, setForm] = useState(initialForm);
  const field = k => ({
    value: form[k] ?? '',
    onChange: e => setForm({
      ...form,
      [k]: e.target.value
    })
  });
  const check = (key, label) => <label className="check-field" key={key}><input type="checkbox" checked={!!form[key]} onChange={e => setForm({
      ...form,
      [key]: e.target.checked
    })} />{label}</label>;
  function save(e) {
    e.preventDefault();
    if (form.opening >= form.closing) {
      toast('Closing time must be later than opening time.');
      return;
    }
    update('settings', s => ({
      ...s,
      [role]: form
    }));
    if (!admin) {
      update('centers', rows => rows.map(c => c.id === form.code ? {
        ...c,
        opening: form.opening,
        closing: form.closing,
        breakStart: form.breakStart,
        breakEnd: form.breakEnd,
        logo: form.logo,
        sms: form.sms,
        emailNotifications: form.emailNotifications,
        inApp: form.inApp,
        name: form.name,
        address: form.address,
        phone: form.phone,
        email: form.email
      } : c));
      update('selectedCenter', form.name);
      update('tokens', rows => rows.map(t => t.center === selectedCenter.name ? {
        ...t,
        center: form.name
      } : t));
    }
    toast('Settings saved successfully.');
  }
  return <div className="settings-layout"><div className="settings-tabs"><Tabs items={tabs} value={tab} onChange={setTab} /></div><Card><SectionTitle title={tab} /><form onSubmit={save}>{(tab === 'General Settings' || tab === 'Center Information') && <><div className="form-grid"><div>{admin ? <Field label="System Name" value="Krishi Kalyan" readOnly /> : <><Field label="Center Name" required {...field('name')} /><Field label="Center Code" readOnly {...field('code')} /><Field label="Address" multiline required {...field('address')} /><Field label="Email" type="email" required {...field('email')} /></>}<Field label="Contact Number" pattern="[0-9]{10,12}" required {...field('phone')} />{admin && <><Field label="Default Language" options={['English', 'हिन्दी']} {...field('language')} /><Field label="Date Format" options={['DD MMM YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']} {...field('dateFormat')} /><Field label="Time Format" options={['12 hour', '24 hour']} {...field('timeFormat')} /><Field label="Timezone" options={['Asia/Kolkata', 'UTC']} {...field('timezone')} /></>}</div><div className="logo-upload"><div className="logo-preview">{form.logo ? <img src={form.logo} alt="Uploaded center logo" /> : <Building2 size={80} />}</div><Field label={admin ? 'System Logo' : 'Center Logo'} type="file" accept="image/png,image/jpeg" onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024 || !['image/png', 'image/jpeg'].includes(file.type)) {
                  toast('Choose a PNG or JPG under 2 MB.');
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => setForm({
                  ...form,
                  logo: reader.result
                });
                reader.readAsDataURL(file);
              }} /><small>PNG / JPG, up to 2 MB</small></div></div></>}{['System Configuration', 'Operating Hours'].includes(tab) && <div className="form-grid"><Field label="Opening Time" type="time" required {...field('opening')} /><Field label="Closing Time" type="time" required {...field('closing')} />{admin ? <Field label="Maximum Daily Tokens" type="number" min="10" max="1000" required {...field('capacity')} /> : <><Field label="Break Starts" type="time" {...field('breakStart')} /><Field label="Break Ends" type="time" {...field('breakEnd')} /></>}</div>}{['Notifications', 'Notification Settings'].includes(tab) && <>{check('sms', 'Enable SMS notifications')}{check(admin ? 'email' : 'emailNotifications', 'Enable email notifications')}{check('inApp', 'Enable in-app notifications')}<p className="muted">Channel preferences are saved locally for future backend integration.</p></>}{tab === 'Security' && <>{check('requireMfa', 'Require multi-factor authentication when backend authentication is connected')}<Field label="Session Timeout (minutes)" type="number" min="5" max="120" required {...field('sessionTimeout')} /><p className="muted">Demo role selection is local. These preferences do not enable production authentication.</p></>}{tab === 'Integration Settings' && <><Field label="Backend API URL" type="url" placeholder="https://api.example.org" {...field('apiUrl')} /><p className="muted">Saved integration configuration. This frontend continues to use the local mock service until an API adapter is connected.</p><Button secondary onClick={() => toast(form.apiUrl ? 'API URL format saved for integration. No network request was made.' : 'Enter your backend API URL first.')}>Review Configuration</Button></>}<div className="button-row"><Button type="submit">Save Changes</Button></div></form></Card></div>;
}

