-- Assumes public.scooter_parking(id, moto_capacity) and public.profiles(id, role).
-- Keep the evidence bucket private; return time-limited signed URLs only to reviewers.
-- Set reporting_enabled = true only for the 育樂街路邊機車位 record after migration.

alter table public.scooter_parking
  add column if not exists capacity_source text not null default 'government_data'
    check (capacity_source in ('government_data', 'admin_verified', 'user_report_verified')),
  add column if not exists capacity_updated_at timestamptz not null default now(),
  add column if not exists reporting_enabled boolean not null default false;

create table if not exists public.parking_reports (
  id uuid primary key default gen_random_uuid(),
  parking_id uuid not null references public.scooter_parking(id),
  user_id uuid not null references auth.users(id),
  current_capacity integer not null check (current_capacity >= 0),
  reported_capacity integer not null check (reported_capacity >= 0),
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  approved_capacity integer check (approved_capacity >= 0),
  constraint parking_reports_review_state check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (status in ('approved', 'rejected') and reviewed_at is not null and reviewed_by is not null)
  )
);

create table if not exists public.parking_report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.parking_reports(id) on delete cascade,
  image_path text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists parking_reports_status_created_at_idx
  on public.parking_reports (status, created_at desc);
create index if not exists parking_reports_parking_id_idx
  on public.parking_reports (parking_id);
create index if not exists parking_report_photos_report_id_idx
  on public.parking_report_photos (report_id);

alter table public.parking_reports enable row level security;
alter table public.parking_report_photos enable row level security;

create policy "Users submit their own parking reports"
  on public.parking_reports for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
    and exists (
      select 1 from public.scooter_parking
      where id = parking_id and reporting_enabled
    )
  );

create policy "Users view their own parking reports"
  on public.parking_reports for select to authenticated
  using (user_id = auth.uid());

create policy "Admins manage parking reports"
  on public.parking_reports for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Users attach photos to their own pending reports"
  on public.parking_report_photos for insert to authenticated
  with check (exists (
    select 1 from public.parking_reports
    where id = report_id and user_id = auth.uid() and status = 'pending'
  ));

create policy "Users view their own report photos"
  on public.parking_report_photos for select to authenticated
  using (exists (select 1 from public.parking_reports where id = report_id and user_id = auth.uid()));

create policy "Admins manage report photos"
  on public.parking_report_photos for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'parking-report-images',
  'parking-report-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Users upload evidence to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'parking-report-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users view their own evidence"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'parking-report-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Admins view all parking evidence"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'parking-report-images'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create or replace function public.review_parking_report(
  report_id uuid,
  decision text,
  corrected_capacity integer default null
)
returns public.parking_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewed_report public.parking_reports;
  final_capacity integer;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Administrator permission required';
  end if;
  if decision not in ('approved', 'rejected') then
    raise exception 'Invalid review decision';
  end if;

  select * into reviewed_report from public.parking_reports where id = report_id for update;
  if not found or reviewed_report.status <> 'pending' then
    raise exception 'Only pending reports can be reviewed';
  end if;

  if decision = 'approved' then
    final_capacity := coalesce(corrected_capacity, reviewed_report.reported_capacity);
    if final_capacity < 0 then raise exception 'Capacity must be zero or greater'; end if;
    update public.scooter_parking
      set moto_capacity = final_capacity,
          capacity_source = 'user_report_verified',
          capacity_updated_at = now()
      where id = reviewed_report.parking_id;
  end if;

  update public.parking_reports
    set status = decision,
        approved_capacity = case when decision = 'approved' then final_capacity else null end,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    where id = report_id
    returning * into reviewed_report;
  return reviewed_report;
end;
$$;

revoke all on function public.review_parking_report(uuid, text, integer) from public;
grant execute on function public.review_parking_report(uuid, text, integer) to authenticated;