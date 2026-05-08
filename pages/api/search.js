export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: "Consulta vacía" });

  const TAVILY_KEY = process.env.TAVILY_API_KEY;
  const GROQ_KEY = process.env.GROQ_API_KEY;

  if (!TAVILY_KEY) return res.status(500).json({ error: "TAVILY_API_KEY no configurada" });
  if (!GROQ_KEY) return res.status(500).json({ error: "GROQ_API_KEY no configurada" });

  try {
    // 1. Buscar en PJN con Tavily
    const tavilyRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query: `Consejo de la Magistratura ${query}`,
        include_domains: ["pjn.gov.ar", "pjn-documento-api.pjn.gov.ar"],
        max_results: 8,
        include_raw_content: false
      })
    });

    if (!tavilyRes.ok) {
      const err = await tavilyRes.text();
      return res.status(500).json({ error: `Tavily error ${tavilyRes.status}`, detalle: err.slice(0, 300) });
    }

    const tavilyData = await tavilyRes.json();
    const rawResults = tavilyData.results || [];

    if (rawResults.length === 0) {
      return res.json({ analisis: `No se encontraron documentos en PJN para "${query}".`, resultados: [] });
    }

    // 2. Usar Groq para analizar y estructurar los resultados
    const docsText = rawResults.map((r, i) =>
      `[${i+1}] URL: ${r.url}\nTítulo: ${r.title}\nFragmento: ${r.content?.slice(0, 300) || ""}`
    ).join("\n\n");

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        max_tokens: 2000,
        messages: [{
          role: "system",
          content: "Sos un asistente jurídico del Consejo de la Magistratura de la Nación Argentina. Respondés siempre en español. Solo usás información que figura explícitamente en los documentos provistos. No inventás ni completás información."
        }, {
          role: "user",
          content: `El usuario buscó: "${query}"

Estos son los documentos encontrados en pjn.gov.ar:

${docsText}

Devolvé ÚNICAMENTE este JSON válido (sin markdown, sin texto adicional):
{"analisis":"Una oración describiendo qué encontraste","resultados":[{"url":"URL exacta","titulo":"título del documento","fragmento":"texto relevante del fragmento","fecha":"fecha si figura, sino vacío","tipo":"tipo de documento si es identificable"}]}`
        }]
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return res.status(500).json({ error: `Groq error ${groqRes.status}`, detalle: err.slice(0, 300) });
    }

    const groqData = await groqRes.json();
    const rawText = groqData.choices?.[0]?.message?.content || "{}";

    let parsed = { analisis: "", resultados: [] };
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch (_) {}

    // Fallback: si Groq no devolvió JSON válido, usar los resultados crudos de Tavily
    if (!parsed.resultados?.length) {
      parsed.resultados = rawResults.map(r => ({
        url: r.url,
        titulo: r.title,
        fragmento: r.content?.slice(0, 250) || "",
        fecha: "",
        tipo: ""
      }));
      parsed.analisis = `Se encontraron ${rawResults.length} documentos en PJN para "${query}".`;
    }

    res.json({ analisis: parsed.analisis, resultados: parsed.resultados });

  } catch (err) {
    res.status(500).json({ error: "Error en la búsqueda", detalle: err.message });
  }
}
