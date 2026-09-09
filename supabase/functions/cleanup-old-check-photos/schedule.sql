-- Run once in the SQL Editor to schedule photo cleanup weekly,
-- Sunday at 03:00 UTC (low-traffic time). Requires pg_cron and
-- pg_net (both enabled already if you followed the earlier setup).
--
-- Replace <PROJECT_REF> and <SERVICE_ROLE_KEY> with your NEW
-- project's values before running.

select cron.schedule(
  'cleanup-old-check-photos-weekly',
  '0 3 * * 0',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/cleanup-old-check-photos',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- Check it's registered:
-- select * from cron.job;

-- Remove later if needed:
-- select cron.unschedule('cleanup-old-check-photos-weekly');
