import React from 'react';
import { renderToString } from 'react-dom/server';
import { SuperadminTriagePanel } from '../src/components/admin/SuperadminV2Components';

const stats = { total: 10, open: 5, critical: 2, breached: 1, snoozed: 0 };
console.log(renderToString(<SuperadminTriagePanel stats={stats} />));
