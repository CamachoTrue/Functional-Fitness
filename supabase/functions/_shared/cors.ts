// Cabeceras CORS compartidas por las Edge Functions.
// El origen permitido se toma de APP_URL (configurado como secreto en Deno.env);
// si no está definido se cae a "*" para no romper preflights en desarrollo local.

export function getAllowedOrigin(): string {
  return Deno.env.get("APP_URL") ?? "*";
}

export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    // supabase-js (functions.invoke) envía también x-client-info y, en versiones
    // recientes, x-supabase-api-version. Si no se permiten, el navegador bloquea
    // el POST tras el preflight (se ve solo el OPTIONS 204 y nunca llega el POST).
    "Access-Control-Allow-Headers":
      "authorization, content-type, apikey, x-client-info, x-supabase-api-version",
    "Vary": "Origin",
  };
}

// Respuesta estándar al preflight OPTIONS.
export function handleCorsPreflight(request: Request): Response | null {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  return null;
}
