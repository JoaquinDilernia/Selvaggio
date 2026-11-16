// Generado desde el diseño (index.html) con tools/html2jsx.cjs — INTRO: BIENVENIDA, SE SIRVE UNA COPA
export default function GenIntro() {
  return (
    <div className="intro-wrap" id="intro" role="dialog" aria-modal="true" aria-label="Bienvenida a Selvaggio" style={{ position: "fixed", inset: "0", zIndex: "100", background: "#151113", color: "#EDE9E2", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", overflow: "hidden" }}>
      <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <img className="intro-logo" src="/assets/logo-cream.png" alt="Selvaggio" style={{ width: "240px", height: "auto", display: "block", margin: "0 auto" }} />
        {' '}
        <svg width="168" height="210" viewBox="0 0 240 300" aria-hidden="true" style={{ overflow: "visible", marginTop: "40px", display: "block" }}>
          <defs>
            <clipPath id="bowl2">
              <path d="M70,100 L170,100 C172,190 148,232 120,236 C92,232 68,190 70,100 Z" />
            </clipPath>
          </defs>
          {' '}
          <rect className="intro-stream" x="118.5" y="64" width="3" height="172" fill="#8E1F4A" />
          {' '}
          <g clipPath="url(#bowl2)">
            <rect className="intro-wine" x="60" y="100" width="120" height="136" fill="#8E1F4A" />
          </g>
          {' '}
          <path d="M70,100 L170,100 C172,190 148,232 120,236 C92,232 68,190 70,100 Z" fill="none" stroke="#EDE9E2" strokeWidth="2.5" strokeLinejoin="round" />
          {' '}
          <line x1="120" y1="236" x2="120" y2="282" stroke="#EDE9E2" strokeWidth="2.5" />
          {' '}
          <path d="M80,288 C92,280 148,280 160,288 C148,294 92,294 80,288 Z" fill="none" stroke="#EDE9E2" strokeWidth="2.5" />
          {' '}
          <g className="intro-bottle">
            <path d="M-5,0 L5,0 L5,38 C5,48 20,52 20,66 L20,160 C20,165 17,168 12,168 L-12,168 C-17,168 -20,165 -20,160 L-20,66 C-20,52 -5,48 -5,38 Z" fill="#151113" stroke="#EDE9E2" strokeWidth="2.5" />
            {' '}
            <line x1="-20" y1="96" x2="20" y2="96" stroke="#EDE9E2" strokeWidth="1.2" />
          </g>
        </svg>
        {' '}
        <p className="intro-hi" style={{ margin: "30px 0 0", fontFamily: "Jost, sans-serif", fontWeight: "500", fontSize: "12px", letterSpacing: ".5em", textTransform: "uppercase", color: "#EDE9E2", paddingLeft: ".5em" }}>Bienvenidos</p>
      </div>
      {' '}
      <button id="skip" style={{ position: "absolute", right: "22px", top: "18px", background: "none", border: "0", padding: "10px", color: "#9C8F95", fontFamily: "Jost, sans-serif", fontSize: "12px", letterSpacing: ".2em", textTransform: "uppercase", cursor: "pointer" }}>Saltear</button>
    </div>
  );
}
