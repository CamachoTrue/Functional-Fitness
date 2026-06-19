create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function private.can_access_routine(target_routine_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.routines
    where id = target_routine_id
      and user_id = (select auth.uid())
      and status = 'assigned'
  );
$$;

create or replace function private.can_access_routine_day(target_routine_day_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.routine_days as rd
    join public.routines as r on r.id = rd.routine_id
    where rd.id = target_routine_day_id
      and r.user_id = (select auth.uid())
      and r.status = 'assigned'
  );
$$;

create or replace function private.can_access_exercise(target_exercise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.routine_exercises as re
    join public.routine_days as rd on rd.id = re.routine_day_id
    join public.routines as r on r.id = rd.routine_id
    where re.exercise_id = target_exercise_id
      and r.user_id = (select auth.uid())
      and r.status = 'assigned'
  );
$$;

create or replace function private.can_access_exercise_video(target_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.exercises as e
    join public.routine_exercises as re on re.exercise_id = e.id
    join public.routine_days as rd on rd.id = re.routine_day_id
    join public.routines as r on r.id = rd.routine_id
    where e.video_path = target_object_name
      and r.user_id = (select auth.uid())
      and r.status = 'assigned'
  );
$$;

revoke all on all functions in schema private from public;
grant usage on schema private to authenticated, service_role;
grant execute on function private.is_admin() to authenticated, service_role;
grant execute on function private.can_access_routine(uuid) to authenticated, service_role;
grant execute on function private.can_access_routine_day(uuid) to authenticated, service_role;
grant execute on function private.can_access_exercise(uuid) to authenticated, service_role;
grant execute on function private.can_access_exercise_video(text) to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.packages enable row level security;
alter table public.purchases enable row level security;
alter table public.questionnaires enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_exercises enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.user_roles from anon, authenticated;
revoke all on table public.packages from anon, authenticated;
revoke all on table public.purchases from anon, authenticated;
revoke all on table public.questionnaires from anon, authenticated;
revoke all on table public.exercises from anon, authenticated;
revoke all on table public.routines from anon, authenticated;
revoke all on table public.routine_days from anon, authenticated;
revoke all on table public.routine_exercises from anon, authenticated;

grant select on table public.packages to anon;

grant select on table public.profiles to authenticated;
grant update (full_name, phone) on table public.profiles to authenticated;
grant select on table public.user_roles to authenticated;
grant select, insert, update, delete on table public.packages to authenticated;
grant select on table public.purchases to authenticated;
grant select, insert, update on table public.questionnaires to authenticated;
grant select, insert, update, delete on table public.exercises to authenticated;
grant select, insert, update, delete on table public.routines to authenticated;
grant select, insert, update, delete on table public.routine_days to authenticated;
grant select, insert, update, delete on table public.routine_exercises to authenticated;

grant all privileges on table public.profiles to service_role;
grant all privileges on table public.user_roles to service_role;
grant all privileges on table public.packages to service_role;
grant all privileges on table public.purchases to service_role;
grant all privileges on table public.questionnaires to service_role;
grant all privileges on table public.exercises to service_role;
grant all privileges on table public.routines to service_role;
grant all privileges on table public.routine_days to service_role;
grant all privileges on table public.routine_exercises to service_role;

grant usage on type public.app_role to authenticated, service_role;
grant usage on type public.payment_status to authenticated, service_role;
grant usage on type public.routine_status to authenticated, service_role;
grant usage on type public.exercise_level to authenticated, service_role;

create policy profiles_read_own_or_admin
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_admin())
);

create policy profiles_update_own_or_admin
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_admin())
)
with check (
  id = (select auth.uid())
  or (select private.is_admin())
);

create policy user_roles_read_own_or_admin
on public.user_roles
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_admin())
);

create policy packages_read_active
on public.packages
for select
to anon, authenticated
using (is_active);

create policy packages_admin_all
on public.packages
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy purchases_read_own_or_admin
on public.purchases
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_admin())
);

create policy questionnaires_read_own_or_admin
on public.questionnaires
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_admin())
);

create policy questionnaires_create_own_approved_purchase
on public.questionnaires
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.purchases
    where purchases.id = questionnaires.purchase_id
      and purchases.user_id = (select auth.uid())
      and purchases.payment_status = 'approved'
  )
);

create policy questionnaires_update_own_approved_purchase
on public.questionnaires
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.purchases
    where purchases.id = questionnaires.purchase_id
      and purchases.user_id = (select auth.uid())
      and purchases.payment_status = 'approved'
  )
);

create policy exercises_read_assigned_or_admin
on public.exercises
for select
to authenticated
using (
  (select private.is_admin())
  or (select private.can_access_exercise(id))
);

create policy exercises_admin_write
on public.exercises
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy routines_read_assigned_or_admin
on public.routines
for select
to authenticated
using (
  (select private.is_admin())
  or (
    user_id = (select auth.uid())
    and status = 'assigned'
  )
);

create policy routines_admin_write
on public.routines
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy routine_days_read_assigned_or_admin
on public.routine_days
for select
to authenticated
using (
  (select private.is_admin())
  or (select private.can_access_routine(routine_id))
);

create policy routine_days_admin_write
on public.routine_days
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy routine_exercises_read_assigned_or_admin
on public.routine_exercises
for select
to authenticated
using (
  (select private.is_admin())
  or (select private.can_access_routine_day(routine_day_id))
);

create policy routine_exercises_admin_write
on public.routine_exercises
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'exercise-videos',
  'exercise-videos',
  false,
  52428800,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy exercise_videos_admin_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'exercise-videos'
  and (select private.is_admin())
);

create policy exercise_videos_client_read_assigned
on storage.objects
for select
to authenticated
using (
  bucket_id = 'exercise-videos'
  and (select private.can_access_exercise_video(name))
);

create policy exercise_videos_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'exercise-videos'
  and (storage.foldername(name))[1] = 'exercises'
  and (select private.is_admin())
);

create policy exercise_videos_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'exercise-videos'
  and (select private.is_admin())
)
with check (
  bucket_id = 'exercise-videos'
  and (storage.foldername(name))[1] = 'exercises'
  and (select private.is_admin())
);

create policy exercise_videos_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'exercise-videos'
  and (select private.is_admin())
);
