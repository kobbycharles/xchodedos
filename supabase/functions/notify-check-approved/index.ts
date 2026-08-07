// supabase/functions/notify-check-approved/index.ts
//
// Triggered by a Database Webhook on `pre_use_checks` (UPDATE only).
// Notifies the driver when their check moves to approved or declined.
//
// Webhook setup:
//   Table: pre_use_checks
//   Events: Update
//   Type: HTTP Request → select this function
//
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

Deno.serve(async (req) => {
  const payload = await req.json();
  const record = payload.record;
  const oldRecord = payload.old_record;

  // Only fire the moment status actually changes away from pending.
  const justReviewed = oldRecord?.status === 'pending' && (record.status === 'approved' || record.status === 'declined');
  if (!justReviewed || !record.driver_id) {
    return new Response(JSON.stringify({ sent: 0, reason: 'not a review transition' }));
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  );

  const title = record.status === 'approved' ? 'Check Approved ✓' : 'Check Declined';
  const body = record.status === 'approved'
    ? `Your pre-use check for ${record.check_date} was approved.`
    : `Your pre-use check for ${record.check_date} was declined.${record.officer_notes ? ' ' + record.officer_notes : ''}`;

  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', record.driver_id);
  let sent = 0, failed = 0;
  await Promise.all((subs ?? []).map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify({ title, body, url: '/pages/driver/dashboard.html' }),
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
