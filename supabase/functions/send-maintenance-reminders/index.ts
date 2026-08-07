// supabase/functions/send-maintenance-reminders/index.ts
//
// Runs on a schedule (see the pg_cron SQL provided alongside this file).
// Checks every car's maintenance status and sends a web push notification
// to the assigned driver AND their officer for anything due soon or overdue.
//
// Secrets this function needs (set via `supabase secrets set`):
//   VAPID_PUBLIC_KEY   — same value as VAPID_PUBLIC_KEY in js/push.js
//   VAPID_PRIVATE_KEY  — NEVER put this in client code
//   VAPID_SUBJECT      — e.g. "mailto:you@yourdomain.com"
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are already available
// automatically inside every Edge Function — no need to set them.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

const MAINTENANCE_TYPES: Record<string, { label: string; intervalDays: number }> = {
  oil_change:         { label: 'Engine Oil Change',  intervalDays: 30 },
  transmission_fluid: { label: 'Transmission Fluid', intervalDays: 365 },
  coolant_flush:      { label: 'Coolant Flush',       intervalDays: 183 },
};
const DUE_SOON_WINDOW_DAYS = 7;

function computeStatus(lastServiceDate: string | null, intervalDays: number) {
  if (!lastServiceDate) return { daysUntilDue: null, status: 'unknown' as const };
  const last = new Date(lastServiceDate); last.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  const dueDate = new Date(last.getTime() + intervalDays*24*60*60*1000);
  const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / (24*60*60*1000));
  let status: 'ok'|'due_soon'|'overdue' = 'ok';
  if (daysUntilDue < 0) status = 'overdue';
  else if (daysUntilDue <= DUE_SOON_WINDOW_DAYS) status = 'due_soon';
  return { daysUntilDue, status };
}

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  );

  // 1. Active assignments: car -> driver -> officer
  const { data: assignments, error: aErr } = await supabase
    .from('driver_assignments')
    .select('car_id, driver_id, cars(make, model, plate_number)')
    .eq('is_active', true);
  if (aErr) return new Response(JSON.stringify({ error: aErr.message }), { status: 500 });

  const carIds = [...new Set((assignments ?? []).map(a => a.car_id).filter(Boolean))];
  if (!carIds.length) return new Response(JSON.stringify({ sent: 0, reason: 'no active cars' }));

  const { data: logs } = await supabase.from('car_maintenance_log').select('*').in('car_id', carIds);
  const logsByCar: Record<string, any[]> = {};
  (logs ?? []).forEach(l => { (logsByCar[l.car_id] ||= []).push(l); });

  const { data: oda } = await supabase.from('officer_driver_assignments').select('officer_id, driver_id').eq('is_active', true);
  const officerByDriver: Record<string,string> = {};
  (oda ?? []).forEach(o => { officerByDriver[o.driver_id] = o.officer_id; });

  // 2. Build the list of (user_id, message) notifications to send
  type Notif = { userId: string; title: string; body: string };
  const notifs: Notif[] = [];

  for (const a of assignments ?? []) {
    if (!a.car_id) continue;
    const carLogs = logsByCar[a.car_id] ?? [];
    const carLabel = a.cars ? `${a.cars.make} ${a.cars.model} (${a.cars.plate_number})` : 'Vehicle';

    for (const [type, cfg] of Object.entries(MAINTENANCE_TYPES)) {
      const entries = carLogs.filter(l => l.maintenance_type === type)
        .sort((x,y) => new Date(y.service_date).getTime() - new Date(x.service_date).getTime());
      const last = entries[0]?.service_date ?? null;
      const { daysUntilDue, status } = computeStatus(last, cfg.intervalDays);
      if (status !== 'due_soon' && status !== 'overdue') continue;

      // Only fire on the first day of the due_soon window, on the due
      // date itself, and every day while overdue — avoids nagging daily
      // through the whole 7-day due_soon window.
      const shouldNotify = status === 'overdue' || daysUntilDue === DUE_SOON_WINDOW_DAYS || daysUntilDue === 0;
      if (!shouldNotify) continue;

      const body = status === 'overdue'
        ? `${cfg.label} is overdue for ${carLabel}.`
        : `${cfg.label} due in ${daysUntilDue} day${daysUntilDue===1?'':'s'} for ${carLabel}.`;

      if (a.driver_id) notifs.push({ userId: a.driver_id, title: 'Vehicle Maintenance', body });
      const officerId = officerByDriver[a.driver_id];
      if (officerId) notifs.push({ userId: officerId, title: 'Maintenance Alert', body: `${body} (${carLabel})` });
    }
  }

  if (!notifs.length) return new Response(JSON.stringify({ sent: 0, reason: 'nothing due' }));

  // 3. Send. One push subscription lookup per unique user.
  const userIds = [...new Set(notifs.map(n => n.userId))];
  const { data: subs } = await supabase.from('push_subscriptions').select('*').in('user_id', userIds);
  const subsByUser: Record<string, any[]> = {};
  (subs ?? []).forEach(s => { (subsByUser[s.user_id] ||= []).push(s); });

  await supabase.from('notifications').insert(
    notifs.map(n => ({ user_id: n.userId, title: n.title, body: n.body, url: '/pages/officer/fleet.html' }))
  );

  let sent = 0, failed = 0;
  await Promise.all(notifs.map(async n => {
    for (const sub of subsByUser[n.userId] ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify({ title: n.title, body: n.body, url: '/pages/officer/fleet.html' }),
        );
        sent++;
      } catch (err) {
        failed++;
        // 410/404 means the subscription is dead — clean it up.
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }
  }));

  return new Response(JSON.stringify({ sent, failed, notifications: notifs.length }));
});
