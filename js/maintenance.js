// js/maintenance.js — Vehicle maintenance interval logic
// Plain global script (not a module) so it can be included with a
// normal <script src="/js/maintenance.js"></script> tag on any page,
// matching how officer/driver pages are built in this app.

const MAINTENANCE_TYPES = {
  oil_change:          { label: 'Engine Oil Change',     intervalDays: 30  },
  transmission_fluid:  { label: 'Transmission Fluid',    intervalDays: 365 },
  coolant_flush:       { label: 'Coolant Flush',         intervalDays: 183 },
  roadworthy:          { label: 'Roadworthy Certificate',intervalDays: 365, usesExplicitDueDate: true },
  insurance:           { label: 'Insurance',             intervalDays: 365, usesExplicitDueDate: true },
};

// A reminder starts showing this many days before the due date.
const MAINTENANCE_DUE_SOON_WINDOW_DAYS = 7;

// Given the most recent service_date for one maintenance type (or null
// if it's never been logged), return its due date and status.
// status: 'unknown' | 'ok' | 'due_soon' | 'overdue'
// explicitDueDate: for types like roadworthy/insurance, the renewal date
// is set by an outside authority (inspection center, insurer) rather than
// always landing exactly N days after the last one — pass it in when known
// and it overrides the interval-based calculation.
function computeMaintenanceStatus(lastServiceDate, intervalDays, explicitDueDate) {
  if (!lastServiceDate) return { dueDate: null, daysUntilDue: null, status: 'unknown' };

  const today = new Date(); today.setHours(0,0,0,0);
  let dueDate;
  if (explicitDueDate) {
    dueDate = new Date(explicitDueDate); dueDate.setHours(0,0,0,0);
  } else {
    const last = new Date(lastServiceDate); last.setHours(0,0,0,0);
    dueDate = new Date(last.getTime() + intervalDays*24*60*60*1000);
  }
  const daysUntilDue = Math.round((dueDate - today) / (24*60*60*1000));

  let status = 'ok';
  if (daysUntilDue < 0) status = 'overdue';
  else if (daysUntilDue <= MAINTENANCE_DUE_SOON_WINDOW_DAYS) status = 'due_soon';

  return { dueDate, daysUntilDue, status };
}

// Given all car_maintenance_log rows for ONE car, return a status
// object per maintenance type using each type's most recent service_date
// (and next_due_date, for types that track an explicit renewal date).
function getCarMaintenanceSummary(logs) {
  const summary = {};
  for (const type of Object.keys(MAINTENANCE_TYPES)) {
    const entries = (logs||[]).filter(l => l.maintenance_type === type)
      .sort((a,b) => new Date(b.service_date) - new Date(a.service_date));
    const latest = entries[0];
    const last = latest?.service_date || null;
    const explicitDue = latest?.next_due_date || null;
    summary[type] = {
      ...MAINTENANCE_TYPES[type],
      lastServiceDate: last,
      ...computeMaintenanceStatus(last, MAINTENANCE_TYPES[type].intervalDays, explicitDue),
    };
  }
  return summary;
}

// Convenience: does this summary have anything due_soon or overdue?
function hasMaintenanceAlert(summary) {
  return Object.values(summary).some(s => s.status === 'due_soon' || s.status === 'overdue');
}

function formatMaintenanceDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}
