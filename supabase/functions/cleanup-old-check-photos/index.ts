// supabase/functions/cleanup-old-check-photos/index.ts
//
// Scheduled job (see schedule.sql alongside this file) that deletes
// pre-use check photos older than RETENTION_DAYS from Storage, to keep
// the free tier's 1GB storage limit from filling up over time. The
// pre_use_checks database rows themselves are kept (for approval
// history/audit purposes) — only the actual image files are removed,
// and photo_urls is cleared so the UI doesn't show broken links.

import { createClient } from 'npm:@supabase/supabase-js@2';

const RETENTION_DAYS = 90;
const BUCKET = 'pre-check-photos';

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffDate = cutoff.toISOString().split('T')[0];

  const { data: oldChecks, error: fetchErr } = await supabase
    .from('pre_use_checks')
    .select('id, photo_urls')
    .lt('check_date', cutoffDate);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 });
  }
  if (!oldChecks || !oldChecks.length) {
    return new Response(JSON.stringify({ processed: 0, filesDeleted: 0, message: 'No old checks found.' }));
  }

  let filesDeleted = 0;
  let processed = 0;
  const errors: string[] = [];

  for (const check of oldChecks) {
    const urls: string[] = check.photo_urls ?? [];
    if (!urls.length) continue;

    // Extract the storage path from each public URL:
    // https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const paths = urls
      .map((u) => {
        const marker = `/object/public/${BUCKET}/`;
        const idx = u.indexOf(marker);
        return idx === -1 ? null : u.slice(idx + marker.length);
      })
      .filter((p): p is string => !!p);

    if (paths.length) {
      const { error: delErr } = await supabase.storage.from(BUCKET).remove(paths);
      if (delErr) {
        errors.push(`check ${check.id}: ${delErr.message}`);
        continue; // leave photo_urls intact so it's retried next run
      }
      filesDeleted += paths.length;
    }

    await supabase.from('pre_use_checks').update({ photo_urls: [] }).eq('id', check.id);
    processed++;
  }

  return new Response(JSON.stringify({ processed, filesDeleted, errors }));
});
