-- handle_new_user() copiaba raw_user_meta_data.full_name sin recortar. Como el
-- metadata lo controla el usuario, un nombre > 120 caracteres viola la
-- constraint profiles_full_name_length dentro del trigger AFTER INSERT y hace
-- rollback del alta en auth.users ("Database error saving new user"). Se recorta
-- a 120 caracteres para que el registro nunca falle por esta causa.
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
    left(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 120),
    new.email
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'client');

  return new;
end;
$$;
