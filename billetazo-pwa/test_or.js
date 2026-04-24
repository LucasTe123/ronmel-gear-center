const orKey = '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';
fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + orKey,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://soft-duckanoo-e4d3bd.netlify.app',
    'X-Title': 'Billetazo',
  },
  body: JSON.stringify({
    model: 'google/gemini-2.0-flash-lite-001',
    messages: [
      { role: 'user',   content: 'registra que gasté 20 bolivianos en galletas' },
    ],
    max_tokens: 300,
  }),
}).then(r => r.json()).then(console.log).catch(console.error);
