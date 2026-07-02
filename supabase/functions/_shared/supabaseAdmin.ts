// Factory perezosa del cliente de Supabase con service role.
// Los secretos (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) se leen SOLO al
// invocar la factory, nunca en tiempo de import, para no fallar cuando el
// módulo se importa en tests sin credenciales.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export function createSupabaseAdminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url) {
    throw new Error("Missing SUPABASE_URL environment variable");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
