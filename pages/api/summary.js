export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { doc } = req.body;
  if (!doc) return res.status(400).json({ error: "Documento no especificado" });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: "GROQ_API_KEY no configurada" });

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_tokens: 500,
        messages: [{
          role: "system",
          content: "Sos un asistente jurídico especializado en derecho público argentino. Respondés siempre en español formal. Solo usás información que figura explícitamente en el fragmento provisto."
        }, {
          role: "user",
          content: `Analizá este documento del Consejo de la Magistratura de la Nación Argentina y generá un análisis ejecutivo:

Título: ${doc.titulo}
Tipo: ${doc.tipo || "Documento institucional"}
Fecha: ${doc.fecha || "no disponible"}
Fragmento disponible: "${doc.fragmento || "sin fragmento"}"

En 100-130 palabras: qué resuelve o dispone, fundamento identificable, alcance. Tono formal y jurídico. Sin títulos ni encabezados. Comenzá directamente con el contenido. Cerrá indicando que el análisis se basa en el extracto público disponible.`
        }]
      })
    });
    const data = await r.json();
    const texto = data.choices?.[0]?.message?.content || "No se pudo generar el análisis.";
    res.json({ texto });
  } catch (err) {
    res.status(500).json({ error: "Error al generar análisis", detalle: err.message });
  }
}
