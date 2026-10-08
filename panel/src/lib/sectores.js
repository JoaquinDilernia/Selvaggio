// Sectores del panel. El backend manda agent.sectores ya calculado (admin
// tiene todos; usuarios viejos sin sectores guardados, los de su rol).
export const SECTORES = [
  { id: 'bot',       label: 'Bot de WhatsApp', desc: 'Conversaciones, clientes, difusiones, base de conocimiento' },
  { id: 'gestion',   label: 'Gestión',         desc: 'Reservas, take away, cupones, calendario, eventos, salón' },
  { id: 'contenido', label: 'Contenido web',   desc: 'Carta, maridajes, galería, reseñas, prensa' },
  { id: 'caja',      label: 'Caja',            desc: 'Carga de pedidos del salón' },
  { id: 'cocina',    label: 'Cocina',          desc: 'Comandas en tiempo real' },
];

export function tieneSector(agent, sector) {
  return !!agent && (agent.role === 'admin' || (agent.sectores ?? []).includes(sector));
}
