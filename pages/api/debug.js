export default async function handler(req, res) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return res.json({ error: "Sin API key" });

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Respondé solo: FUNCIONA" }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      }
    );
    const data = await r.json();
    res.json({ httpStatus: r.status, data });
  } catch (e) {
    res.json({ error: e.message });
  }
}
// sin search grounding
