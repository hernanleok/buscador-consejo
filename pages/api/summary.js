import pdfParse from "pdf-parse";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { doc } = req.body;
  if (!doc) return res.status(400).json({ error: "Documento no especificado" });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: "GROQ_API_KEY no configurada" });

  let textoParaAnalizar = doc.fragmento || "";
  let fuenteTexto = "extracto público disponible";

  // Intentar descargar y parsear el PDF completo
  if (doc.url && doc.url.includes("pjn-documento-api")) {
    try {
      const pdfRes = await fetch(doc.url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(10000)
      });
      if (pdfRes.ok) {
        const buffer = await pdfRes.arrayBuffer();
        const data = await pdfParse(Buffer.from(buffer));
        if (data.text && data.text.trim().length > 100) {
          textoParaAnalizar = data.text.slice(0, 12000);
          fuenteTexto = "texto completo del documento PDF";
        }
      }
    } catch (_) {
      // Si falla la descarga o el parseo, seguimos con el fragmento
    }
  }

  if (!textoParaAnalizar) {
    return res.json({ texto: "No hay suficiente texto disponible para generar un análisis." });
  }

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_tokens: 600,
        messages: [{
          role: "system",
          content: "Sos un asistente jurídico especializado en derecho público argentino. Respondés siempre en español formal y jurídico. Solo usás información que figura explícitamente en el texto provisto, sin inventar ni completar."
        }, {
          role: "user",
          content: `Analizá este documento del Consejo de la Magistratura de la Nación Argentina:

Título: ${doc.titulo}
Fuente del texto: ${fuenteTexto}

Texto del documento:
${textoParaAnalizar}

Generá un análisis ejecutivo de 150-200 palabras que incluya:
1. Qué resuelve o dispone concretamente
2. Fundamentos jurídicos o fácticos invocados
3. Alcance y efectos prácticos
4. Partes o sujetos involucrados si figuran

Tono: formal y jurídico, sin adjetivos vacíos. Sin títulos ni encabezados. Comenzá directamente con el contenido. Cerrá con una línea indicando si el análisis se basa en el PDF completo o solo en el extracto disponible.`
        }]
      })
    });
    const data = await r.json();
    const texto = data.choices?.[0]?.message?.content || "No se pudo generar el análisis.";
    res.json({ texto, fuenteTexto });
  } catch (err) {
    res.status(500).json({ error: "Error al generar análisis", detalle: err.message });
  }
}
