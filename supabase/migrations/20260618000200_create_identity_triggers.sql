create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    new.email
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'client');

  return new;
end;
$$;

create or replace function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;

  return new;
end;
$$;

create or replace function private.validate_assigned_routine()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'assigned' then
    if not exists (
      select 1
      from public.purchases
      where id = new.purchase_id
        and user_id = new.user_id
        and payment_status = 'approved'
    ) then
      raise exception 'An assigned routine requires an approved purchase owned by the client.';
    end if;

    new.assigned_at = coalesce(new.assigned_at, now());
  elsif tg_op = 'UPDATE' then
    if old.status = 'assigned' and new.status <> 'assigned' then
      new.assigned_at = null;
    end if;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();

create trigger validate_routine_before_write
  before insert or update of status, purchase_id, user_id on public.routines
  for each row execute function private.validate_assigned_routine();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger packages_set_updated_at
  before update on public.packages
  for each row execute function private.set_updated_at();

create trigger purchases_set_updated_at
  before update on public.purchases
  for each row execute function private.set_updated_at();

create trigger questionnaires_set_updated_at
  before update on public.questionnaires
  for each row execute function private.set_updated_at();

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function private.set_updated_at();

create trigger routines_set_updated_at
  before update on public.routines
  for each row execute function private.set_updated_at();

create trigger routine_days_set_updated_at
  before update on public.routine_days
  for each row execute function private.set_updated_at();

create trigger routine_exercises_set_updated_at
  before update on public.routine_exercises
  for each row execute function private.set_updated_at();
