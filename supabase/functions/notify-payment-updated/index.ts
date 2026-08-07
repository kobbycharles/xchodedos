// supabase/functions/notify-payment-updated/index.ts
//
// Triggered by a Database Webhook on the `payments` table (INSERT and
// UPDATE). Notifies the driver whenever a payment is recorded or its
// status changes.
//
// Webhook setup (Dashboard → Database → Webhooks → Create a new webhook):
//   Table: payments
//   Events: Insert, Update
//   Type: HTTP Request → select this function
//
// Secrets needed (same as send-maintenance-reminders):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

Deno.serve(async (req) => {
  const payload = await req.json();
  const record = payload.record;
  const oldRecord = payload.old_record;
  if (!record?.driver_id) return new Response(JSON.stringify({ sent: 0, reason: 'no driver_id' }));

  // Only notify on a genuinely new/changed paid payment — avoids noise on
  // every minor edit (e.g. an officer fixing a typo in notes).
  const isNewPaid = payload.type === 'INSERT' && record.status === 'paid';
  const statusChanged = payload.type === 'UPDATE' && oldRecord && record.status !== oldRecord.status;
  const amountChanged = payload.type === 'UPDATE' && oldRecord && record.amount !== oldRecord.amount;
  if (!isNewPaid && !statusChanged && !amountChanged) {
    return new Response(JSON.stringify({ sent: 0, reason: 'not a notifiable change' }));
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

  const amount = parseFloat(record.amount).toFixed(2);
  const label = record.payment_method === 'deposit' ? 'Deposit payment' : 'Weekly payment';
  const title = 'Payment Recorded';
  const body = record.status === 'paid'
    ? `${label} of GHS ${amount} has been recorded.`
    : `${label} of GHS ${amount} is now marked "${record.status}".`;

  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', record.driver_id);
  let sent = 0, failed = 0;
  await Promise.all((subs ?? []).map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify({ title, body, url: '/pages/driver/payments.html' }),
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
