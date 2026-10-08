export const FUNNELS = {
  cava: {
    titulo: 'La Cava',
    pasos: [
      { tipo: 'click_reservar_cava', label: "Click en 'Reservar La Cava'" },
      { tipo: 'view_content', label: 'Vio la página' },
      { tipo: 'checkout_iniciado', label: 'Inició el formulario' },
      { tipo: 'conversion', label: 'Reserva confirmada' },
    ],
  },
  mesa: {
    titulo: 'Mesa',
    pasos: [
      { tipo: 'click_reservar_mesa', label: "Click en 'Reservar Mesa'" },
      { tipo: 'view_content', label: 'Vio la página' },
      { tipo: 'checkout_iniciado', label: 'Inició el formulario' },
      { tipo: 'conversion', label: 'Reserva confirmada' },
    ],
  },
  takeaway: {
    titulo: 'Take Away',
    pasos: [
      { tipo: 'click_take_away', label: "Click en 'Take Away'" },
      { tipo: 'view_content', label: 'Vio el catálogo' },
      { tipo: 'add_to_cart', label: 'Agregó al carrito' },
      { tipo: 'checkout_iniciado', label: 'Inició el checkout' },
      { tipo: 'conversion', label: 'Pedido confirmado' },
    ],
  },
};

export const CLICK_TIPOS = Object.fromEntries(
  Object.entries(FUNNELS).map(([id, { pasos }]) => [id, pasos[0].tipo])
);
