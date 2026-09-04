import React from 'react';
import { Stepper } from './UI';
import { stages } from '../data/seed';
export function ProcurementProgress({
  token
}) {
  return <Stepper steps={stages.map((label, i) => ({
    label,
    note: i < token.stage ? 'Verified at center' : i === token.stage ? 'Current stage' : 'Pending'
  }))} active={token.stage === 5 ? 6 : token.stage} />;
}
