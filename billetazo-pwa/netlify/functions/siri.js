// ================================================================
// netlify/functions/siri.js
// Endpoint que recibe el Atajo de iPhone y responde a Siri
//
// FLUJO:
//  1. Siri dicta → Atajo captura texto
//  2. Atajo hace POST a /.netlify/functions/siri
//  3. Esta función lee el cache de Firebase (público)
//  4. Llama a OpenRouter con el contexto + el texto
//  5. Si Gemini pide una acción, la escribe en pending_actions
//  6. Responde { "message": "texto que Siri lee en voz alta" }
//
// ENV VARS en Netlify (Settings → Environment variables):
//   OPENROUTER_KEY   = sk-or-v1-...
//   SIRI_TOKEN       = billetazo-siri-token-2025
//   FIREBASE_API_KEY = AIzaSy...
//   FIREBASE_PROJECT = billetazo-dba3a
//   USER_UID         = (el UID del usuario, lo copiás de Ajustes en la app)
// ================================================================

const SIRI_TOKEN    = process.env.VITE_SIRI_TOKEN || process.env.SIRI_TOKEN || 'billetazo-siri-token-2025';
const OR_KEY        = process.env.VITE_OPENROUTER_KEY || process.env.OPENROUTER_KEY;
const FB_API_KEY    = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
const FB_PROJECT    = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT || 'billetazo-dba3a';
const USER_UID      = process.env.USER_UID;

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents`;

// ── Leer documento de Firestore (sin auth, colección pública) ──────────────
async function fsGet(path) {
  const url = `${FIRESTORE_BASE}/${path}?key=${FB_API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const json = await r.json();
  return parseFirestoreDoc(json.fields || {});
}

// ── Escribir documento a Firestore (colección pública con validación por token) ─
async function fsWrite(path, data) {
  const url = `${FIRESTORE_BASE}/${path}?key=${FB_API_KEY}`;
  const body = { fields: toFirestoreFields(data) };
  await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

// ── Convertir Firestore format → JS object ─────────────────────────────────
function parseFirestoreDoc(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined)  out[k] = v.stringValue;
    else if (v.integerValue !== undefined) out[k] = Number(v.integerValue);
    else if (v.doubleValue !== undefined)  out[k] = Number(v.doubleValue);
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
    else if (v.arrayValue)  out[k] = (v.arrayValue.values || []).map(i => parseFirestoreDoc(i.mapValue?.fields || {}));
    else if (v.mapValue)    out[k] = parseFirestoreDoc(v.mapValue.fields || {});
    else out[k] = null;
  }
  return out;
}

function toFirestoreFields(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string')  out[k] = { stringValue: v };
    else if (typeof v === 'number') out[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    else if (typeof v === 'boolean') out[k] = { booleanValue: v };
    else if (Array.isArray(v)) out[k] = { arrayValue: { values: v.map(i => ({ mapValue: { fields: toFirestoreFields(i) } })) } };
  }
  return out;
}

// ── Prompt del sistema ─────────────────────────────────────────────────────
function buildPrompt(cache) {
  const prods = cache.productos || [];
  const bajosStock = prods.filter(p => p.cantidad <= 3);

  return `Sos Billetazo IA, el asistente de negocio personal. Respondés en español rioplatense.
Tus respuestas son BREVES (máx 2 oraciones) porque Siri las lee en voz alta.

INVENTARIO:
${prods.map(p => `[${p.id}] ${p.nombre} | Stock: ${p.cantidad} | Precio venta: Bs${p.precioVenta}`).join('\n') || 'Sin productos.'}

HOY: ${cache.cantidadHoy || 0} ventas — Ganancia Bs${(cache.gananciaHoy || 0).toFixed(2)}
AYER: Ganancia Bs${(cache.gananciaAyer || 0).toFixed(2)}
ESTE MES: Ganancia Bs${(cache.gananciaMes || 0).toFixed(2)}
FINANZAS: Ingresos Bs${(cache.ingresos || 0).toFixed(2)} | Gastos Bs${(cache.gastos || 0).toFixed(2)} | Balance Bs${((cache.ingresos || 0) - (cache.gastos || 0)).toFixed(2)}
BAJO STOCK (≤3 unidades): ${bajosStock.map(p => `${p.nombre}(${p.cantidad})`).join(', ') || 'ninguno'}
PRODUCTO MÁS VENDIDO HOY: ${cache.topProductoHoy || 'sin datos'}

REGLAS:
- CONSULTA → respondé con texto breve natural.
- ACCIÓN → respondé SOLO este JSON sin texto extra:
  {"action":"NOMBRE","params":{...},"message":"texto breve para Siri"}

ACCIONES DISPONIBLES:
SELL_PRODUCT   → params: {productId, qty}
ADD_EXPENSE    → params: {descripcion, monto, categoria}
ADD_INCOME     → params: {descripcion, monto, categoria}
RESTOCK        → params: {productId, qty}

Buscá el productId por nombre en el inventario de arriba.`;
}

// ── Llamada a OpenRouter ───────────────────────────────────────────────────
async function callAI(systemPrompt, userText) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OR_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://billetazo.netlify.app',
      'X-Title': 'Billetazo',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userText },
      ],
      max_tokens: 300,
    }),
  });
  const json = await r.json();
  if (json.error) {
    return `Error de OpenRouter: ${json.error.message}`;
  }
  return json.choices?.[0]?.message?.content?.trim() || 'No pude procesar la solicitud.';
}

// ── Handler principal ──────────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST')   return { statusCode: 405, headers, body: JSON.stringify({ message: 'Método no permitido.' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }

  const { texto, token } = body;
  const uid = USER_UID || body.userId;

  console.log("--- Siri Function Start ---");
  console.log("Texto recibido:", texto);
  console.log("UID:", uid);

  if (!OR_KEY) {
    console.error("Falta OPENROUTER_KEY");
    return { statusCode: 500, headers, body: JSON.stringify({ message: 'Error interno: Falta la clave de IA en el servidor.' }) };
  }

  try {
    // ── Leer cache público de Firebase ─────────────────────────────────
    const cache = await fsGet(`shortcut_cache/${uid}`) || {};
    console.log("Cache cargado:", cache.productos ? `${cache.productos.length} productos` : "vacío");

    // ── Verificar token del cache ──────────────────────────────────────
    if (cache.token && cache.token !== SIRI_TOKEN) {
      console.warn("Token de cache no coincide:", cache.token, "vs", SIRI_TOKEN);
      return { statusCode: 401, headers, body: JSON.stringify({ message: 'Token no coincide con el registro del usuario.' }) };
    }

    // ── Llamar a la IA ─────────────────────────────────────────────────
    const systemPrompt = buildPrompt(cache);
    const rawResponse  = await callAI(systemPrompt, texto);
    console.log("Respuesta IA:", rawResponse);

    // ── Interpretar si es acción o texto ───────────────────────────────
    let message = rawResponse;
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.action && parsed.params) {
          // Escribir acción pendiente para que la web app la procese
          const actionId = Date.now().toString();
          await fsWrite(`shortcut_actions/${uid}/pending/${actionId}`, {
            action: parsed.action,
            params: JSON.stringify(parsed.params),
            token: SIRI_TOKEN,
            status: 'pending',
            createdAt: new Date().toISOString(),
          });
          message = parsed.message || 'Acción registrada. Se procesará cuando abras la app.';
        }
      } catch (_) { /* no era JSON */ }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ message }) };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ message: `Error: ${err.message}` }) };
  }
};
