import { describe, expect, it } from 'vitest';
import { pasajerosPara, requisitosPara } from '../src/data/requisitos.js';
import { DESTINOS } from '../src/data/destinos.js';

const adulto = { id: 'a', nombre: 'Ana', edad: 'adulto', nacionalidad: 'Argentina' };
const menor = { id: 'm', nombre: 'Mía', edad: 'menor', nacionalidad: 'Argentina' };
const bebe = { id: 'b', nombre: 'Beto', edad: 'bebe', nacionalidad: 'Argentina' };
const mayor = { id: 'y', nombre: 'Yolanda', edad: 'mayor', nacionalidad: 'Argentina' };
const uruguaya = { id: 'u', nombre: 'Uma', edad: 'adulto', nacionalidad: 'Uruguay' };
const claves = (lista) => lista.map((r) => r.key);

describe('requisitosPara', () => {
  it('arma un checklist con documento para cada uno de los 8 destinos', () => {
    expect(DESTINOS).toHaveLength(8);
    DESTINOS.forEach((d) => {
      const lista = requisitosPara(d.id);
      expect(lista.length).toBeGreaterThan(5);
      expect(claves(lista)).toContain('documento');
    });
  });

  it('pide visa y DS-160 para Estados Unidos, pero no para Uruguay', () => {
    expect(claves(requisitosPara('eeuu'))).toEqual(expect.arrayContaining(['visa', 'ds160']));
    expect(claves(requisitosPara('uruguay'))).not.toContain('visa');
  });

  it('pide ETIAS para Europa', () => {
    expect(claves(requisitosPara('espana'))).toContain('etias');
    expect(claves(requisitosPara('italia'))).toContain('etias');
  });

  it('devuelve una lista vacía con la plantilla personalizada', () => {
    expect(requisitosPara('eeuu', 'personalizado', [adulto, menor])).toEqual([]);
  });

  it('suma la plantilla elegida a los requisitos del destino', () => {
    const base = requisitosPara('brasil', 'vacaciones');
    const mochilero = requisitosPara('brasil', 'mochilero');
    expect(mochilero.length).toBeGreaterThan(base.length);
  });

  it('no repite claves dentro de un mismo checklist', () => {
    DESTINOS.forEach((d) => {
      const k = claves(requisitosPara(d.id, 'vacaciones', [adulto, menor, bebe, mayor, uruguaya]));
      expect(new Set(k).size).toBe(k.length);
    });
  });

  it('agrega requisitos según quién viaja', () => {
    expect(claves(requisitosPara('chile', 'vacaciones', [adulto]))).not.toContain('menores');
    const conChicos = claves(requisitosPara('chile', 'vacaciones', [adulto, menor, bebe]));
    expect(conChicos).toEqual(expect.arrayContaining(['menores', 'bebe-asiento', 'botiquin']));
    expect(claves(requisitosPara('chile', 'vacaciones', [mayor]))).toContain('seguro-mayores');
    expect(claves(requisitosPara('chile', 'vacaciones', [uruguaya]))).toContain('otra-nacionalidad');
  });

  it('marca como "por persona" los trámites individuales', () => {
    const doc = requisitosPara('eeuu').find((r) => r.key === 'documento');
    const vuelos = requisitosPara('eeuu').find((r) => r.key === 'vuelos');
    expect(doc.porPersona).toBe(true);
    expect(vuelos.porPersona).toBe(false);
  });
});

describe('pasajerosPara', () => {
  const todos = [adulto, menor, bebe, mayor];

  it('aplica a todos los pasajeros en un trámite general', () => {
    expect(pasajerosPara('documento', todos)).toHaveLength(4);
  });

  it('filtra a los menores en la autorización de viaje', () => {
    expect(pasajerosPara('menores', todos).map((p) => p.id)).toEqual(['m', 'b']);
  });

  it('filtra a los mayores de 65 en el seguro especial', () => {
    expect(pasajerosPara('seguro-mayores', todos).map((p) => p.id)).toEqual(['y']);
  });
});
