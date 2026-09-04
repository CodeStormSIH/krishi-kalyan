import React, { useState } from 'react';
import { Card, SectionTitle } from '@shared/components/UI';
import { Badge, Button, Field } from '@shared/components/Shared';
import { useStore } from '@shared/services/store';
import { stages } from '@shared/data/seed';
import { ProcurementProgress } from '@shared/components/ProcurementProgress';
export default function StagesPage() {
  const {
    data,
    patch,
    notify,
    toast
  } = useStore();
  const query = new URLSearchParams(window.location.search).get('token');
  const tokens = data.tokens.filter(t => t.center === data.selectedCenter && t.status !== 'Cancelled');
  const [id, setId] = useState(query || tokens[0]?.id);
  const token = tokens.find(t => t.id === id) || tokens[0];
  if (!token) return <Card><h2>No procurement records for this center</h2><p>Select another center or wait for new bookings.</p></Card>;
  return <div className="grid stage-layout"><Card><SectionTitle title="Procurement Stages" /><ProcurementProgress token={token} /><form key={token.id + token.stage} onSubmit={e => {
        e.preventDefault();
        if (token.stage >= 5) return;
        const f = Object.fromEntries(new FormData(e.currentTarget));
        const next = token.stage + 1;
        patch('tokens', token.id, {
          stage: next,
          quantity: f.weight ? Number(f.weight) : token.quantity,
          status: next === 5 ? 'Completed' : 'In Process',
          notes: [...token.notes, {
            stage: stages[next],
            remarks: f.remarks,
            weight: f.weight,
            quality: f.quality,
            time: new Date().toLocaleString()
          }]
        });
        notify('Procurement Stage Updated', `${token.id}: ${stages[next]}.`);
        toast(`Moved to ${stages[next]}.`);
      }}><Field label="Token / Farmer" options={tokens.map(t => ({
          value: t.id,
          label: `${t.id} — ${t.name}`
        }))} value={token.id} onChange={e => setId(e.target.value)} /><div className="form-grid"><Field label="Current Stage" readOnly value={stages[token.stage]} /><Field label="Next Stage" readOnly value={stages[Math.min(5, token.stage + 1)]} /></div>{token.stage === 3 && <Field label="Quality Grade" name="quality" required options={['Grade A', 'Grade B', 'Grade C']} />} {token.stage === 4 && <Field label="Accepted Weight (Quintal)" type="number" name="weight" required min="0.1" max={token.quantity} step="0.1" defaultValue={token.quantity} />}<Field label="Remarks / Notes" name="remarks" multiline required minLength={5} /><Button type="submit" disabled={token.stage === 5}>Update Stage</Button></form></Card><div><Card><SectionTitle title="Stage History" /><div className="stage-history">{stages.map((s, i) => <div key={s}><Badge>{i <= token.stage ? '✓' : '○'}</Badge><div><b>{s}</b><small>{token.notes.find(n => n.stage === s)?.remarks || (i <= token.stage ? 'Recorded at center' : 'Pending')}</small></div></div>)}</div></Card><Card className="mt"><SectionTitle title="Stage Guidelines" /><p>Verify farmer documents before procurement. Check crop quality, record accepted weight, and complete procurement before initiating payment.</p></Card></div></div>;
}
