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
    "Access-Control-Allow-Headers":
      "authorization, content-type, apikey",
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
