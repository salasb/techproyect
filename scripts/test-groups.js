const alerts = [
  { severity: 'critical', sla: { status: 'BREACHED' }, state: 'open' },
  { severity: 'warning', sla: { status: 'AT_RISK' }, state: 'open' },
  { severity: 'info', sla: { status: 'ON_TRACK' }, state: 'open' },
  { severity: 'critical', sla: { status: 'AT_RISK' }, state: 'acknowledged' },
  { severity: 'warning', sla: { status: 'BREACHED' }, state: 'open' },
  { severity: 'info', sla: null, state: 'snoozed' },
  { severity: 'critical', sla: null, state: 'resolved' },
];

const groups = {
    critical: alerts.filter(a => (a.severity === 'critical' || a.sla?.status === 'BREACHED') && a.state !== 'resolved' && a.state !== 'snoozed'),
    risk: alerts.filter(a => (a.severity === 'warning' || a.sla?.status === 'AT_RISK') && a.state !== 'resolved' && a.state !== 'snoozed' && !(a.severity === 'critical' || a.sla?.status === 'BREACHED')),
    open: alerts.filter(a => (a.state === 'open' || a.state === 'acknowledged') && !(a.severity === 'critical' || a.sla?.status === 'BREACHED' || a.severity === 'warning' || a.sla?.status === 'AT_RISK')),
    snoozed: alerts.filter(a => a.state === 'snoozed'),
    resolved: alerts.filter(a => a.state === 'resolved')
};

let sum = 0;
for (const key in groups) {
    sum += groups[key].length;
    console.log(key, groups[key].length);
}
console.log("Total alerts:", alerts.length);
console.log("Sum of groups:", sum);
