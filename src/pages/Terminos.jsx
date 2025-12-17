import './PaginasLegales.css';

function Terminos() {
  return (
    <div className="pagina-legal">
      <div className="legal-container">
        <h1>Términos y Condiciones</h1>
        <p className="fecha-actualizacion">Última actualización: Diciembre 2025</p>

        <section>
          <h2>1. Aceptación de los Términos</h2>
          <p>
            Al acceder y utilizar el sitio web de Selvaggio Wine Bar & Delicatessen, 
            aceptás cumplir con estos términos y condiciones. Si no estás de acuerdo 
            con alguna parte de estos términos, te pedimos que no uses nuestros servicios.
          </p>
        </section>

        <section>
          <h2>2. Uso del Sitio</h2>
          <p>
            Este sitio web tiene propósito informativo sobre nuestros servicios, productos 
            y ubicación. Nos reservamos el derecho de modificar o discontinuar cualquier 
            parte del sitio sin previo aviso.
          </p>
        </section>

        <section>
          <h2>3. Propiedad Intelectual</h2>
          <p>
            Todo el contenido del sitio, incluyendo textos, imágenes, logos y diseño, 
            son propiedad de Selvaggio o tienen licencia para su uso. Está prohibida 
            su reproducción sin autorización expresa.
          </p>
        </section>

        <section>
          <h2>4. Información de Productos</h2>
          <p>
            Hacemos nuestro mejor esfuerzo para mostrar información precisa sobre nuestros 
            productos. Sin embargo, los precios, disponibilidad y descripciones pueden variar 
            sin previo aviso.
          </p>
        </section>

        <section>
          <h2>5. Reservas</h2>
          <p>
            Las reservas realizadas a través de WhatsApp u otros medios están sujetas a 
            disponibilidad y confirmación. Nos reservamos el derecho de rechazar o cancelar 
            reservas en casos excepcionales.
          </p>
        </section>

        <section>
          <h2>6. Conducta en el Local</h2>
          <p>
            Nos reservamos el derecho de admisión. Se espera que todos los visitantes 
            mantengan un comportamiento respetuoso. El consumo de alcohol está permitido 
            solo para mayores de 18 años.
          </p>
        </section>

        <section>
          <h2>7. Limitación de Responsabilidad</h2>
          <p>
            Selvaggio no se hace responsable por daños indirectos, incidentales o 
            consecuentes derivados del uso de nuestros servicios o productos.
          </p>
        </section>

        <section>
          <h2>8. Enlaces Externos</h2>
          <p>
            Nuestro sitio puede contener enlaces a sitios web de terceros. No nos hacemos 
            responsables del contenido o las prácticas de privacidad de estos sitios.
          </p>
        </section>

        <section>
          <h2>9. Modificaciones</h2>
          <p>
            Nos reservamos el derecho de modificar estos términos en cualquier momento. 
            Los cambios entrarán en vigor inmediatamente después de su publicación en el sitio.
          </p>
        </section>

        <section>
          <h2>10. Contacto</h2>
          <p>
            Para cualquier consulta sobre estos términos, podés contactarnos a través de:
          </p>
          <ul>
            <li>WhatsApp: +54 9 11 1566-8646</li>
            <li>Email: info@selvaggio.com.ar</li>
            <li>Ubicación: Fondo de la Legua, Buenos Aires</li>
          </ul>
        </section>

        <div className="legal-footer">
          <a href="/landing" className="btn-volver">← Volver al inicio</a>
        </div>
      </div>
    </div>
  );
}

export default Terminos;
