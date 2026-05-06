export default async function handler(req, res) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return res.json({ status: "ERROR", mensaje: "GEMINI_API_KEY no está configurada" });

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Respondé solo: OK" }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      }
    );
    const data = await r.json();
    if (data.error) return res.json({ status: "ERROR_GEMINI", detalle: data.error });
    return res.json({ status: "OK", modelo: "gemini-1.5-flash", mensaje: "API key válida y Gemini responde correctamente" });
  } catch (e) {
    return res.json({ status: "ERROR_RED", detalle: e.message });
  }
}
