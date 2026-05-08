export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: "Consulta vacía" });

  const TAVILY_KEY = process.env.TAVILY_API_KEY;
  const GROQ_KEY = process.env.GROQ_API_KEY;

  if (!TAVILY_KEY) return res.status(500).json({ error: "TAVILY_API_KEY no configurada" });
  if (!GROQ_KEY) return res.status(500).json({ error: "GROQ_API_KEY no configurada" });

  try {
    // Buscar directamente en pjn-documento-api donde están los PDFs reales
    const tavilyRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query: `${query} Consejo de la Magistratura resolución`,
        include_domains: ["pjn-documento-api.pjn.gov.ar"],
        max_results: 8,
        include_raw_content: false
      })
    });

    if (!tavilyRes.ok) {
      const err = await tavilyRes.text();
      return res.status(500).json({ error: `Tavily error ${tavilyRes.status}`, detalle: err.slice(0, 300) });
    }

    const tavilyData = await tavilyRes.json();
    let rawResults = tavilyData.results || [];

    // Si no hay resultados en pjn-documento-api, buscar más amplio en todo pjn.gov.ar
    if (rawResults.length === 0) {
      const tavilyRes2 = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: TAVILY_KEY,
          query: `${query} Consejo de la Magistratura`,
          include_domains: ["pjn.gov.ar"],
          max_results: 8,
          include_raw_content: false
        })
      });
      const data2 = await tavilyRes2.json();
      rawResults = data2.results || [];
    }

    if (rawResults.length === 0) {
      return res.json({
        analisis: `No se encontraron documentos en PJN para "${query}".`,
        resultados: []
      });
    }

    // Usar Groq para analizar y relacionar cada resultado con la consulta
    const docsText = rawResults.map((r, i) =>
      `[${i+1}] URL: ${r.url}\nTítulo: ${r.title}\nContenido: ${r.content?.slice(0, 400) || ""}`
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
          content: "Sos un asistente jurídico del Consejo de la Magistratura de la Nación Argentina. Solo usás información que figura explícitamente en los documentos provistos. No inventás ni completás información. Respondés siempre en español."
        }, {
          role: "user",
          content: `El usuario buscó: "${query}"

Documentos encontrados en PJN:

${docsText}

Tu tarea:
1. Evaluá si cada documento es genuinamente relevante para la búsqueda "${query}"
2. Para los que sí son relevantes, extraé el título real, un fragmento pertinente y la fecha si figura
3. Descartá los que no tienen relación real con la búsqueda
4. El título debe reflejar el contenido real del documento, no inventarlo

Devolvé ÚNICAMENTE este JSON válido (sin markdown, sin texto adicional):
{"analisis":"Una oración describiendo qué encontraste relacionado con la búsqueda","resultados":[{"url":"URL exacta sin modificar","titulo":"título real del documento","fragmento":"texto del fragmento directamente relacionado con la búsqueda","fecha":"fecha si figura, sino vacío","tipo":"tipo de documento si es identificable"}]}`
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

    // Fallback si Groq no devolvió JSON válido
    if (!parsed.resultados?.length) {
      parsed.resultados = rawResults.map(r => ({
        url: r.url,
        titulo: r.title,
        fragmento: r.content?.slice(0, 250) || "",
        fecha: "",
        tipo: ""
      }));
      parsed.analisis = `${rawResults.length} documento(s) encontrado(s) en PJN para "${query}".`;
    }

    res.json({ analisis: parsed.analisis, resultados: parsed.resultados });

  } catch (err) {
    res.status(500).json({ error: "Error en la búsqueda", detalle: err.message });
  }
}
