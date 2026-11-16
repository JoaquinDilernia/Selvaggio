// Generado desde el diseño (index.html) con tools/html2jsx.cjs — HERO VIDEO
export default function GenInicio() {
  return (
    <section id="inicio" aria-label="Selvaggio" style={{ position: "relative", height: "100vh", minHeight: "640px", overflow: "hidden", background: "#1E0717 url(/assets/hero-wide-poster.jpg) center / cover no-repeat", color: "#EDE9E2" }}>
      <video data-autoplay="1" preload="auto" src="/assets/hero-wide2.mp4" poster="/assets/hero-wide-poster.jpg" autoPlay muted loop playsInline aria-label="Recorrido por Selvaggio: el cartel, el salón, La Cava y un brindis" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover" }} />
      {' '}
      <div aria-hidden="true" style={{ position: "absolute", inset: "0", background: "linear-gradient(180deg, rgba(30,7,23,.6) 0%, rgba(30,7,23,.1) 30%, rgba(30,7,23,.2) 55%, rgba(30,7,23,.9) 100%)" }} />
      {' '}
      <a href="#cava" style={{ position: "absolute", top: "0", left: "0", right: "0", zIndex: "6", display: "block", padding: "10px 16px", background: "#440A33", color: "#EDE9E2", textAlign: "center", textDecoration: "none", fontFamily: "Jost, sans-serif", fontWeight: "500", fontSize: "12px", letterSpacing: ".22em", textTransform: "uppercase" }}>
        Fin de año en La Cava · fechas limitadas{' '}
        <span style={{ color: "#E2B8A6" }}>→</span>
      </a>
      {' '}
      <header style={{ position: "absolute", top: "38px", left: "0", right: "0", zIndex: "5" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "22px 40px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px 32px" }}>
          <a className="v2-navlogo" href="#inicio" aria-label="Selvaggio, inicio" style={{ display: "block", flex: "none", lineHeight: "0" }}>
            <img src="/assets/logo-cream.png" alt="Selvaggio" style={{ height: "34px", width: "auto" }} />
          </a>
          {' '}
          <nav className="topnav" aria-label="Principal" style={{ display: "flex", flexWrap: "wrap", gap: "8px 22px", marginLeft: "auto" }}>
            <a className="navlink" href="#como">Cómo funciona</a>
            {' '}
            <a className="navlink" href="#cava">La Cava</a>
            {' '}
            <a className="navlink" href="#reservar">Reservas</a>
            {' '}
            <a className="navlink" href="#galeria">Galería</a>
            {' '}
            <a className="navlink" href="#platos">Gastronomía</a>
            {' '}
            <a className="navlink" href="#takeaway">Take away</a>
            {' '}
            <a className="navlink" href="#prensa">Prensa</a>
            {' '}
            <a className="navlink" href="#maridaje">Maridaje</a>
            {' '}
            <a className="navlink" href="#trabaja">Trabajá con nosotros</a>
          </nav>
        </div>
      </header>
      {' '}
      <div className="v2-herobottom" style={{ position: "absolute", left: "0", right: "0", bottom: "0", padding: "0 40px 52px" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <img className="up" src="/assets/logo-cream.png" alt="Selvaggio" style={{ width: "clamp(260px, 34vw, 500px)", height: "auto", display: "block" }} />
          {' '}
          <p className="up d1" style={{ margin: "16px 0 0", maxWidth: "560px", fontSize: "clamp(16px, 1.5vw, 20px)", lineHeight: "1.6", color: "#F1E8EC" }}>Wine bar de autoservicio en Las Lomas de San Isidro. Elegís el vino y la tabla de nuestras heladeras, y te lo servimos en la mesa.</p>
          {' '}
          <div className="up d2" style={{ marginTop: "26px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <a className="btn btn-cream" href="#reservar" data-reserva="mesa" style={{ display: "inline-flex", alignItems: "center", minHeight: "52px", padding: "0 28px", border: "1px solid #EDE9E2", textDecoration: "none", fontFamily: "Jost, sans-serif", fontWeight: "500", fontSize: "13px", letterSpacing: ".24em", textTransform: "uppercase", background: "#EDE9E2", color: "#440A33" }}>Reservá</a>
            {' '}
            <a className="btn btn-ghost" href="#takeaway" style={{ display: "inline-flex", alignItems: "center", minHeight: "52px", padding: "0 28px", border: "1px solid #EDE9E2", textDecoration: "none", fontFamily: "Jost, sans-serif", fontWeight: "500", fontSize: "13px", letterSpacing: ".24em", textTransform: "uppercase", color: "#EDE9E2" }}>Take away · Armá tu picada</a>
          </div>
        </div>
      </div>
    </section>
  );
}
