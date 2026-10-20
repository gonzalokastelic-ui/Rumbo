import { describe, expect, it } from 'vitest';
import { diasDelViaje, diasEntre, formatoCorto, sumarDias, urgencia, hoyISO } from '../src/lib/fechas.js';
import { edadDesde, grupoDesdeEdad, pasajerosDe } from '../src/data/pasajeros.js';

describe('fechas', () => {
  it('suma días cruzando meses y años', () => {
    expect(sumarDias('2026-12-30', 3)).toBe('2027-01-02');
    expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('cuenta los días entre dos fechas', () => {
    expect(diasEntre('2027-02-14', '2027-02-21')).toBe(7);
    expect(diasEntre('2027-02-21', '2027-02-14')).toBe(-7);
  });

  it('lista todos los días del viaje, de la salida a la vuelta', () => {
    const dias = diasDelViaje('2027-02-14', '2027-02-17');
    expect(dias.map((d) => d.fecha)).toEqual(['2027-02-14', '2027-02-15', '2027-02-16', '2027-02-17']);
    expect(dias[0].etiqueta).toMatch(/^Día 1, /);
    expect(diasDelViaje('2027-02-17', '2027-02-14')).toEqual([]);
    expect(diasDelViaje(null, '2027-02-14')).toEqual([]);
  });

  it('formatea fechas en español', () => {
    expect(formatoCorto('2027-02-14')).toBe('14 feb');
  });

  it('calcula la urgencia de una fecha límite', () => {
    expect(urgencia(null)).toBeNull();
    expect(urgencia(sumarDias(hoyISO(), -2))).toBe('vencido');
    expect(urgencia(sumarDias(hoyISO(), 5))).toBe('urgente');
    expect(urgencia(sumarDias(hoyISO(), 40))).toBe('ok');
  });
});

describe('pasajeros', () => {
  it('calcula la edad teniendo en cuenta si ya cumplió años', () => {
    const hoy = new Date(2026, 9, 20);
    expect(edadDesde('2000-10-20', hoy)).toBe(26);
    expect(edadDesde('2000-10-21', hoy)).toBe(25);
    expect(edadDesde(null, hoy)).toBeNull();
  });

  it('asigna el grupo de edad', () => {
    expect(grupoDesdeEdad(1)).toBe('bebe');
    expect(grupoDesdeEdad(2)).toBe('menor');
    expect(grupoDesdeEdad(17)).toBe('menor');
    expect(grupoDesdeEdad(18)).toBe('adulto');
    expect(grupoDesdeEdad(65)).toBe('mayor');
    expect(grupoDesdeEdad(null)).toBe('adulto');
  });

  it('arma la lista de pasajeros de un viaje viejo a partir de la cantidad', () => {
    const lista = pasajerosDe({ viajeros: 3 }, { uid: 'u1', displayName: 'Gonzalo' }, null);
    expect(lista).toHaveLength(3);
    expect(lista[0]).toMatchObject({ nombre: 'Gonzalo', uid: 'u1' });
    expect(lista[2].nombre).toBe('Pasajero 3');
  });
});
