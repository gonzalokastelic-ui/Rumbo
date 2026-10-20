import { describe, expect, it } from 'vitest';
import {
  estadoDesdePersonas,
  estaVencido,
  itemsIniciales,
  ordenarItems,
  puedeEditar,
  resumenItems,
  sincronizarPasajeros,
} from '../src/lib/viajes.js';
import { sumarDias, hoyISO } from '../src/lib/fechas.js';

const ana = { id: 'a', nombre: 'Ana', edad: 'adulto', nacionalidad: 'Argentina' };
const leo = { id: 'l', nombre: 'Leo', edad: 'adulto', nacionalidad: 'Argentina' };
const mia = { id: 'm', nombre: 'Mía', edad: 'menor', nacionalidad: 'Argentina' };

describe('itemsIniciales', () => {
  const items = itemsIniciales('eeuu', 'vacaciones', [ana, leo]);

  it('crea los ítems pendientes, sin fecha límite y ordenados de a 10', () => {
    expect(items.length).toBeGreaterThan(0);
    items.forEach((it, i) => {
      expect(it.estado).toBe('pendiente');
      expect(it.fechaLimite).toBeNull();
      expect(it.orden).toBe(i * 10);
    });
  });

  it('pone la lista de pasajeros adentro de los trámites por persona', () => {
    const visa = items.find((it) => it.clave === 'visa');
    expect(visa.porPersona).toBe(true);
    expect(visa.personas).toEqual({ a: false, l: false });
  });

  it('sin pasajeros, los trámites no son por persona', () => {
    const visa = itemsIniciales('eeuu', 'vacaciones', []).find((it) => it.clave === 'visa');
    expect(visa.porPersona).toBe(false);
    expect(visa.personas).toBeNull();
  });
});

describe('estadoDesdePersonas', () => {
  it('calcula el estado según cuántos pasajeros lo resolvieron', () => {
    expect(estadoDesdePersonas({})).toBe('pendiente');
    expect(estadoDesdePersonas(null)).toBe('pendiente');
    expect(estadoDesdePersonas({ a: false, b: false })).toBe('pendiente');
    expect(estadoDesdePersonas({ a: true, b: false })).toBe('tramite');
    expect(estadoDesdePersonas({ a: true, b: true })).toBe('listo');
  });
});

describe('sincronizarPasajeros', () => {
  const trip = { destinoId: 'eeuu', plantilla: 'vacaciones' };
  const conIds = (lista) => lista.map((it, i) => ({ ...it, id: `i${i}` }));

  it('agrega a un pasajero nuevo sin perder lo que ya estaba tildado', () => {
    const items = conIds(itemsIniciales('eeuu', 'vacaciones', [ana])).map((it) =>
      it.clave === 'visa' ? { ...it, personas: { a: true }, estado: 'listo' } : it,
    );
    const { cambios } = sincronizarPasajeros(trip, items, [ana, leo]);
    const visa = cambios.find((c) => c.id === items.find((it) => it.clave === 'visa').id);
    expect(visa.patch.personas).toEqual({ a: true, l: false });
    expect(visa.patch.estado).toBe('tramite');
  });

  it('suma la autorización para menores cuando se agrega un menor', () => {
    const items = conIds(itemsIniciales('eeuu', 'vacaciones', [ana]));
    const { nuevos } = sincronizarPasajeros(trip, items, [ana, mia]);
    const claves = nuevos.map((it) => it.clave);
    expect(claves).toContain('menores');
    const ultimo = Math.max(...items.map((it) => it.orden));
    nuevos.forEach((it) => expect(it.orden).toBeGreaterThan(ultimo));
  });

  it('no cambia nada si los pasajeros son los mismos', () => {
    const items = conIds(itemsIniciales('eeuu', 'vacaciones', [ana, leo]));
    const { cambios, nuevos } = sincronizarPasajeros(trip, items, [ana, leo]);
    expect(cambios).toEqual([]);
    expect(nuevos).toEqual([]);
  });
});

describe('resumen, orden y vencimientos', () => {
  it('resume el avance del checklist', () => {
    const r = resumenItems([{ estado: 'listo' }, { estado: 'tramite' }, { estado: 'pendiente' }, { estado: 'listo' }]);
    expect(r).toEqual({ total: 4, listos: 2, tramite: 1, avance: 0.5 });
    expect(resumenItems([]).avance).toBe(0);
  });

  it('ordena por el campo orden', () => {
    const lista = [{ orden: 20 }, { orden: 0 }, { orden: 10 }].sort(ordenarItems);
    expect(lista.map((i) => i.orden)).toEqual([0, 10, 20]);
  });

  it('marca vencido solo lo que no está listo y tiene fecha pasada', () => {
    const ayer = sumarDias(hoyISO(), -1);
    expect(estaVencido({ estado: 'pendiente', fechaLimite: ayer })).toBe(true);
    expect(estaVencido({ estado: 'listo', fechaLimite: ayer })).toBe(false);
    expect(estaVencido({ estado: 'pendiente', fechaLimite: hoyISO() })).toBe(false);
    expect(estaVencido({ estado: 'pendiente', fechaLimite: null })).toBe(false);
  });
});

describe('puedeEditar', () => {
  const trip = { miembros: { o: 'owner', e: 'editor', v: 'viewer' } };
  it('deja editar al organizador y a los editores, no a los lectores', () => {
    expect(puedeEditar(trip, 'o')).toBe(true);
    expect(puedeEditar(trip, 'e')).toBe(true);
    expect(puedeEditar(trip, 'v')).toBe(false);
    expect(puedeEditar(trip, 'x')).toBe(false);
  });
});
