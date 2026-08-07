// supabase/functions/notify-check-submitted/index.ts
//
// Triggered by a Database Webhook on `pre_use_checks` (INSERT only).
// Notifies the driver's officer(s) that a new pre-use check needs review.
//
// Webhook setup:
//   Table: pre_use_checks
//   Events: Insert
//   Type: HTTP Request → select this function
//
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

Deno.serve(async (req) => {
  const payload = await req.json();
  const record = payload.record;
  if (!record?.driver_id) return new Response(JSON.stringify({ sent: 0, reason: 'no driver_id' }));

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  );

  const { data: driver } = await supabase.from('profiles').select('full_name').eq('id', record.driver_id).single();
  const { data: oda } = await supabase.from('officer_driver_assignments').select('officer_id').eq('driver_id', record.driver_id).eq('is_active', true);
  const officerIds = [...new Set((oda ?? []).map(o => o.officer_id))];
  if (!officerIds.length) return new Response(JSON.stringify({ sent: 0, reason: 'no assigned officer' }));

  const title = 'New Pre-Use Check';
  const body = `${driver?.full_name ?? 'A driver'} submitted a check for ${record.check_date}.`;

  const { data: subs } = await supabase.from('push_subscriptions').select('*').in('user_id', officerIds);
  await supabase.from('notifications').insert(officerIds.map(id => ({ user_id: id, title, body, url: '/pages/officer/checks.html' })));
  let sent = 0, failed = 0;
  await Promise.all((subs ?? []).map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify({ title, body, url: '/pages/officer/checks.html' }),
      );
      sent++;
    } catch (err) {
      failed++;
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
      }
    }
  }));

  return new Response(JSON.stringify({ sent, failed }));
});
