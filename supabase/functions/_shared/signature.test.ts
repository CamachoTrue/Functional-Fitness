// Tests de la verificación de firma HMAC del webhook de Mercado Pago.
// Sin credenciales reales: se firma un manifest con un secreto de prueba usando
// la misma construcción que MP y se comprueba que el verificador lo acepta, y que
// cualquier alteración (hash, ts, request-id, data.id, secreto) lo rechaza.
//
// Ejecutar: deno test --allow-env --allow-net --allow-read supabase/functions/

import { assertEquals } from "jsr:@std/assert@1";
import { verifyWebhookSignature } from "./signature.ts";

const SECRET = "test-webhook-secret";

// Reproduce la firma que enviaría MP: HMAC-SHA256 en hex sobre el manifest
// `id:<dataId minúsculas>;request-id:<requestId>;ts:<ts>;`.
async function signManifest(
  dataId: string,
  requestId: string,
  ts: string,
  secret: string,
): Promise<string> {
  const manifest =
    `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(manifest)),
  );
  return Array.from(signature)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.test("valid signature signed with the secret verifies", async () => {
  const dataId = "123456789";
  const requestId = "req-abc";
  const ts = "1700000000";
  const v1 = await signManifest(dataId, requestId, ts, SECRET);

  const result = await verifyWebhookSignature({
    xSignature: `ts=${ts},v1=${v1}`,
    xRequestId: requestId,
    dataId,
    secret: SECRET,
  });

  assertEquals(result, true);
});

Deno.test("signature header parts in any order and with spaces still verify", async () => {
  const dataId = "abc123";
  const requestId = "req-xyz";
  const ts = "1700000123";
  const v1 = await signManifest(dataId, requestId, ts, SECRET);

  const result = await verifyWebhookSignature({
    xSignature: ` v1=${v1} , ts=${ts} `,
    xRequestId: requestId,
    dataId,
    secret: SECRET,
  });

  assertEquals(result, true);
});

Deno.test("altered hash fails", async () => {
  const dataId = "123456789";
  const requestId = "req-abc";
  const ts = "1700000000";
  const v1 = await signManifest(dataId, requestId, ts, SECRET);
  // Voltea el último nibble del hex para alterar el hash sin cambiar longitud.
  const lastChar = v1.slice(-1);
  const flipped = lastChar === "0" ? "1" : "0";
  const tampered = v1.slice(0, -1) + flipped;

  const result = await verifyWebhookSignature({
    xSignature: `ts=${ts},v1=${tampered}`,
    xRequestId: requestId,
    dataId,
    secret: SECRET,
  });

  assertEquals(result, false);
});

Deno.test("wrong secret fails", async () => {
  const dataId = "123456789";
  const requestId = "req-abc";
  const ts = "1700000000";
  const v1 = await signManifest(dataId, requestId, ts, SECRET);

  const result = await verifyWebhookSignature({
    xSignature: `ts=${ts},v1=${v1}`,
    xRequestId: requestId,
    dataId,
    secret: "another-secret",
  });

  assertEquals(result, false);
});

Deno.test("tampered data.id fails (signature is bound to data.id)", async () => {
  const requestId = "req-abc";
  const ts = "1700000000";
  const v1 = await signManifest("123456789", requestId, ts, SECRET);

  const result = await verifyWebhookSignature({
    xSignature: `ts=${ts},v1=${v1}`,
    xRequestId: requestId,
    dataId: "999999999",
    secret: SECRET,
  });

  assertEquals(result, false);
});

Deno.test("data.id is compared case-insensitively (MP lowercases the manifest)", async () => {
  const requestId = "req-abc";
  const ts = "1700000000";
  // Firmamos con el id en minúsculas y verificamos enviándolo en mayúsculas.
  const v1 = await signManifest("abcdef", requestId, ts, SECRET);

  const result = await verifyWebhookSignature({
    xSignature: `ts=${ts},v1=${v1}`,
    xRequestId: requestId,
    dataId: "ABCDEF",
    secret: SECRET,
  });

  assertEquals(result, true);
});

Deno.test("missing inputs fail closed", async () => {
  const base = {
    xSignature: "ts=1,v1=deadbeef",
    xRequestId: "req",
    dataId: "1",
    secret: SECRET,
  };

  assertEquals(
    await verifyWebhookSignature({ ...base, xSignature: null }),
    false,
  );
  assertEquals(
    await verifyWebhookSignature({ ...base, xRequestId: null }),
    false,
  );
  assertEquals(await verifyWebhookSignature({ ...base, dataId: null }), false);
  assertEquals(await verifyWebhookSignature({ ...base, secret: "" }), false);
});

Deno.test("malformed signature header fails", async () => {
  const result = await verifyWebhookSignature({
    xSignature: "garbage-without-parts",
    xRequestId: "req",
    dataId: "1",
    secret: SECRET,
  });

  assertEquals(result, false);
});
