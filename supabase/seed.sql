insert into public.packages (
  id,
  name,
  description,
  price,
  currency,
  duration_days,
  includes,
  is_recommended,
  is_active
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Plan Basico',
    'Rutina mensual con acceso a ejercicios y videos de referencia.',
    499.00,
    'MXN',
    30,
    array['Rutina mensual', 'Videos de ejercicios'],
    false,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Plan Personalizado',
    'Rutina adaptada a tu objetivo, nivel, equipo disponible y limitaciones.',
    899.00,
    'MXN',
    30,
    array['Evaluacion inicial', 'Rutina personalizada', 'Videos de ejercicios'],
    true,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'Plan Premium',
    'Entrenamiento personalizado con seguimiento y ajustes semanales.',
    1499.00,
    'MXN',
    30,
    array['Evaluacion inicial', 'Rutina personalizada', 'Ajustes semanales', 'Seguimiento'],
    false,
    true
  )
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  currency = excluded.currency,
  duration_days = excluded.duration_days,
  includes = excluded.includes,
  is_recommended = excluded.is_recommended,
  is_active = excluded.is_active;
