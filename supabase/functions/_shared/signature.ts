// Verificación pura de la firma HMAC del webhook de Mercado Pago.
// MP envía la cabecera `x-signature` con formato `ts=<timestamp>,v1=<hmac>`.
// El manifest a firmar es `id:<dataId>;request-id:<xRequestId>;ts:<ts>;` y el
// HMAC-SHA256 se calcula con el secreto del webhook. La comparación es en
// tiempo constante para evitar fugas por temporización.
//
// Función pura: no lee Deno.env ni hace I/O; recibe el secreto por parámetro.

export interface VerifyWebhookSignatureInput {
  xSignature: string | null | undefined;
  xRequestId: string | null | undefined;
  dataId: string | null | undefined;
  secret: string;
}

// Parsea `ts=...,v1=...` (orden y espacios arbitrarios) en sus partes.
function parseSignatureHeader(
  xSignature: string,
): { ts: string | null; v1: string | null } {
  let ts: string | null = null;
  let v1: string | null = null;

  for (const part of xSignature.split(",")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }
    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (key === "ts") {
      ts = value;
    } else if (key === "v1") {
      v1 = value;
    }
  }

  return { ts, v1 };
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) {
      return null;
    }
    bytes[i] = byte;
  }
  return bytes;
}

// Comparación en tiempo constante sobre arreglos de bytes de igual longitud.
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function verifyWebhookSignature(
  input: VerifyWebhookSignatureInput,
): Promise<boolean> {
  const { xSignature, xRequestId, dataId, secret } = input;

  if (!xSignature || !xRequestId || !dataId || !secret) {
    return false;
  }

  const { ts, v1 } = parseSignatureHeader(xSignature);
  if (!ts || !v1) {
    return false;
  }

  const expectedBytes = hexToBytes(v1);
  if (!expectedBytes) {
    return false;
  }

  // MP normaliza el id alfanumérico a minúsculas dentro del manifest.
  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const computed = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(manifest)),
  );

  return timingSafeEqual(computed, expectedBytes);
}
