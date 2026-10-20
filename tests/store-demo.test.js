import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '../src/lib/store.memory.js';
import { itemsIniciales } from '../src/lib/viajes.js';

// La capa de datos del modo demo tiene la misma API que la de Firebase
const primero = (sub) => new Promise((ok) => {
  const off = sub((data) => {
    ok(data);
    queueMicrotask(() => off && off());
  });
});

describe('store en memoria', () => {
  const user = { uid: 'u1', displayName: 'Gonzalo' };

  it('crea un viaje con sus ítems y lo borra', async () => {
    const store = createMemoryStore();
    const id = await store.createTrip(user, { nombre: 'Roma', destinoId: 'italia' }, itemsIniciales('italia', 'vacaciones'));
    const trip = await primero((ok) => store.subscribeTrip(id, ok));
    expect(trip).toMatchObject({ nombre: 'Roma', ownerId: 'u1', miembros: { u1: 'owner' } });
    const items = await primero((ok) => store.subscribeItems(id, ok));
    expect(items.length).toBeGreaterThan(0);
    await store.deleteTrip(id);
    expect(await primero((ok) => store.subscribeTrip(id, ok))).toBeNull();
  });

  it('guarda comentarios por ítem y la actividad del grupo', async () => {
    const store = createMemoryStore();
    await store.addComentario('t1', 'i1', { uid: 'u1', nombre: 'Gonzalo', texto: '¿Lo pagamos juntos?' });
    await store.addComentario('t1', 'i2', { uid: 'u1', nombre: 'Gonzalo', texto: 'Otro ítem' });
    const coms = await primero((ok) => store.subscribeComentarios('t1', 'i1', ok));
    expect(coms.map((c) => c.texto)).toEqual(['¿Lo pagamos juntos?']);
    await store.deleteComentario('t1', 'i1', coms[0].id);
    expect(await primero((ok) => store.subscribeComentarios('t1', 'i1', ok))).toEqual([]);

    await store.registrarActividad('t1', { uid: 'u1', nombre: 'Gonzalo', tipo: 'item', texto: 'agregó «Visa»' });
    const feed = await primero((ok) => store.subscribeActividad('t1', ok));
    expect(feed[0].texto).toBe('agregó «Visa»');
  });
});
