// Datos de pasajeros: solo lo necesario para armar los requisitos.
// No se guarda documento ni fecha de nacimiento de otras personas: alcanza con el grupo de edad.

export const GRUPOS_EDAD = [
  { id: 'adulto', nombre: 'Adulto (18 a 64)' },
  { id: 'menor', nombre: 'Menor (2 a 17)' },
  { id: 'bebe', nombre: 'Bebé (menos de 2)' },
  { id: 'mayor', nombre: 'Mayor (65 o más)' },
];

export const GRUPOS_POR_ID = Object.fromEntries(GRUPOS_EDAD.map((g) => [g.id, g]));

export const NACIONALIDADES = [
  'Argentina',
  'Bolivia',
  'Brasil',
  'Chile',
  'Colombia',
  'España',
  'Estados Unidos',
  'Italia',
  'Paraguay',
  'Perú',
  'Uruguay',
  'Venezuela',
  'Otra',
];

export function edadDesde(nacimientoIso, hoy = new Date()) {
  if (!nacimientoIso) return null;
  const [y, m, d] = nacimientoIso.split('-').map(Number);
  let edad = hoy.getFullYear() - y;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) edad -= 1;
  return edad;
}

export function grupoDesdeEdad(edad) {
  if (edad == null) return 'adulto';
  if (edad < 2) return 'bebe';
  if (edad < 18) return 'menor';
  if (edad >= 65) return 'mayor';
  return 'adulto';
}

export const nuevoId = () => `p${Math.random().toString(36).slice(2, 9)}`;

export function titularDesdePerfil(user, perfil) {
  return {
    id: nuevoId(),
    nombre: perfil?.nombre || user?.displayName || 'Vos',
    edad: grupoDesdeEdad(edadDesde(perfil?.nacimiento)),
    nacionalidad: perfil?.nacionalidad || 'Argentina',
    uid: user?.uid || null,
  };
}

export function pasajeroVacio() {
  return { id: nuevoId(), nombre: '', edad: 'adulto', nacionalidad: 'Argentina', uid: null };
}

// Viajes de la V1 no tienen lista de pasajeros: se arma una a partir de la cantidad
export function pasajerosDe(trip, user, perfil) {
  if (trip?.pasajeros?.length) return trip.pasajeros;
  const n = trip?.viajeros || 1;
  return Array.from({ length: n }, (_, i) =>
    i === 0 ? titularDesdePerfil(user, perfil) : { ...pasajeroVacio(), nombre: `Pasajero ${i + 1}` },
  );
}
