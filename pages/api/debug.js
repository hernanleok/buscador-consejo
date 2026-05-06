export default async function handler(req, res) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return res.json({ error: "Sin API key" });

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Buscá en pjn.gov.ar documentos del Consejo de la Magistratura sobre antisemitismo" }] }],
          tools: [{ googleSearchRetrieval: {} }],
          generationConfig: { temperature: 0, maxOutputTokens: 500 }
        })
      }
    );
    const data = await r.json();
    res.json({ httpStatus: r.status, data });
  } catch (e) {
    res.json({ error: e.message });
  }
}
