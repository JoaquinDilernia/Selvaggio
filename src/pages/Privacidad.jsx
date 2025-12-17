import './PaginasLegales.css';

function Privacidad() {
  return (
    <div className="pagina-legal">
      <div className="legal-container">
        <h1>Política de Privacidad</h1>
        <p className="fecha-actualizacion">Última actualización: Diciembre 2025</p>

        <section>
          <h2>1. Información que Recopilamos</h2>
          <p>
            Selvaggio recopila información personal cuando te comunicás con nosotros o 
            visitás nuestro local:
          </p>
          <ul>
            <li><strong>Datos de contacto:</strong> Nombre, teléfono, email</li>
            <li><strong>Reservas:</strong> Fecha, hora, cantidad de personas</li>
            <li><strong>Feedback:</strong> Comentarios y sugerencias que nos compartís</li>
            <li><strong>Datos técnicos:</strong> Dirección IP, tipo de navegador, páginas visitadas</li>
          </ul>
        </section>

        <section>
          <h2>2. Cómo Usamos tu Información</h2>
          <p>Utilizamos tu información para:</p>
          <ul>
            <li>Procesar y confirmar reservas</li>
            <li>Responder consultas y brindar atención al cliente</li>
            <li>Enviar newsletter (solo si te suscribiste)</li>
            <li>Mejorar nuestros servicios y experiencia del usuario</li>
            <li>Cumplir con obligaciones legales</li>
          </ul>
        </section>

        <section>
          <h2>3. Protección de Datos</h2>
          <p>
            Implementamos medidas de seguridad para proteger tu información personal contra 
            acceso no autorizado, alteración o divulgación. Utilizamos Firebase de Google 
            para almacenamiento seguro de datos.
          </p>
        </section>

        <section>
          <h2>4. Cookies</h2>
          <p>
            Nuestro sitio utiliza cookies para mejorar la experiencia del usuario y analizar 
            el tráfico. Podés configurar tu navegador para rechazar cookies, aunque esto 
            puede afectar algunas funcionalidades del sitio.
          </p>
        </section>

        <section>
          <h2>5. Compartir Información</h2>
          <p>
            No vendemos ni alquilamos tu información personal a terceros. Podemos compartir 
            datos solo en los siguientes casos:
          </p>
          <ul>
            <li>Con proveedores de servicios que nos ayudan a operar el sitio</li>
            <li>Cuando sea requerido por ley</li>
            <li>Para proteger nuestros derechos y seguridad</li>
          </ul>
        </section>

        <section>
          <h2>6. Servicios de Terceros</h2>
          <p>Utilizamos los siguientes servicios de terceros:</p>
          <ul>
            <li><strong>Google Firebase:</strong> Almacenamiento de datos</li>
            <li><strong>WhatsApp:</strong> Comunicación y reservas</li>
            <li><strong>Google Maps:</strong> Ubicación del local</li>
            <li><strong>Instagram:</strong> Galería de fotos</li>
          </ul>
          <p>
            Cada uno de estos servicios tiene su propia política de privacidad, 
            que te recomendamos revisar.
          </p>
        </section>

        <section>
          <h2>7. Tus Derechos</h2>
          <p>Tenés derecho a:</p>
          <ul>
            <li>Acceder a tus datos personales</li>
            <li>Solicitar corrección de información incorrecta</li>
            <li>Solicitar eliminación de tus datos</li>
            <li>Retirar consentimiento para el procesamiento de datos</li>
            <li>Darte de baja del newsletter en cualquier momento</li>
          </ul>
        </section>

        <section>
          <h2>8. Newsletter</h2>
          <p>
            Si te suscribís a nuestro newsletter, usaremos tu email exclusivamente para 
            enviarte novedades, eventos y promociones. Podés darte de baja en cualquier 
            momento haciendo clic en el enlace al final de cada email.
          </p>
        </section>

        <section>
          <h2>9. Menores de Edad</h2>
          <p>
            Nuestro sitio y servicios están dirigidos a personas mayores de 18 años. 
            No recopilamos intencionalmente información de menores.
          </p>
        </section>

        <section>
          <h2>10. Cambios en la Política</h2>
          <p>
            Podemos actualizar esta política de privacidad periódicamente. Te notificaremos 
            sobre cambios significativos publicando la nueva política en esta página.
          </p>
        </section>

        <section>
          <h2>11. Contacto</h2>
          <p>
            Para ejercer tus derechos o hacer consultas sobre privacidad, contactanos:
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

export default Privacidad;
