-- Run once in the SQL Editor to schedule the maintenance reminder
-- function daily at 07:00 UTC. Requires the pg_cron and pg_net
-- extensions (both available by default on Supabase projects).

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'send-maintenance-reminders-daily',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://kgbqjcataatpfpxfvkpc.supabase.co/functions/v1/send-maintenance-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnYnFqY2F0YWF0cGZweGZ2a3BjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjA0OTk4OSwiZXhwIjoyMDk3NjI1OTg5fQ.C4c9g-oJ-9qlGqOc8OmhBDe728185qdssyEbm6GLsXc',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- To check it's registered:
-- select * from cron.job;

-- To remove it later:
-- select cron.unschedule('send-maintenance-reminders-daily');
