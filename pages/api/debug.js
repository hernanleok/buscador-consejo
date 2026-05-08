export default async function handler(req, res) {
  const TAVILY_KEY = process.env.TAVILY_API_KEY;
  const GROQ_KEY = process.env.GROQ_API_KEY;

  const status = {
    tavily: TAVILY_KEY ? "KEY PRESENTE" : "SIN KEY",
    groq: GROQ_KEY ? "KEY PRESENTE" : "SIN KEY"
  };

  // Probar Groq
  if (GROQ_KEY) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 5,
          messages: [{ role: "user", content: "Di OK" }]
        })
      });
      const d = await r.json();
      status.groq_test = d.choices ? "FUNCIONA" : JSON.stringify(d.error || d);
    } catch(e) { status.groq_test = "ERROR: " + e.message; }
  }

  // Probar Tavily
  if (TAVILY_KEY) {
    try {
      const r = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: TAVILY_KEY, query: "test", max_results: 1 })
      });
      status.tavily_test = r.ok ? "FUNCIONA" : `ERROR ${r.status}`;
    } catch(e) { status.tavily_test = "ERROR: " + e.message; }
  }

  res.json(status);
}
