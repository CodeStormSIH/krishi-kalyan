import React, { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Card, SectionTitle } from '../components/UI';
import { Badge, Button, Field, Tabs, DataTable } from '../components/Shared';
import { useStore, canReadNotification } from '../services/store';
import { dateISO } from '../data/seed';
export default function Notifications() {
  const {
    data,
    session,
    update,
    patch,
    toast
  } = useStore();
  const farmer = session.role === 'farmer';
  const [tab, setTab] = useState(farmer ? 'All' : 'Send Notification'),
    [limit, setLimit] = useState(5),
    [schedule, setSchedule] = useState('Now'),
    [audience, setAudience] = useState('All Farmers');
  const visible = data.notifications.filter(n => canReadNotification(n, session.role) && n.delivery === 'Sent' && (tab === 'All' || n.category === tab));
  function send(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (schedule === 'Later' && new Date(f.scheduledAt) <= new Date()) {
      toast('Choose a future notification time.');
      return;
    }
    update('notifications', rows => [{
      ...f,
      id: crypto.randomUUID(),
      title: f.category === 'Alerts' ? 'Center Alert' : 'Center Announcement',
      date: dateISO(),
      time: new Date().toLocaleTimeString(),
      read: false,
      delivery: schedule === 'Later' ? 'Scheduled' : 'Sent'
    }, ...rows]);
    e.currentTarget.reset();
    setSchedule('Now');
    toast(schedule === 'Later' ? 'Demo notification scheduled.' : 'Demo notification sent to the selected audience.');
  }
  return <><Tabs items={farmer ? ['All', 'Important', 'Alerts', 'Updates'] : ['Send Notification', 'Notification History']} value={tab} onChange={setTab} />{farmer ? <Card><div className="section-title"><h2>All your notifications and alerts</h2><Button secondary onClick={() => {
          update('notifications', rows => rows.map(n => ({
            ...n,
            read: true
          })));
          toast('All notifications marked as read.');
        }}><CheckCheck size={15} /> Mark All Read</Button></div>{visible.slice(0, limit).map(n => <div className={`notification-full ${!n.read ? 'unread' : ''}`} key={n.id}><div className="notif-circle green"><Bell size={18} /></div><div><b>{n.title}</b><p>{n.message}</p><small>{n.date}, {n.time}</small></div>{n.read ? <Badge>Read</Badge> : <button className="linkish" onClick={() => patch('notifications', n.id, {
          read: true
        })}>Mark Read</button>}</div>)}{!visible.length && <p className="empty-note">No notifications in this category.</p>}{visible.length > limit && <Button secondary onClick={() => setLimit(limit + 5)}>Load More</Button>}</Card> : tab === 'Send Notification' ? <div className="grid two"><Card><SectionTitle title="Send Notification" /><form onSubmit={send}><Field label="Send To" name="audience" options={session.role === 'admin' ? ['All Farmers', 'All Centers', 'Operators', 'Specific User'] : ['All Farmers', 'Queue Farmers', 'Specific Farmer']} value={audience} onChange={e => setAudience(e.target.value)} />{audience.startsWith('Specific') && <Field label="Recipient" name="recipient" required options={data.farmers.map(f => ({
            value: f.id,
            label: `${f.name} (${f.id})`
          }))} />}<Field label="Notification Type" name="category" options={['Updates', 'Alerts', 'Important']} /><Field label="Priority" name="priority" options={['Normal', 'High', 'Urgent']} /><Field label="Message" name="message" multiline required minLength={10} /><Field label="Delivery" options={['Now', 'Later']} value={schedule} onChange={e => setSchedule(e.target.value)} />{schedule === 'Later' && <Field label="Scheduled Date & Time" name="scheduledAt" type="datetime-local" required />}<Button type="submit">{schedule === 'Later' ? 'Schedule Notification' : 'Send Notification'}</Button></form></Card><Card><SectionTitle title="Recent Notifications" />{data.notifications.slice(0, 6).map(n => <div className="notice" key={n.id}><span className="notice-icon"><Bell size={18} /></span><div><b>{n.title}</b><p>{n.message}</p><small>{n.audience} · {n.date}</small> <Badge>{n.delivery}</Badge></div></div>)}</Card></div> : <DataTable title="Notification History" rows={data.notifications} filters={[{
      key: 'delivery',
      label: 'delivery statuses'
    }, {
      key: 'category',
      label: 'types'
    }]} columns={[{
      key: 'title',
      label: 'Title'
    }, {
      key: 'message',
      label: 'Message',
      render: v => <span className="wrap-cell">{v}</span>
    }, {
      key: 'category',
      label: 'Type'
    }, {
      key: 'audience',
      label: 'Audience'
    }, {
      key: 'date',
      label: 'Sent On'
    }, {
      key: 'delivery',
      label: 'Status',
      render: v => <Badge>{v}</Badge>
    }]} actions={r => r.delivery === 'Scheduled' ? <><button className="linkish" onClick={() => {
        patch('notifications', r.id, {
          delivery: 'Sent'
        });
        toast('Scheduled demo notification sent now.');
      }}>Send Now</button><button className="linkish" onClick={() => patch('notifications', r.id, {
        delivery: 'Cancelled'
      })}>Cancel</button></> : <Badge>{r.read ? 'Read' : 'Delivered'}</Badge>} />}</>;
}
