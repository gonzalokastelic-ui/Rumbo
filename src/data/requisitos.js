// Motor de requisitos: dado un destino (y una plantilla), devuelve el checklist
// minimo para viajar desde Argentina. Los items nacen sin fecha limite: es la
// persona quien decide si le pone una.
//
// Los requisitos migratorios cambian. Cada destino lleva `verificado` y la app
// siempre muestra un aviso para confirmar en la fuente oficial.

export const CATEGORIAS = [
  { id: 'documentacion', nombre: 'Documentación', icono: 'IdentificationCard' },
  { id: 'salud', nombre: 'Salud y seguro', icono: 'FirstAidKit' },
  { id: 'transporte', nombre: 'Transporte', icono: 'AirplaneTilt' },
  { id: 'alojamiento', nombre: 'Alojamiento', icono: 'Bed' },
  { id: 'actividades', nombre: 'Actividades', icono: 'MapPinArea' },
  { id: 'dinero', nombre: 'Dinero y básicos', icono: 'Wallet' },
];

export const CATEGORIAS_POR_ID = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]));

export const ESTADOS = [
  { id: 'pendiente', nombre: 'Pendiente' },
  { id: 'tramite', nombre: 'En trámite' },
  { id: 'listo', nombre: 'Listo' },
];

export const PLANTILLAS = [
  { id: 'vacaciones', nombre: 'Vacaciones', desc: 'El checklist estándar para descansar.' },
  { id: 'escapada', nombre: 'Escapada corta', desc: 'Fin de semana largo, equipaje de mano.' },
  { id: 'mochilero', nombre: 'Mochilero', desc: 'Presupuesto ajustado y reservas flexibles.' },
  { id: 'trabajo', nombre: 'Trabajo o estudio', desc: 'Documentos y conectividad para rendir.' },
];

const base = [
  {
    key: 'seguro',
    titulo: 'Seguro de viaje con asistencia médica',
    categoria: 'salud',
    desc: 'Cobertura médica, cancelación y equipaje. Revisá el tope de gastos médicos.',
  },
  {
    key: 'vuelos',
    titulo: 'Vuelos de ida y vuelta',
    categoria: 'transporte',
    desc: 'Mirá el calendario de precios en Recomendados antes de elegir fecha.',
  },
  {
    key: 'alojamiento',
    titulo: 'Alojamiento reservado',
    categoria: 'alojamiento',
    desc: 'Preferí tarifas con cancelación gratuita hasta tener todo confirmado.',
  },
  {
    key: 'traslado',
    titulo: 'Traslado del aeropuerto al alojamiento',
    categoria: 'transporte',
    desc: 'Transfer privado, transporte público o remís. Guardá la dirección sin conexión.',
  },
  {
    key: 'actividades',
    titulo: 'Actividades y entradas principales',
    categoria: 'actividades',
    desc: 'Reservá con anticipación las que tienen cupo limitado.',
  },
  {
    key: 'tarjetas',
    titulo: 'Tarjetas habilitadas para el exterior',
    categoria: 'dinero',
    desc: 'Confirmá el límite internacional y llevá una segunda tarjeta de respaldo.',
  },
  {
    key: 'conectividad',
    titulo: 'eSIM, chip local o roaming',
    categoria: 'dinero',
    desc: 'Verificá que tu celular esté liberado antes de comprar una eSIM.',
  },
  {
    key: 'copias',
    titulo: 'Copias digitales de documentos y reservas',
    categoria: 'documentacion',
    desc: 'Pasaporte, seguro, vouchers y contactos de emergencia, disponibles sin internet.',
  },
  {
    key: 'equipaje',
    titulo: 'Equipaje y pronóstico del clima',
    categoria: 'dinero',
    desc: 'Revisá los límites de peso de tu aerolínea y qué podés llevar en cabina.',
  },
];

const porDestino = {
  brasil: {
    verificado: '2026-10-13',
    items: [
      {
        key: 'documento',
        titulo: 'DNI en buen estado o pasaporte vigente',
        categoria: 'documentacion',
        desc: 'Los argentinos entran a Brasil con DNI sin visa para turismo. El documento debe estar en buen estado.',
        link: 'https://www.cancilleria.gob.ar',
      },
      {
        key: 'vacunas',
        titulo: 'Calendario de vacunación al día',
        categoria: 'salud',
        desc: 'Consultá con tu médico si conviene la vacuna contra la fiebre amarilla según las zonas que visites.',
      },
    ],
  },
  chile: {
    verificado: '2026-10-13',
    items: [
      {
        key: 'documento',
        titulo: 'DNI en buen estado o pasaporte vigente',
        categoria: 'documentacion',
        desc: 'Los argentinos ingresan a Chile con DNI sin visa para turismo.',
        link: 'https://www.cancilleria.gob.ar',
      },
      {
        key: 'sag',
        titulo: 'Declaración jurada del SAG',
        categoria: 'documentacion',
        desc: 'Declarás si traés alimentos, plantas o productos de origen animal. No declarar tiene multa.',
        link: 'https://www.sag.gob.cl',
      },
    ],
  },
  espana: {
    verificado: '2026-10-13',
    items: [
      {
        key: 'documento',
        titulo: 'Pasaporte vigente (al menos 3 meses tras la salida)',
        categoria: 'documentacion',
        desc: 'Los argentinos no necesitan visa para estadías turísticas de hasta 90 días en el espacio Schengen.',
        link: 'https://www.exteriores.gob.es',
      },
      {
        key: 'etias',
        titulo: 'Verificar si ETIAS ya es obligatorio',
        categoria: 'documentacion',
        desc: 'ETIAS es una autorización electrónica de viaje para Europa. Confirmá si ya rige en tu fecha de viaje.',
        link: 'https://travel-europe.europa.eu/etias_en',
      },
      {
        key: 'solvencia',
        titulo: 'Pasaje de regreso y comprobante de alojamiento',
        categoria: 'documentacion',
        desc: 'Migraciones puede pedir que demuestres vuelta, reserva y medios económicos.',
      },
    ],
  },
  eeuu: {
    verificado: '2026-10-13',
    items: [
      {
        key: 'documento',
        titulo: 'Pasaporte vigente',
        categoria: 'documentacion',
        desc: 'Tiene que cubrir toda la estadía. Si vence en menos de un año, renovalo antes de pedir la visa.',
        link: 'https://www.argentina.gob.ar',
      },
      {
        key: 'visa',
        titulo: 'Visa de turismo B1/B2',
        categoria: 'documentacion',
        desc: 'Los argentinos necesitan visa, ESTA no aplica. Completás el formulario DS-160, pagás la tasa y sacás turno de entrevista en el consulado.',
        link: 'https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visitor.html',
      },
      {
        key: 'ds160',
        titulo: 'Entrevista consular y documentación de respaldo',
        categoria: 'documentacion',
        desc: 'Llevá comprobantes de trabajo o estudio, ingresos y vínculos con Argentina.',
      },
    ],
  },
  italia: {
    verificado: '2026-10-13',
    items: [
      {
        key: 'documento',
        titulo: 'Pasaporte vigente (al menos 3 meses tras la salida)',
        categoria: 'documentacion',
        desc: 'Los argentinos no necesitan visa para estadías turísticas de hasta 90 días en el espacio Schengen.',
        link: 'https://www.esteri.it',
      },
      {
        key: 'etias',
        titulo: 'Verificar si ETIAS ya es obligatorio',
        categoria: 'documentacion',
        desc: 'ETIAS es una autorización electrónica de viaje para Europa. Confirmá si ya rige en tu fecha de viaje.',
        link: 'https://travel-europe.europa.eu/etias_en',
      },
      {
        key: 'solvencia',
        titulo: 'Pasaje de regreso y comprobante de alojamiento',
        categoria: 'documentacion',
        desc: 'Migraciones puede pedir que demuestres vuelta, reserva y medios económicos.',
      },
    ],
  },
  uruguay: {
    verificado: '2026-10-13',
    items: [
      {
        key: 'documento',
        titulo: 'DNI en buen estado o pasaporte vigente',
        categoria: 'documentacion',
        desc: 'Los argentinos viajan a Uruguay con DNI, sin visa.',
        link: 'https://www.cancilleria.gob.ar',
      },
      {
        key: 'cruce',
        titulo: 'Pasaje de barco o vuelo a Montevideo o Colonia',
        categoria: 'transporte',
        desc: 'Comparás barco con vuelo según tu punto de partida. En fines de semana largos se agota rápido.',
      },
    ],
  },
  mexico: {
    verificado: '2026-10-13',
    items: [
      {
        key: 'documento',
        titulo: 'Pasaporte vigente',
        categoria: 'documentacion',
        desc: 'Los argentinos no necesitan visa para turismo en México. El pasaporte debe estar vigente durante toda la estadía.',
        link: 'https://www.inm.gob.mx',
      },
      {
        key: 'fmm',
        titulo: 'Formulario migratorio y comprobantes de viaje',
        categoria: 'documentacion',
        desc: 'Completás el formulario migratorio y tené a mano pasaje de regreso y reserva de alojamiento.',
        link: 'https://www.inm.gob.mx',
      },
    ],
  },
  aruba: {
    verificado: '2026-10-13',
    items: [
      {
        key: 'documento',
        titulo: 'Pasaporte vigente',
        categoria: 'documentacion',
        desc: 'Revisá en el sitio oficial de turismo de Aruba los requisitos de ingreso para tu nacionalidad.',
        link: 'https://www.aruba.com',
      },
      {
        key: 'ingreso',
        titulo: 'Tarjeta de ingreso y formularios en línea',
        categoria: 'documentacion',
        desc: 'Aruba pide completar un formulario digital de embarque y desembarque antes de llegar.',
        link: 'https://www.aruba.com',
      },
    ],
  },
};

const porPlantilla = {
  vacaciones: [],
  escapada: [
    {
      key: 'equipaje-mano',
      titulo: 'Equipaje solo de cabina',
      categoria: 'dinero',
      desc: 'Revisá medidas y peso de cabina de tu aerolínea para no pagar de más.',
    },
  ],
  mochilero: [
    {
      key: 'seguro-extendido',
      titulo: 'Seguro con cobertura para actividades de aventura',
      categoria: 'salud',
      desc: 'Verificá que cubra trekking, deportes y estadías largas.',
    },
    {
      key: 'reservas-flexibles',
      titulo: 'Reservas flexibles o cancelables',
      categoria: 'alojamiento',
      desc: 'Dejá margen para cambiar el itinerario sin perder plata.',
    },
  ],
  trabajo: [
    {
      key: 'comprobantes',
      titulo: 'Carta de invitación o comprobante del evento',
      categoria: 'documentacion',
      desc: 'Migraciones puede pedir el motivo del viaje. Tené el comprobante a mano.',
    },
    {
      key: 'espacio',
      titulo: 'Alojamiento con buena conexión y escritorio',
      categoria: 'alojamiento',
      desc: 'Confirmá wifi estable y un lugar cómodo para trabajar o estudiar.',
    },
  ],
};

// Requisitos que dependen de quienes viajan. `aplica` decide a que pasajeros
// alcanza: si no alcanza a ninguno, el item no se agrega.
const esMenor = (p) => p.edad === 'menor' || p.edad === 'bebe';
const porPasajeros = [
  {
    key: 'menores',
    titulo: 'Autorización de viaje para menores',
    categoria: 'documentacion',
    desc: 'Si un menor viaja sin alguno de sus padres, necesita una autorización certificada ante escribano o juez.',
    link: 'https://www.argentina.gob.ar',
    porPersona: true,
    aplica: esMenor,
  },
  {
    key: 'bebe-asiento',
    titulo: 'Asiento, cuna o butaca para el bebé',
    categoria: 'transporte',
    desc: 'Consultá a la aerolínea por cuna a bordo y cómo viaja el cochecito.',
    aplica: (p) => p.edad === 'bebe',
  },
  {
    key: 'botiquin',
    titulo: 'Botiquín y medicación habitual de los chicos',
    categoria: 'salud',
    desc: 'Llevá recetas y medicación en el equipaje de mano.',
    aplica: esMenor,
  },
  {
    key: 'seguro-mayores',
    titulo: 'Seguro con cobertura para mayores de 65',
    categoria: 'salud',
    desc: 'Muchos seguros limitan la cobertura por edad. Confirmá topes y enfermedades preexistentes.',
    porPersona: true,
    aplica: (p) => p.edad === 'mayor',
  },
  {
    key: 'otra-nacionalidad',
    titulo: 'Requisitos para pasaporte no argentino',
    categoria: 'documentacion',
    desc: 'Esta lista está pensada para pasaporte argentino. Revisá visa y requisitos de ingreso para cada nacionalidad en el consulado del destino.',
    porPersona: true,
    aplica: (p) => Boolean(p.nacionalidad) && p.nacionalidad !== 'Argentina',
  },
];

// Trámites que cada pasajero resuelve por su cuenta: un solo item con la lista de personas adentro
const POR_PERSONA = new Set(['documento', 'visa', 'ds160', 'etias', 'fmm', 'ingreso', 'seguro', 'seguro-extendido']);

export function requisitosPara(destinoId, plantillaId = 'vacaciones', pasajeros = []) {
  const d = porDestino[destinoId];
  const extras = porPlantilla[plantillaId] || [];
  const generales = [...(d ? d.items : []), ...base, ...extras].map((it) => ({
    ...it,
    porPersona: POR_PERSONA.has(it.key),
  }));
  const segunPasajeros = porPasajeros
    .filter((it) => pasajeros.some(it.aplica))
    .map((it) => ({ ...it, porPersona: Boolean(it.porPersona) }));
  return [...generales, ...segunPasajeros];
}

// A que pasajeros alcanza un item por persona (por defecto, a todos)
export function pasajerosPara(clave, pasajeros = []) {
  const def = porPasajeros.find((it) => it.key === clave);
  return def ? pasajeros.filter(def.aplica) : pasajeros;
}

export function verificadoPara(destinoId) {
  return porDestino[destinoId]?.verificado || null;
}
