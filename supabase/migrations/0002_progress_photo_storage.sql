-- Private storage bucket for progress photos.
-- Objects are stored under <client_uuid>/<filename>; the first path segment
-- controls access: the client themselves, or any coach.

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

create policy "progress_photos_select" on storage.objects
  for select using (
    bucket_id = 'progress-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach())
  );

create policy "progress_photos_insert" on storage.objects
  for insert with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "progress_photos_delete" on storage.objects
  for delete using (
    bucket_id = 'progress-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach())
  );
