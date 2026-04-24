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

  const contexto = `
INVENTARIO: ${prods.map(p => `[${p.id}] ${p.nombre} (Stock: ${p.cantidad}, Bs${p.precioVenta})`).join(', ') || 'Sin productos'}
HOY: ${cache.cantidadHoy || 0} ventas — Ganancia Bs${(cache.gananciaHoy || 0).toFixed(2)}
BALANCE: Ingresos Bs${(cache.ingresos || 0).toFixed(2)} | Gastos Bs${(cache.gastos || 0).toFixed(2)}
`;

  return `Eres un asistente que procesa gastos e ingresos para una app conectada con Siri.

RESPONDE SIEMPRE en JSON válido.
NO uses markdown.
NO uses \`\`\`json ni \`\`\` en ningún caso.
NO agregues texto fuera del JSON.

El JSON debe tener EXACTAMENTE esta estructura:

{
  "message": "texto natural que Siri debe decir al usuario",
  "action": "ADD_EXPENSE | ADD_INCOME | SELL_PRODUCT | RESTOCK | NONE",
  "params": {
    "descripcion": "string",
    "monto": number,
    "categoria": "string",
    "productId": "string",
    "qty": number
  }
}

REGLAS:
- "message" SIEMPRE debe existir y ser texto claro y breve en español rioplatense.
- "action" debe ser:
  - ADD_EXPENSE → si el usuario gasta dinero
  - ADD_INCOME → si el usuario gana dinero (que no sea venta de inventario)
  - SELL_PRODUCT → si el usuario vende algo del INVENTARIO
  - RESTOCK → si el usuario compra más unidades para el INVENTARIO
  - NONE → si es solo una pregunta o no se puede procesar

- "params":
  - Si no hay datos suficientes, deja campos vacíos ("") o en 0.
  - monto y qty deben ser números, no strings.
  - Para ventas o restock, usa el nombre del producto en 'descripcion' y busca su 'productId' en el inventario.

- SIEMPRE devuelve JSON válido aunque haya errores.
- Si te hacen una consulta de ventas o stock, usa el action "NONE" y pon la respuesta en "message".

- PROHIBIDO:
  - usar \`\`\` 
  - explicar nada
  - escribir fuera del JSON

DATOS ACTUALES: ${contexto}`;
}

// ── Llamada a OpenRouter ───────────────────────────────────────────────────
async function callAI(systemPrompt, userText) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OR_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://soft-duckanoo-e4d3bd.netlify.app',
      'X-Title': 'Billetazo',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-lite-001',
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
        if (parsed.message) {
          message = parsed.message; // Siri siempre lee el mensaje natural
        }
        if (parsed.action && parsed.action !== 'NONE') {
          // Escribir acción pendiente para que la web app la procese
          const actionId = Date.now().toString();
          await fsWrite(`shortcut_actions/${uid}/pending/${actionId}`, {
            action: parsed.action,
            params: JSON.stringify(parsed.params || {}),
            token: SIRI_TOKEN,
            status: 'pending',
            createdAt: new Date().toISOString(),
          });
        }
      } catch (e) { 
        console.error("JSON parse error:", e);
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ message }) };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ message: `Error: ${err.message}` }) };
  }
};
