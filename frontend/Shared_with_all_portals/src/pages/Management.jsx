import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { UsersRound, Building2, Ticket, Clock, Wheat, WalletCards, CheckCircle2, TriangleAlert, Send, Download, Plus, ShieldCheck } from 'lucide-react';
import { Card, SectionTitle } from '../components/UI';
import { Badge, Button, Field, Tabs, DataTable, Details, Modal, Stats } from '../components/Shared';
import { LineChart, Donut, BarChart } from '../components/Charts';
import { useStore, money, download } from '../services/store';
import { stages, dateISO } from '../data/seed';

const col = (key, label, render) => ({
  key,
  label,
  render
});
const status = col('status', 'Status', v => <Badge>{v}</Badge>);
const filters = (...keys) => keys.map(key => ({
  key,
  label: key === 'status' ? 'statuses' : key + 's'
}));
export function Management({
  page
}) {
  const {
    data,
    session,
    patch,
    update,
    advanceQueue,
    notify,
    toast
  } = useStore();
  const admin = session.role === 'admin';
  const nav = useNavigate();
  const [detail, setDetail] = useState(null),
    [edit, setEdit] = useState(null),
    [confirm, setConfirm] = useState(null),
    [tab, setTab] = useState(page === 'users' ? 'Users' : 'Current Queue'),
    [date, setDate] = useState('');
  const source = ['farmers', 'centers', 'users', 'alerts'].includes(page) ? page : 'tokens';
  let rows = data[source];
  if (source === 'tokens' && !admin) rows = rows.filter(r => r.center === data.selectedCenter);
  if (page === 'farmers' && !admin) rows = rows.filter(r => data.tokens.some(t => t.farmerId === r.id && t.center === data.selectedCenter));
  if (source === 'tokens' && date) rows = rows.filter(r => r.date === date);
  if (page === 'queue' && !admin) rows = rows.filter(r => tab === 'All Tokens' || (tab === 'History' ? ['Completed', 'Cancelled'].includes(r.status) : !['Completed', 'Cancelled'].includes(r.status)));
  const columns = page === 'farmers' ? [col('name', 'Farmer Name'), col('id', 'Kisan ID'), col('phone', 'Mobile Number'), col('district', 'District'), col('crop', 'Crop'), status, col('registered', 'Registered On')] : page === 'centers' ? [col('id', 'Center Code'), col('name', 'Center Name'), col('district', 'District'), col('manager', 'Manager'), status, col('served', 'Farmers Served')] : page === 'users' ? [col('name', 'Name'), col('email', 'Email'), col('role', 'Role'), col('center', 'Center'), status, col('lastLogin', 'Last Login')] : page === 'alerts' ? [col('title', 'Alert Type'), col('center', 'Center'), col('severity', 'Priority', v => <Badge>{v}</Badge>), col('date', 'Detected On'), status] : page === 'payments' ? [col('id', 'Payment / Token ID', v => `PAY-${v}`), col('name', 'Farmer'), col('center', 'Center'), col('quantity', 'Amount', (_, r) => money(r.quantity * r.rate)), col('payment', 'Payment Status', v => <Badge>{v}</Badge>), col('date', 'Payment Date')] : page === 'procurement' ? [col('id', 'Token No.'), col('name', 'Farmer'), col('center', 'Center'), col('crop', 'Crop'), col('quantity', 'Quantity (Qtl)'), col('stage', 'Stage', v => <Badge>{stages[v]}</Badge>), col('date', 'Updated On')] : [col('position', 'Position', (_, r) => rows.findIndex(t => t.id === r.id) + 1), col('id', 'Token No.'), col('name', 'Farmer'), col('center', 'Center'), col('crop', 'Crop'), col('date', 'Date'), col('slot', 'Time Slot'), status];
  const groups = page === 'farmers' ? filters('status', 'district', 'crop') : page === 'centers' ? filters('status', 'district') : page === 'users' ? filters('role', 'status') : page === 'alerts' ? filters('severity', 'status', 'center') : page === 'payments' ? filters('payment', 'center') : filters('center', 'crop', 'status');
  const totals = page === 'farmers' || page === 'centers' || page === 'users' ? [[`Total ${page}`, rows.length, UsersRound], ['Active', rows.filter(r => r.status === 'Active').length, CheckCircle2], ['Inactive', rows.filter(r => r.status === 'Inactive').length, TriangleAlert], ['New This Month', Math.min(4, rows.length), Plus]] : page === 'payments' ? [['Total Payments', money(rows.reduce((s, r) => s + r.quantity * r.rate, 0)), WalletCards], ['Paid', money(rows.filter(r => r.payment === 'Paid').reduce((s, r) => s + r.quantity * r.rate, 0)), CheckCircle2], ['In Process', money(rows.filter(r => r.payment === 'In Process').reduce((s, r) => s + r.quantity * r.rate, 0)), Clock], ['Pending / Failed', rows.filter(r => ['Pending', 'Failed'].includes(r.payment)).length, TriangleAlert]] : page === 'alerts' ? [['Total Alerts', rows.length, TriangleAlert], ['High Priority', rows.filter(r => r.severity === 'High').length, TriangleAlert], ['Investigating', rows.filter(r => r.status === 'Investigating').length, Clock], ['Resolved', rows.filter(r => r.status === 'Resolved').length, CheckCircle2]] : [['Total Tokens', rows.length, Ticket], ['In Queue', rows.filter(r => r.status === 'In Queue').length, UsersRound], ['Under Procurement', rows.filter(r => r.stage > 0 && r.stage < 5).length, Wheat], ['Completed', rows.filter(r => r.status === 'Completed').length, CheckCircle2]];
  function save(e) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    if (form.email && data[source].some(r => r.id !== edit.id && r.email === form.email)) {
      toast('This email already belongs to another record.');
      return;
    }
    if (edit.id) {
      patch(source, edit.id, form);
      if (source === 'farmers') {
        update('tokens', tokens => tokens.map(t => t.farmerId === edit.id ? {...t, name: form.name} : t));
        if (edit.id === 'KRN123456') update('profiles', profiles => ({...profiles, farmer: {...profiles.farmer, name: form.name, email: form.email, phone: form.phone}}));
      }
      if (source === 'centers') {
        update('tokens', ts => ts.map(t => t.center === edit.name ? {
          ...t,
          center: form.name
        } : t));
        if (data.selectedCenter === edit.name) update('selectedCenter', form.name);
      }
    } else update(source, rs => [{
      ...form,
      id: `${source === 'centers' ? 'SPC' : 'USR'}${Date.now().toString().slice(-6)}`,
      served: 0,
      lastLogin: 'Never'
    }, ...rs]);
    toast('Record saved successfully.');
    setEdit(null);
  }
  const selected = detail && data[source].find(r => r.id === detail.id);
  return <><Stats items={totals} /><div className="mt">{page === 'queue' && !admin && <div className="row-between"><Tabs items={['Current Queue', 'All Tokens', 'History']} value={tab} onChange={setTab} /><div className="button-row"><Button secondary onClick={() => {
            advanceQueue();
            toast('Next waiting farmer called for verification.');
          }}>Call Next</Button><Button secondary onClick={() => toast(`Queue refreshed at ${new Date().toLocaleTimeString()}`)}>Refresh Queue</Button></div></div>}{page === 'users' && <Tabs items={['Users', 'Roles', 'Permissions']} value={tab} onChange={setTab} />} {page === 'users' && tab !== 'Users' ? <Card><SectionTitle title={tab === 'Roles' ? 'Role Responsibilities' : 'Role Permissions'} />{Object.entries(data.permissions).map(([role, permissions]) => <div className="role-permissions" key={role}><h3><ShieldCheck size={18} /> {role}</h3>{tab === 'Roles' ? <p>{permissions.join(' · ')}</p> : ['View reports', 'Manage farmers', 'Manage centers', 'Manage queue', 'Update procurement', 'Manage tickets'].map(p => <label className="check-field" key={p}><input type="checkbox" checked={permissions.includes(p)} onChange={e => {
              update('permissions', r => ({
                ...r,
                [role]: e.target.checked ? [...r[role], p] : r[role].filter(x => x !== p)
              }));
              toast('Role permission saved.');
            }} />{p}</label>)}</div>)}</Card> : <DataTable title={{
        farmers: 'Registered Farmers',
        centers: 'Procurement Centers',
        queue: 'Token & Queue',
        procurement: 'Procurement Records',
        payments: 'Payment Transactions',
        alerts: 'Alerts & Anomalies',
        users: 'Users & Roles'
      }[page]} rows={rows} columns={columns} filters={groups} extra={<>{source === 'tokens' && <input aria-label="Filter date" type="date" value={date} onChange={e => setDate(e.target.value)} />} {admin && ['centers', 'users'].includes(page) && <Button onClick={() => setEdit({})}><Plus size={15} />Add {page === 'centers' ? 'Center' : 'User'}</Button>}</>} actions={r => <><button className="linkish" onClick={() => setDetail(r)}>View</button>{admin && ['farmers', 'centers', 'users'].includes(page) && <><button className="linkish" onClick={() => setEdit(r)}>Edit</button><button className="linkish" onClick={() => setConfirm(r)}>{r.status === 'Active' ? 'Disable' : 'Enable'}</button></>}{page === 'queue' && !admin && r.status === 'In Queue' && <button className="linkish" onClick={() => {
          patch('tokens', r.id, {
            stage: 1,
            status: 'Checked In'
          });
          notify('Farmer Checked In', `${r.name} has checked in for ${r.id}.`);
          toast('Farmer checked in.');
        }}>Check In</button>}{page === 'queue' && !admin && ['Checked In', 'In Process'].includes(r.status) && <button className="linkish" onClick={() => nav(`/operator/stages?token=${r.id}`)}>Process</button>}{page === 'procurement' && !admin && r.status !== 'Cancelled' && <button className="linkish" onClick={() => nav(`/operator/stages?token=${r.id}`)}>Update Stage</button>}</>} exportName={page} />}</div>{['procurement', 'payments', 'alerts'].includes(page) && <div className="grid two mt"><Card><SectionTitle title={page === 'payments' ? 'Payment Trend' : 'Daily Procurement Trend'} /><LineChart series={page === 'payments' ? ['Paid', 'In Process'] : ['Procurement (MT)', 'Farmers Served']} /></Card><Card><SectionTitle title="Status Distribution" /><Donut items={page === 'payments' ? ['Paid', 'Pending', 'In Process', 'Failed'].map(s => [s, rows.filter(r => r.payment === s).length]) : page === 'alerts' ? ['Open', 'Investigating', 'Resolved'].map(s => [s, rows.filter(r => r.status === s).length]) : ['Wheat', 'Paddy', 'Maize'].map(s => [s, rows.filter(r => r.crop === s).length])} /></Card></div>}
{selected && <Details title={`${page === 'payments' ? 'Payment' : 'Record'} Details`} row={selected} onClose={() => setDetail(null)}>{page === 'alerts' && <Field label="Investigation Status" options={['Open', 'Investigating', 'Resolved']} value={selected.status} onChange={e => {
        patch('alerts', selected.id, {
          status: e.target.value
        });
        toast('Alert status updated.');
      }} />}{page === 'payments' && <><p><b>Amount:</b> {money(selected.quantity * selected.rate)} · Bank transfer · XXXX-XXXX-5678</p><Field label="Payment Status" value={selected.payment} options={['Pending', 'In Process', 'Paid', 'Failed']} onChange={e => {
          if (selected.stage !== 5 && ['Paid', 'In Process'].includes(e.target.value)) {
            toast('Complete procurement before initiating payment.');
            return;
          }
          patch('tokens', selected.id, {
            payment: e.target.value
          });
          notify('Payment Status Updated', `${selected.id}: ${e.target.value}.`);
          toast('Payment status saved.');
        }} /></>}</Details>}
{confirm && <Modal title={`${confirm.status === 'Active' ? 'Disable' : 'Enable'} ${confirm.name}?`} onClose={() => setConfirm(null)}><p>This changes the record's availability in the frontend demonstration.</p><div className="button-row"><Button onClick={() => {
          patch(source, confirm.id, {
            status: confirm.status === 'Active' ? 'Inactive' : 'Active'
          });
          setConfirm(null);
          toast('Availability updated.');
        }}>Confirm</Button><Button secondary onClick={() => setConfirm(null)}>Cancel</Button></div></Modal>}
{edit && <Modal title={`${edit.id ? 'Edit' : 'Add'} ${page === 'centers' ? 'Center' : page === 'users' ? 'User' : 'Farmer'}`} onClose={() => setEdit(null)}><form onSubmit={save}><Field label="Name" name="name" required minLength={2} defaultValue={edit.name} />{page === 'centers' ? <><Field label="District" name="district" required defaultValue={edit.district} /><Field label="Manager" name="manager" required defaultValue={edit.manager} /><Field label="Address" name="address" required defaultValue={edit.address} /><Field label="Phone" name="phone" required pattern="[0-9]{10}" defaultValue={edit.phone} /></> : <Field label="Email" name="email" type="email" required defaultValue={edit.email} />} {page === 'users' && <><Field label="Role" name="role" defaultValue={edit.role || 'Center Operator'} options={['Admin', 'Center Operator', 'Support Staff']} /><Field label="Center" name="center" defaultValue={edit.center} options={['All Centers', ...data.centers.map(c => c.name)]} /></>}{page === 'farmers' && <><Field label="Mobile" name="phone" required pattern="[0-9]{10}" defaultValue={edit.phone} /><Field label="District" name="district" required defaultValue={edit.district} /><Field label="Crop" name="crop" defaultValue={edit.crop} options={['Wheat', 'Paddy', 'Maize']} /></>}<Field label="Status" name="status" defaultValue={edit.status || 'Active'} options={['Active', 'Inactive']} /><Button type="submit">Save {page === 'centers' ? 'Center' : 'Changes'}</Button></form></Modal>}</>;
}
export function PortalDashboard() {
  const {
    data,
    session,
    advanceQueue
  } = useStore();
  const role = session.role,
    admin = role === 'admin';
  const [period, setPeriod] = useState('Daily');
  const rows = data.tokens.filter(t => admin || t.center === data.selectedCenter);
  const waiting = rows.filter(t => ['In Queue', 'Checked In'].includes(t.status));
  const completed = rows.filter(t => t.stage === 5);
  const stats = admin ? [['Total Farmers', data.farmers.length, UsersRound, 'Registered farmers', 'green'], ['Procurement Centers', data.centers.length, Building2, 'Across Bihar', 'blue'], ['Tokens Generated', rows.length, Ticket, 'Current procurement cycle', 'purple'], ['Procured (MT)', (completed.reduce((s, t) => s + t.quantity, 0) / 10).toFixed(2), Wheat, 'Verified quantity', 'orange'], ['Payments Made', money(rows.filter(t => t.payment === 'Paid').reduce((s, t) => s + t.quantity * t.rate, 0)), WalletCards, 'Paid successfully', 'teal']] : [["Today's Tokens", rows.length, Ticket, 'Total Generated', 'blue'], ['Farmers in Queue', waiting.length, UsersRound, 'Currently Waiting', 'green'], ['Avg. Waiting Time', `${Math.round(waiting.length * 2.5)} min`, Clock, 'Estimated', 'orange'], ['Tokens Served', completed.length, CheckCircle2, 'Today', 'purple'], ["Today's Procurement", `${(completed.reduce((s, t) => s + t.quantity, 0) / 10).toFixed(2)} MT`, Wheat, 'Total Quantity', 'teal']];
  const link = (path, text) => <NavLink className="linkish" to={`/${role}/${path}`}>{text}</NavLink>;
  const donutItems = ['Completed', 'In Queue', 'In Process', 'Cancelled'].map(s => [s, rows.filter(t => s === 'In Process' ? ['In Process', 'Checked In'].includes(t.status) : t.status === s).length]);
  return <><div className="operational"><span>Operational Status: <Badge>Open</Badge> <span className="muted"> · Center Timings: 09:00 AM – 06:00 PM</span></span><span>{admin ? 'Demo procurement cycle' : `Center Code: ${data.centers.find(c => c.name === data.selectedCenter)?.id}`} · {dateISO()}</span></div><Stats items={stats} />{admin ? <div className="admin-dashboard-grid mt"><Card className="overview"><div className="section-title"><h2>Tokens & Procurement Overview</h2><select aria-label="Chart period" value={period} onChange={e => setPeriod(e.target.value)}>{['Daily', 'Weekly', 'Monthly'].map(p => <option key={p}>{p}</option>)}</select></div><LineChart period={period} /></Card><Card className="tokens-donut"><SectionTitle title="Center-wise Token Status" /><Donut items={donutItems} total={rows.length} label="Total Tokens" /></Card><Card className="alerts-panel"><div className="section-title"><h2>Real-time Alerts</h2>{link('alerts', 'View All')}</div>{data.alerts.slice(0, 4).map(a => <NavLink to="/admin/alerts" className="notice" key={a.id}><span className="notice-icon orange"><TriangleAlert size={20} /></span><div><b>{a.title}</b><p>{a.center}</p><small>{a.status} · {a.severity} priority</small></div></NavLink>)}</Card><Card className="stage-summary"><SectionTitle title="Procurement Stages Summary" /><div className="summary-stages">{[['Tokens Generated', rows.length, Ticket], ['Farmers Arrived', rows.filter(t => t.stage > 0).length, UsersRound], ['Under Procurement', rows.filter(t => t.stage > 0 && t.stage < 5).length, Wheat], ['Completed', completed.length, CheckCircle2]].map(([label, n, Icon], i) => <div key={label}><span className={`stat-icon ${['blue', 'orange', 'purple', 'green'][i]}`}><Icon /></span><small>{label}</small><strong>{n}</strong></div>)}</div></Card><Card className="payment-donut"><SectionTitle title="Payment Status Overview" /><Donut items={['Paid', 'Pending', 'In Process', 'Failed'].map(p => [p, rows.filter(t => t.payment === p).length])} /></Card><Card className="top-centers"><div className="section-title"><h2>Top Performing Centers</h2>{link('reports', 'View Report')}</div><table><thead><tr><th>Center Name</th><th>Farmers Served</th><th>Wait</th></tr></thead><tbody>{[...data.centers].sort((a, b) => b.served - a.served).slice(0, 5).map(c => <tr key={c.id}><td>{c.name}</td><td>{c.served}</td><td>18 min</td></tr>)}</tbody></table></Card><Card className="recent-activity"><div className="section-title"><h2>Recent Activity</h2>{link('queue', 'View All')}</div><Activity rows={rows} /></Card><Card className="quick-actions"><SectionTitle title="Quick Actions" /><div className="quick-grid"><NavLink to="/admin/centers"><Building2 />Add Center</NavLink><NavLink to="/admin/notifications"><Send />Send Notification</NavLink><NavLink to="/admin/reports"><Download />Download Report</NavLink><button onClick={() => download('platform-data', rows)}><Download />Export Data</button></div></Card></div> : <><div className="grid three mt"><Card><div className="section-title"><h2>Current Queue</h2>{link('queue', 'View All Queue')}</div><small className="muted">{waiting.length} Farmers Waiting</small><table><thead><tr><th>Position</th><th>Token No.</th><th>Farmer</th><th>Crop</th><th>Est.</th></tr></thead><tbody>{waiting.slice(0, 5).map((t, i) => <tr key={t.id}><td><Badge>{i + 1}</Badge></td><td>{t.id}</td><td>{t.name}</td><td>{t.crop}</td><td>{i * 5} min</td></tr>)}</tbody></table><div className="section-title mt"><small>Local queue simulation</small><button className="linkish" onClick={advanceQueue}>↻ Call Next</button></div></Card><Card><SectionTitle title="Token Generation Summary" /><Donut items={donutItems} total={rows.length} />{link('reports', 'View Full Report →')}</Card><Card><div className="section-title"><h2>Procurement Stage Overview</h2>{link('stages', 'View Details')}</div>{['Registration / Check-in', 'Verification & Weighing', 'Quality Check', 'Procurement Completed'].map((s, i) => <NavLink to="/operator/stages" className="stage-overview" key={s}><span className={`stat-icon ${['blue', 'orange', 'purple', 'green'][i]}`}><CheckCircle2 size={20} /></span><div><b>{i + 1}. {s}</b><small>{i === 3 ? 'Completed today' : 'Farmers in this stage'}</small></div><strong>{rows.filter(t => i === 3 ? t.stage === 5 : t.stage === i + 1).length}</strong></NavLink>)}</Card></div><div className="grid three mt"><Card><SectionTitle title="Today's Procurement Summary" /><div className="detail-list">{[['Total Farmers Served', completed.length], ['Total Quantity Procured', `${completed.reduce((s, t) => s + t.quantity, 0)} Qtl`], ['Total Bags', completed.reduce((s, t) => s + t.quantity * 2, 0)], ['Avg. Procurement Time', '6.2 min'], ['Pending Verification', rows.filter(t => t.stage === 2).length]].map(([k, v]) => <p key={k}><span>{k}</span><b>{v}</b></p>)}</div>{link('reports', 'View Detailed Report →')}</Card><Card><div className="section-title"><h2>Recent Activity</h2>{link('queue', 'View All')}</div><Activity rows={rows} /></Card><Card><div className="section-title"><h2>Notifications</h2>{link('notifications', 'View All')}</div>{data.notifications.slice(0, 4).map(n => <div className="notice" key={n.id}><span className="notice-icon"><CheckCircle2 size={18} /></span><div><b>{n.title}</b><p>{n.message}</p></div></div>)}</Card></div><Card className="mt"><div className="section-title"><h2>Payment Status Overview</h2>{link('payments', 'View Payment Report →')}</div><Stats items={['Paid', 'In Process', 'Failed', 'Pending'].map((s, i) => [s, money(rows.filter(t => t.payment === s).reduce((n, t) => n + t.quantity * t.rate, 0)), WalletCards, 'Demo transaction total', ['green', 'orange', 'purple', 'blue'][i]])} /></Card></>}</>;
}
function Activity({
  rows
}) {
  return <div className="activity-list">{rows.slice(0, 5).map(t => <div key={t.id}><span className="notice-icon"><CheckCircle2 size={15} /></span><div><b>{stages[t.stage]}</b><small>{t.id} · {t.name}</small></div><small>{t.date}</small></div>)}</div>;
}
export function ReportsPage() {
  const {
    data,
    session
  } = useStore();
  const admin = session.role === 'admin';
  const tabs = admin ? ['Overview', 'Procurement', 'Payments', 'Farmers', 'Centers'] : ['Daily Reports', 'Procurement Reports', 'Payment Reports', 'Queue Reports', 'Farmer Reports', 'Token Reports'];
  const [tab, setTab] = useState(tabs[0]),
    [center, setCenter] = useState(admin ? 'All Centers' : data.selectedCenter),
    [start, setStart] = useState('2026-01-01'),
    [end, setEnd] = useState(dateISO()),
    [period, setPeriod] = useState('Daily');
  const rows = data.tokens.filter(t => (center === 'All Centers' || t.center === center) && t.date >= start && t.date <= end);
  const category = tab.includes('Payment') ? 'Payments' : tab.includes('Farmer') ? 'Farmers' : tab === 'Centers' ? 'Centers' : tab.includes('Queue') ? 'Queue' : 'Procurement';
  const exportRows = category === 'Farmers' ? data.farmers.filter(f => rows.some(t => t.farmerId === f.id)) : category === 'Centers' ? data.centers.filter(c => center === 'All Centers' || c.name === center) : category === 'Payments' ? rows.map(t => ({
    id: t.id,
    token: t.id,
    farmer: t.name,
    date: t.date,
    amount: t.quantity * t.rate,
    status: t.payment
  })) : rows;
  return <><Tabs items={tabs} value={tab} onChange={setTab} /><Card><div className="report-toolbar"><Field label="From Date" type="date" value={start} onChange={e => setStart(e.target.value)} /><Field label="To Date" type="date" min={start} value={end} onChange={e => setEnd(e.target.value)} /><Field label="Procurement Center" options={admin ? ['All Centers', ...data.centers.map(c => c.name)] : [data.selectedCenter]} value={center} onChange={e => setCenter(e.target.value)} /><Button disabled={start > end} onClick={() => download(`${category}-${start}-${end}`, exportRows)}>Download Report</Button></div></Card><div className="mt"><Stats items={[[`Total ${category}`, exportRows.length, Ticket, 'Filtered records'], ['Procurement', `${(rows.reduce((s, t) => s + t.quantity, 0) / 10).toFixed(2)} MT`, Wheat, 'Reported quantity'], ['Payments', money(rows.filter(t => t.payment === 'Paid').reduce((s, t) => s + t.quantity * t.rate, 0)), WalletCards, 'Paid transactions'], ['Farmers Served', rows.filter(t => t.stage === 5).length, UsersRound, 'Completed tokens']]} /></div><div className="grid two mt"><Card><SectionTitle title={`${category} Distribution`} /><Donut items={category === 'Payments' ? ['Paid', 'Pending', 'In Process', 'Failed'].map(p => [p, rows.filter(t => t.payment === p).length]) : ['Wheat', 'Paddy', 'Maize'].map(c => [c, rows.filter(t => t.crop === c).reduce((s, t) => s + t.quantity, 0)])} /></Card><Card><SectionTitle title="Procurement by Center" /><BarChart items={data.centers.filter(c => center === 'All Centers' || c.name === center).map(c => [c.name, rows.filter(t => t.center === c.name).reduce((s, t) => s + t.quantity, 0)])} /></Card><Card><div className="section-title"><h2>{category} Trend</h2><select aria-label="Trend interval" value={period} onChange={e => setPeriod(e.target.value)}>{['Daily', 'Weekly', 'Monthly'].map(p => <option key={p}>{p}</option>)}</select></div><LineChart period={period} seed={rows.length} series={category === 'Payments' ? ['Paid', 'Processing'] : ['Procurement', 'Farmers Served']} /><small className="muted">Illustrative historical trend; summaries use filtered records.</small></Card><Card><SectionTitle title="Report Downloads" /><div className="report-downloads">{tabs.map(t => <div key={t}><div><b>{t}</b><small>{start} – {end}</small></div><Button secondary onClick={() => {
              setTab(t);
              const subset = t.includes('Farmer') ? data.farmers : t === 'Centers' ? data.centers : t.includes('Payment') ? rows.map(r => ({
                token: r.id,
                amount: r.quantity * r.rate,
                status: r.payment
              })) : rows;
              download(t, subset);
            }}>Download <Download size={14} /></Button></div>)}</div></Card></div><div className="mt"><DataTable title={`${category} Report Records`} rows={exportRows} columns={category === 'Farmers' ? [col('name', 'Farmer'), col('district', 'District'), col('crop', 'Crop'), status] : category === 'Centers' ? [col('name', 'Center'), col('district', 'District'), col('served', 'Farmers Served'), status] : category === 'Payments' ? [col('token', 'Token'), col('farmer', 'Farmer'), col('date', 'Date'), col('amount', 'Amount', money), status] : [col('id', 'Token'), col('name', 'Farmer'), col('center', 'Center'), col('crop', 'Crop'), col('quantity', 'Quantity (Qtl)'), status]} exportName={category} /></div></>;
}
