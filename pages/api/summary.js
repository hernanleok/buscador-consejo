export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { doc } = req.body;
  if (!doc) return res.status(400).json({ error: "Documento no especificado" });

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: "API key no configurada" });

  const prompt = `Analizá este documento del Consejo de la Magistratura de la Nación Argentina:

URL: ${doc.url}
Título: ${doc.titulo}
Tipo: ${doc.tipo || "Documento institucional"}
Fecha: ${doc.fecha || "no disponible"}
Fragmento disponible: "${doc.fragmento || "sin fragmento"}"

Basándote ÚNICAMENTE en la información disponible arriba (no inventes ni supongas nada que no figure), generá un análisis ejecutivo de 100-130 palabras que incluya:
- Qué resuelve o dispone el documento
- Fundamento o contexto identificable en el fragmento
- Alcance o impacto

Tono: formal y jurídico. Sin títulos ni encabezados. Comenzá directamente con el contenido.
Cerrá con una oración indicando que el análisis se basa en el extracto público disponible y que puede ser incompleto.`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 600 }
        })
      }
    );

    const data = await geminiRes.json();
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar el análisis.";
    res.json({ texto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al generar el análisis" });
  }
}
