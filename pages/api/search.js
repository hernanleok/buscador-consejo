export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: "Consulta vacía" });

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: "API key no configurada en Vercel." });

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Buscá documentos del Consejo de la Magistratura de la Nación Argentina en pjn.gov.ar sobre: "${query}". Solo incluí URLs de pjn.gov.ar o pjn-documento-api.pjn.gov.ar. No inventes información. Devolvé ÚNICAMENTE este JSON sin markdown: {"analisis":"resumen de lo encontrado","resultados":[{"url":"URL exacta","titulo":"título","fragmento":"texto del fragmento","fecha":"fecha si figura","tipo":"tipo de documento"}]}`
            }]
          }],
          tools: [{ googleSearchRetrieval: {} }],
          generationConfig: { temperature: 0, maxOutputTokens: 4000 }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(500).json({ error: `Gemini API error ${geminiRes.status}`, detalle: errText.slice(0, 500) });
    }

    const data = await geminiRes.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const rawText = parts.find(p => p.text)?.text || "";
    const groundingChunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    let parsed = { analisis: "", resultados: [] };
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch (_) {}

    let resultados = (parsed.resultados || []).filter(r =>
      r.url && (r.url.includes("pjn.gov.ar") || r.url.includes("pjn-documento-api"))
    );

    if (resultados.length === 0 && groundingChunks.length > 0) {
      resultados = groundingChunks
        .filter(c => c.web?.uri && (c.web.uri.includes("pjn.gov.ar") || c.web.uri.includes("pjn-documento-api")))
        .map(c => ({ url: c.web.uri, titulo: c.web.title || "Documento PJN", fragmento: "", fecha: "", tipo: "" }));
    }

    res.json({
      analisis: parsed.analisis || (resultados.length > 0 ? `${resultados.length} documento(s) encontrado(s) en PJN.` : `Sin resultados en PJN para "${query}".`),
      resultados
    });
  } catch (err) {
    res.status(500).json({ error: "Error en la búsqueda", detalle: err.message });
  }
}
