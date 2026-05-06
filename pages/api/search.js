export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: "Consulta vacía" });

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: "API key no configurada" });

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Buscá en el sitio oficial del Poder Judicial de la Nación Argentina (pjn.gov.ar) documentos del Consejo de la Magistratura de la Nación sobre: "${query}"

REGLAS ESTRICTAS QUE DEBES CUMPLIR:
1. Solo incluí resultados cuya URL provenga exclusivamente de pjn.gov.ar o pjn-documento-api.pjn.gov.ar
2. No inventes, no supongas, no completes información que no esté en los resultados de búsqueda
3. Si no encontrás resultados en esos sitios, devolvé resultados:[]
4. El fragmento debe ser texto literal extraído del documento, no una paráfrasis

Devolvé ÚNICAMENTE este JSON válido (sin markdown, sin backticks, sin texto antes o después):
{"analisis":"Una oración describiendo qué encontraste en pjn.gov.ar","resultados":[{"url":"URL completa y exacta del documento en pjn.gov.ar","titulo":"título del documento tal como figura","fragmento":"texto literal del fragmento del documento","fecha":"fecha si figura, sino cadena vacía","tipo":"tipo de documento si es identificable"}]}`
            }]
          }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0, maxOutputTokens: 4000 }
        })
      }
    );

    const data = await geminiRes.json();

    // Extraer texto de la respuesta
    const textPart = data.candidates?.[0]?.content?.parts?.find(p => p.text);
    const rawText = textPart?.text || "{}";

    // Extraer los chunks reales de Google para validación de URLs
    const groundingChunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const realPjnUrls = new Set(
      groundingChunks
        .map(c => c.web?.uri)
        .filter(u => u && (u.includes("pjn.gov.ar") || u.includes("pjn-documento-api")))
    );

    // Parsear el JSON de la respuesta
    let parsed = { analisis: "", resultados: [] };
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch (_) {}

    // Filtrar estrictamente a URLs del PJN
    const resultados = (parsed.resultados || []).filter(r =>
      r.url && (r.url.includes("pjn.gov.ar") || r.url.includes("pjn-documento-api"))
    );

    // Si no hay resultados del modelo pero sí hay chunks de PJN en grounding,
    // construir resultados desde los chunks reales
    if (resultados.length === 0 && realPjnUrls.size > 0) {
      const fromChunks = groundingChunks
        .filter(c => c.web?.uri && (c.web.uri.includes("pjn.gov.ar") || c.web.uri.includes("pjn-documento-api")))
        .map(c => ({
          url: c.web.uri,
          titulo: c.web.title || "Documento del Consejo de la Magistratura",
          fragmento: "",
          fecha: "",
          tipo: "Documento PJN"
        }));
      return res.json({ analisis: parsed.analisis || "Documentos encontrados en PJN.", resultados: fromChunks });
    }

    res.json({ analisis: parsed.analisis || "", resultados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al realizar la búsqueda", detalle: err.message });
  }
}
