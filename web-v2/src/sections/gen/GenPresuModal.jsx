// Generado desde el diseño (index.html) con tools/html2jsx.cjs — MODAL PRESUPUESTO
export default function GenPresuModal() {
  return (
    <div id="presu-modal" role="dialog" aria-modal="true" aria-label="Pedí tu presupuesto" style={{ position: "fixed", inset: "0", zIndex: "90", background: "rgba(21,17,19,.72)", padding: "24px 16px", overflowY: "auto", display: "none" }}>
      <form id="presu-form" style={{ position: "relative", width: "100%", maxWidth: "720px", margin: "auto", background: "#FFFFFF", padding: "clamp(26px, 3vw, 44px)", boxShadow: "0 30px 80px rgba(0,0,0,.4)" }}>
        <button type="button" id="presu-close" aria-label="Cerrar" style={{ position: "absolute", top: "14px", right: "14px", width: "44px", height: "44px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#440A33", fontSize: "22px", lineHeight: "1", cursor: "pointer" }}>×</button>
        {' '}
        <p style={{ margin: "0 50px 0 0", fontFamily: "Jost, sans-serif", fontWeight: "500", textTransform: "uppercase", fontSize: "11px", letterSpacing: ".3em", color: "#B5654E" }}>Evento personalizado · hasta 120 personas</p>
        {' '}
        <h3 style={{ margin: "10px 50px 0 0", fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: "500", fontSize: "32px", lineHeight: "1.1", color: "#440A33" }}>
          Pedí tu{' '}
          <span style={{ fontStyle: "italic", color: "#B5654E" }}>cotización</span>
        </h3>
        {' '}
        <p style={{ margin: "6px 0 28px", fontSize: "15px", lineHeight: "1.6", color: "#6B5A63" }}>Contanos la idea en 4 preguntas y el equipo te arma una propuesta por WhatsApp.</p>
        {' '}
        <fieldset style={{ border: "0", margin: "0 0 26px", padding: "0" }}>
          <legend style={{ padding: "0", marginBottom: "12px", fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: "600", fontSize: "22px", color: "#2A0B20" }}>¿Qué quieren celebrar?</legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <button className="chip" type="button" data-g="tipo" data-v="Un evento de empresa" aria-pressed="false" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 18px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#2A0B20", fontFamily: "Lora, Georgia, serif", fontSize: "15px", cursor: "pointer" }}>Un evento de empresa</button>
            <button className="chip" type="button" data-g="tipo" data-v="Un cumpleaños" aria-pressed="false" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 18px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#2A0B20", fontFamily: "Lora, Georgia, serif", fontSize: "15px", cursor: "pointer" }}>Un cumpleaños</button>
            <button className="chip" type="button" data-g="tipo" data-v="Un aniversario" aria-pressed="false" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 18px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#2A0B20", fontFamily: "Lora, Georgia, serif", fontSize: "15px", cursor: "pointer" }}>Un aniversario</button>
            <button className="chip" type="button" data-g="tipo" data-v="Una juntada con amigos" aria-pressed="false" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 18px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#2A0B20", fontFamily: "Lora, Georgia, serif", fontSize: "15px", cursor: "pointer" }}>Una juntada con amigos</button>
            <button className="chip" type="button" data-g="tipo" data-v="Mi fin de año" aria-pressed="false" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 18px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#2A0B20", fontFamily: "Lora, Georgia, serif", fontSize: "15px", cursor: "pointer" }}>Mi fin de año</button>
            <button className="chip" type="button" data-g="tipo" data-v="Otro tipo de evento" aria-pressed="false" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 18px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#2A0B20", fontFamily: "Lora, Georgia, serif", fontSize: "15px", cursor: "pointer" }}>Otro tipo de evento</button>
          </div>
        </fieldset>
        <fieldset style={{ border: "0", margin: "0 0 26px", padding: "0" }}>
          <legend style={{ padding: "0", marginBottom: "12px", fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: "600", fontSize: "22px", color: "#2A0B20" }}>¿Cuántas personas son, más o menos?</legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <button className="chip" type="button" data-g="pers" data-v="Menos de 10" aria-pressed="false" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 18px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#2A0B20", fontFamily: "Lora, Georgia, serif", fontSize: "15px", cursor: "pointer" }}>Menos de 10</button>
            <button className="chip" type="button" data-g="pers" data-v="Entre 10 y 40" aria-pressed="false" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 18px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#2A0B20", fontFamily: "Lora, Georgia, serif", fontSize: "15px", cursor: "pointer" }}>Entre 10 y 40</button>
            <button className="chip" type="button" data-g="pers" data-v="Entre 40 y 80" aria-pressed="false" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 18px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#2A0B20", fontFamily: "Lora, Georgia, serif", fontSize: "15px", cursor: "pointer" }}>Entre 40 y 80</button>
            <button className="chip" type="button" data-g="pers" data-v="Entre 80 y 120" aria-pressed="false" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 18px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#2A0B20", fontFamily: "Lora, Georgia, serif", fontSize: "15px", cursor: "pointer" }}>Entre 80 y 120</button>
          </div>
        </fieldset>
        <fieldset style={{ border: "0", margin: "0 0 26px", padding: "0" }}>
          <legend style={{ padding: "0", marginBottom: "12px", fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: "600", fontSize: "22px", color: "#2A0B20" }}>¿Para cuándo lo piensan?</legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <button className="chip" type="button" data-g="cuando" data-v="Este mes" aria-pressed="false" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 18px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#2A0B20", fontFamily: "Lora, Georgia, serif", fontSize: "15px", cursor: "pointer" }}>Este mes</button>
            <button className="chip" type="button" data-g="cuando" data-v="El mes que viene" aria-pressed="false" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 18px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#2A0B20", fontFamily: "Lora, Georgia, serif", fontSize: "15px", cursor: "pointer" }}>El mes que viene</button>
            <button className="chip" type="button" data-g="cuando" data-v="Para fin de año" aria-pressed="false" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 18px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#2A0B20", fontFamily: "Lora, Georgia, serif", fontSize: "15px", cursor: "pointer" }}>Para fin de año</button>
            <button className="chip" type="button" data-g="cuando" data-v="Todavía no sé" aria-pressed="false" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 18px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#2A0B20", fontFamily: "Lora, Georgia, serif", fontSize: "15px", cursor: "pointer" }}>Todavía no sé</button>
          </div>
        </fieldset>
        <fieldset style={{ border: "0", margin: "0 0 26px", padding: "0" }}>
          <legend style={{ padding: "0", marginBottom: "12px", fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: "600", fontSize: "22px", color: "#2A0B20" }}>¿Dónde lo imaginan?</legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <button className="chip" type="button" data-g="lugar" data-v="La Cava" aria-pressed="false" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 18px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#2A0B20", fontFamily: "Lora, Georgia, serif", fontSize: "15px", cursor: "pointer" }}>La Cava</button>
            <button className="chip" type="button" data-g="lugar" data-v="Selvaggio entero" aria-pressed="false" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 18px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#2A0B20", fontFamily: "Lora, Georgia, serif", fontSize: "15px", cursor: "pointer" }}>Selvaggio entero</button>
            <button className="chip" type="button" data-g="lugar" data-v="Lo que nos recomienden" aria-pressed="false" style={{ display: "inline-flex", alignItems: "center", minHeight: "44px", padding: "0 18px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#2A0B20", fontFamily: "Lora, Georgia, serif", fontSize: "15px", cursor: "pointer" }}>Lo que nos recomienden</button>
          </div>
        </fieldset>
        {' '}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "14px" }}>
          <label style={{ flex: "1 1 200px", minWidth: "0", display: "flex", flexDirection: "column", gap: "8px", fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: "600", fontSize: "20px", color: "#2A0B20" }}>
            Tu nombre
            <input id="presu-name" type="text" autoComplete="given-name" placeholder="Ej: Laura" style={{ width: "100%", boxSizing: "border-box", minHeight: "50px", padding: "0 16px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", fontFamily: "Lora, Georgia, serif", fontSize: "16px", color: "#2A0B20" }} />
          </label>
          {' '}
          <label style={{ flex: "1 1 200px", minWidth: "0", display: "flex", flexDirection: "column", gap: "8px", fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: "600", fontSize: "20px", color: "#2A0B20" }}>
            Tu WhatsApp
            <input id="presu-tel" type="tel" autoComplete="tel" placeholder="Ej: 11 2345 6789" style={{ width: "100%", boxSizing: "border-box", minHeight: "50px", padding: "0 16px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", fontFamily: "Lora, Georgia, serif", fontSize: "16px", color: "#2A0B20" }} />
          </label>
        </div>
        {' '}
        <div style={{ marginTop: "22px", padding: "20px 22px", background: "#F6F3EC", borderLeft: "2px solid #B5654E" }}>
          <p style={{ margin: "0 0 8px", fontFamily: "Jost, sans-serif", fontWeight: "500", textTransform: "uppercase", fontSize: "10px", letterSpacing: ".3em", color: "#B5654E" }}>Así nos llega tu mensaje</p>
          {' '}
          <p id="presu-msg" aria-live="polite" style={{ margin: "0", whiteSpace: "pre-line", fontSize: "15px", lineHeight: "1.7", color: "#2A0B20" }} />
        </div>
        {' '}
        <a id="presu-btn" href="https://wa.me/5491166864692" target="_blank" rel="noopener" style={{ marginTop: "22px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", minHeight: "56px", background: "#440A33", color: "#EDE9E2", textDecoration: "none", fontFamily: "Jost, sans-serif", fontWeight: "500", textTransform: "uppercase", fontSize: "13px", letterSpacing: ".24em" }}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z" />
            <path d="M9 8.8c0 3.3 2.9 6.2 6.2 6.2l1.1-1.6-1.9-.9-.9.8c-1.1-.4-2.3-1.6-2.7-2.7l.8-.9-.9-1.9z" />
          </svg>
          Mandar por WhatsApp
        </a>
        {' '}
        <p style={{ margin: "14px 0 0", textAlign: "center", fontSize: "14px", color: "#6B5A63" }}>¿No se abre WhatsApp? Escribinos al +54 9 11 6686-4692</p>
      </form>
    </div>
  );
}
