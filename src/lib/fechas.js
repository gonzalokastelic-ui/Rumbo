const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// 'YYYY-MM-DD' -> Date a mediodia local (evita corrimientos por zona horaria)
export function parseISO(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function sumarDias(iso, dias) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + dias);
  return toISO(d);
}

export function diasEntre(aIso, bIso) {
  const a = parseISO(aIso);
  const b = parseISO(bIso);
  return Math.round((b - a) / 86400000);
}

export function hoyISO() {
  return toISO(new Date());
}

export function formatoCorto(iso) {
  const d = parseISO(iso);
  if (!d) return '';
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function formatoLargo(iso) {
  const d = parseISO(iso);
  if (!d) return '';
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

// 'vencido' | 'urgente' (menos de 14 dias) | 'ok' | null
export function urgencia(limiteIso) {
  if (!limiteIso) return null;
  const dias = diasEntre(hoyISO(), limiteIso);
  if (dias < 0) return 'vencido';
  if (dias <= 14) return 'urgente';
  return 'ok';
}

export function diasParaViaje(fechaIda) {
  if (!fechaIda) return null;
  return diasEntre(hoyISO(), fechaIda);
}

const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export function formatoDia(iso) {
  const d = parseISO(iso);
  if (!d) return '';
  return `${DIAS_SEMANA[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

// Todos los dias del viaje, de la salida a la vuelta inclusive
export function diasDelViaje(desde, hasta) {
  if (!desde || !hasta || hasta < desde) return [];
  const total = diasEntre(desde, hasta);
  return Array.from({ length: Math.min(total, 90) + 1 }, (_, i) => {
    const fecha = sumarDias(desde, i);
    return { fecha, n: i + 1, etiqueta: `Día ${i + 1}, ${formatoDia(fecha)}` };
  });
}
