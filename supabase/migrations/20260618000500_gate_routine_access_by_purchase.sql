-- El acceso del cliente a rutinas/dias/ejercicios/videos solo comprobaba
-- routines.status = 'assigned', por lo que el acceso NUNCA se revocaba cuando la
-- compra asociada dejaba de estar vigente (payment_status pasa a rejected/
-- cancelled/refunded/expired) o su end_date ya habia pasado. El disparador
-- validate_assigned_routine solo valida payment_status='approved' una vez, al
-- escribir la rutina, y no reacciona a cambios en public.purchases.
--
-- Se anade la vigencia de la compra a la ruta de lectura: cada funcion
-- can_access_* y la politica routines_read_assigned_or_admin exigen ahora una
-- compra 'approved' del propio cliente cuyo end_date sea nulo o futuro. Esto
-- cubre tanto el reembolso/cancelacion como la expiracion por end_date sin
-- depender de un job externo que actualice payment_status.

create or replace function private.can_access_routine(target_routine_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.routines as r
    join public.purchases as p
      on p.id = r.purchase_id
      and p.user_id = r.user_id
    where r.id = target_routine_id
      and r.user_id = (select auth.uid())
      and r.status = 'assigned'
      and p.payment_status = 'approved'
      and (p.end_date is null or p.end_date > now())
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
    join public.purchases as p
      on p.id = r.purchase_id
      and p.user_id = r.user_id
    where rd.id = target_routine_day_id
      and r.user_id = (select auth.uid())
      and r.status = 'assigned'
      and p.payment_status = 'approved'
      and (p.end_date is null or p.end_date > now())
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
    join public.purchases as p
      on p.id = r.purchase_id
      and p.user_id = r.user_id
    where re.exercise_id = target_exercise_id
      and r.user_id = (select auth.uid())
      and r.status = 'assigned'
      and p.payment_status = 'approved'
      and (p.end_date is null or p.end_date > now())
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
    join public.purchases as p
      on p.id = r.purchase_id
      and p.user_id = r.user_id
    where e.video_path = target_object_name
      and r.user_id = (select auth.uid())
      and r.status = 'assigned'
      and p.payment_status = 'approved'
      and (p.end_date is null or p.end_date > now())
  );
$$;

drop policy routines_read_assigned_or_admin on public.routines;

create policy routines_read_assigned_or_admin
on public.routines
for select
to authenticated
using (
  (select private.is_admin())
  or (
    user_id = (select auth.uid())
    and status = 'assigned'
    and exists (
      select 1
      from public.purchases as p
      where p.id = routines.purchase_id
        and p.user_id = routines.user_id
        and p.payment_status = 'approved'
        and (p.end_date is null or p.end_date > now())
    )
  )
);
