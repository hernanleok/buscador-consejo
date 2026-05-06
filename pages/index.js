import { useState } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";

const EJEMPLOS = [
  "resoluciones sobre antisemitismo",
  "concurso selección magistrados",
  "sanciones disciplinarias",
  "licitación servicios informáticos",
  "reglamento carrera judicial",
  "presupuesto Poder Judicial",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [error, setError] = useState("");
  const [summaryDoc, setSummaryDoc] = useState(null);
  const [summaryText, setSummaryText] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  async function doSearch(q) {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setSearching(true);
    setResults([]);
    setAnalysis("");
    setError("");
    setSummaryDoc(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data.analisis || "");
      setResults(data.resultados || []);
    } catch (e) {
      setError("No se pudo completar la búsqueda. Intentá nuevamente.");
      setResults([]);
    }
    setSearching(false);
  }

  async function openSummary(doc) {
    setSummaryDoc(doc);
    setSummaryText("");
    setLoadingSummary(true);
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc }),
      });
      const data = await res.json();
      setSummaryText(data.texto || "No se pudo generar el análisis.");
    } catch {
      setSummaryText("No se pudo generar el análisis.");
    }
    setLoadingSummary(false);
  }

  function closeModal() { setSummaryDoc(null); }

  return (
    <>
      <Head>
        <title>Buscador Documental · Consejo de la Magistratura de la Nación</title>
        <meta name="description" content="Sitio no oficial de búsqueda en la base documental pública del Consejo de la Magistratura de la Nación Argentina" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <div className={styles.page}>

        {/* ── Aviso no oficial ── */}
        <div className={styles.unofficialBanner}>
          <span className={styles.unofficialIcon}>ⓘ</span>
          <span>
            <strong>Sitio no oficial de búsqueda documental.</strong> Este sitio no está afiliado ni representa al Consejo de la Magistratura de la Nación.
            Indexa únicamente documentos públicos disponibles en{" "}
            <a href="https://pjn.gov.ar" target="_blank" rel="noopener noreferrer">pjn.gov.ar</a>.
          </span>
        </div>

        {/* ── Header ── */}
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <p className={styles.headerFlag}>República Argentina · Poder Judicial de la Nación</p>
            <h1 className={styles.headerTitle}>Consejo de la Magistratura de la Nación</h1>
            <p className={styles.headerSub}>Buscador de Resoluciones y Documentación Institucional</p>
            <div className={styles.headerPill}>
              <span className={styles.pillDot} />
              Búsqueda en tiempo real · documentos públicos PJN
            </div>
          </div>
        </header>

        {/* ── Stats ── */}
        <div className={styles.statsBar}>
          <span><strong>124.159</strong> documentos en PJN</span>
          <span className={styles.sep}>·</span>
          <span>Plenario · Presidencia · Administración · Comisiones</span>
          <span className={styles.sep}>·</span>
          <span>Fuente: pjn.gov.ar</span>
        </div>

        {/* ── Contenido ── */}
        <main className={styles.main}>

          {/* Search box */}
          <div className={styles.searchBox}>
            <div className={styles.searchRow}>
              <span className={styles.searchIcon}>⚖</span>
              <input
                className={styles.searchInput}
                placeholder="Buscá en lenguaje natural: sanciones, concursos, licitaciones, reglamentos…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doSearch()}
              />
              <button
                className={styles.searchBtn}
                onClick={() => doSearch()}
                disabled={searching || !query.trim()}
              >
                {searching ? (
                  <><span className={styles.spinner} /> Buscando…</>
                ) : "✦ Buscar"}
              </button>
            </div>

            <div className={styles.chips}>
              {EJEMPLOS.map(e => (
                <button key={e} className={styles.chip}
                  onClick={() => { setQuery(e); doSearch(e); }}>
                  {e}
                </button>
              ))}
            </div>

            <p className={styles.searchNote}>
              Los resultados provienen únicamente de documentos públicos en{" "}
              <code>pjn-documento-api.pjn.gov.ar</code>. El buscador no genera ni completa información.
            </p>
          </div>

          {/* Resultados */}
          {results !== null && (
            <div className={styles.resultsArea}>

              {analysis && (
                <div className={styles.aiBanner}>
                  <span className={styles.aiIcon}>✦</span>
                  <div>
                    <p className={styles.aiLabel}>Interpretación de la búsqueda</p>
                    <p className={styles.aiText}>{analysis}</p>
                  </div>
                </div>
              )}

              {error && <div className={styles.errorBox}>{error}</div>}

              <p className={styles.resultCount}>
                {results.length === 0 && !error
                  ? "No se encontraron documentos del Consejo de la Magistratura para esta búsqueda en PJN."
                  : <>Se encontraron <strong>{results.length}</strong> documento{results.length !== 1 ? "s" : ""} en PJN</>
                }
              </p>

              {results.map((doc, i) => (
                <div key={i} className={styles.card}>
                  <div className={styles.cardAccent} />
                  <div className={styles.cardBody}>
                    <div className={styles.cardMeta}>
                      {doc.tipo && <span className={styles.badge}>{doc.tipo}</span>}
                      {doc.fecha && <span className={styles.cardDate}>{doc.fecha}</span>}
                    </div>
                    <h2 className={styles.cardTitle}>{doc.titulo}</h2>
                    {doc.fragmento && (
                      <blockquote className={styles.cardFragment}>
                        "{doc.fragmento.slice(0, 250)}{doc.fragmento.length > 250 ? "…" : ""}"
                      </blockquote>
                    )}
                    <div className={styles.cardActions}>
                      <button className={styles.btnPrimary} onClick={() => openSummary(doc)}>
                        ✦ Análisis IA
                      </button>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className={styles.btnSecondary}>
                        ↗ Ver documento original
                      </a>
                    </div>
                  </div>
                </div>
              ))}

              {results.length === 0 && !error && (
                <div className={styles.emptyState}>
                  <p className={styles.emptyIcon}>◎</p>
                  <p className={styles.emptyTitle}>Sin resultados en PJN para esta consulta</p>
                  <p>Probá con términos más generales o distintas palabras clave</p>
                </div>
              )}
            </div>
          )}

          {results === null && (
            <div className={styles.emptyState}>
              <p className={styles.emptyIcon}>⚖</p>
              <p className={styles.emptyTitle}>Ingresá una consulta para comenzar</p>
              <p>Los resultados provienen directamente del PJN</p>
            </div>
          )}

        </main>

        <footer className={styles.footer}>
          Sitio no oficial · Documentos públicos del{" "}
          <a href="https://pjn.gov.ar" target="_blank" rel="noopener noreferrer">Poder Judicial de la Nación</a>
          {" "}· No afiliado al Consejo de la Magistratura de la Nación
        </footer>
      </div>

      {/* ── Modal de análisis ── */}
      {summaryDoc && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.modalLabel}>Análisis generado por IA · basado en extracto público del PJN</p>
                <p className={styles.modalTitle}>{summaryDoc.titulo}</p>
              </div>
              <button className={styles.modalClose} onClick={closeModal}>×</button>
            </div>
            <div className={styles.modalBody}>
              {loadingSummary
                ? <div className={styles.modalLoading}><span className={styles.spinner} /> Generando análisis…</div>
                : <p className={styles.modalText}>{summaryText}</p>
              }
            </div>
            <div className={styles.modalFooter}>
              <span className={styles.modalDisclaimer}>Análisis orientativo. Verificá siempre el documento original.</span>
              <div className={styles.modalActions}>
                <a href={summaryDoc.url} target="_blank" rel="noopener noreferrer" className={styles.btnSecondary}>↗ Ver PDF</a>
                <button className={styles.btnPrimary} onClick={closeModal}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
