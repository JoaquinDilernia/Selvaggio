// Generado desde el diseño (index.html) con tools/html2jsx.cjs — MODAL RESERVAS (el formulario lo arma initReserva)
export default function GenRvModal() {
  return (
    <div id="rv-modal" role="dialog" aria-modal="true" aria-label="Reservas" style={{ position: "fixed", inset: "0", zIndex: "96", background: "rgba(21,17,19,.72)", padding: "24px 16px", overflowY: "auto", display: "none" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: "760px", margin: "auto", background: "#F7F4EE", boxShadow: "0 30px 80px rgba(0,0,0,.4)" }}>
        <button type="button" id="rv-close" aria-label="Cerrar" style={{ position: "absolute", top: "14px", right: "14px", zIndex: "2", width: "44px", height: "44px", border: "1px solid rgba(68,10,51,.25)", background: "#FFFFFF", color: "#440A33", fontSize: "22px", lineHeight: "1", cursor: "pointer" }}>×</button>
        {' '}
        <div id="rv-box" style={{ padding: "clamp(24px, 4vw, 48px)" }} />
      </div>
    </div>
  );
}
