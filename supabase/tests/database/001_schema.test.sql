begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'user_roles', 'user_roles table exists');
select has_table('public', 'packages', 'packages table exists');
select has_table('public', 'purchases', 'purchases table exists');
select has_table('public', 'questionnaires', 'questionnaires table exists');
select has_table('public', 'exercises', 'exercises table exists');
select has_table('public', 'routines', 'routines table exists');
select has_table('public', 'routine_days', 'routine_days table exists');
select has_table('public', 'routine_exercises', 'routine_exercises table exists');

select is(
  (
    select count(*)::integer
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname in (
        'profiles',
        'user_roles',
        'packages',
        'purchases',
        'questionnaires',
        'exercises',
        'routines',
        'routine_days',
        'routine_exercises'
      )
      and pg_class.relrowsecurity
  ),
  9,
  'RLS is enabled on every public domain table'
);

select ok(
  to_regprocedure('private.is_admin()') is not null,
  'private admin authorization helper exists'
);

select is(
  (select public from storage.buckets where id = 'exercise-videos'),
  false,
  'exercise video bucket is private'
);

select * from finish();
rollback;
