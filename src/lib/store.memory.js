// Almacen en memoria con la misma API que store.firebase.js.
// Solo se usa en "modo demo", cuando no hay variables de Firebase configuradas:
// permite recorrer toda la interfaz. Los datos se pierden al recargar.
let nextId = 1;
const uid = () => `demo-${nextId++}`;

export function createMemoryStore() {
  const trips = new Map();
  const items = new Map(); // tripId -> Map(itemId, item)
  const invites = new Map();
  const eventos = new Map(); // tripId -> Map(eventoId, evento)
  const perfiles = new Map();
  const comentarios = new Map(); // `${tripId}/${itemId}` -> Map
  const actividad = new Map(); // tripId -> array
  const listeners = new Set();

  const emit = () => listeners.forEach((fn) => fn());
  const listen = (compute, onData) => {
    const run = () => onData(compute());
    listeners.add(run);
    queueMicrotask(run);
    return () => listeners.delete(run);
  };
  const tripItems = (tripId) => {
    if (!items.has(tripId)) items.set(tripId, new Map());
    return items.get(tripId);
  };

  return {
    mode: 'demo',

    subscribeTrips(userId, onData) {
      return listen(
        () => [...trips.values()].filter((t) => t.miembrosUids.includes(userId)).map((t) => ({ ...t })),
        onData,
      );
    },

    subscribeTrip(tripId, onData) {
      return listen(() => (trips.has(tripId) ? { ...trips.get(tripId) } : null), onData);
    },

    subscribeItems(tripId, onData) {
      return listen(() => [...tripItems(tripId).values()].map((i) => ({ ...i })), onData);
    },

    async createTrip(user, datos, lista) {
      const id = uid();
      trips.set(id, {
        id,
        ...datos,
        ownerId: user.uid,
        miembros: { [user.uid]: 'owner' },
        miembrosUids: [user.uid],
        miembrosInfo: { [user.uid]: { nombre: user.displayName || 'Vos', foto: null } },
      });
      const m = tripItems(id);
      lista.forEach((it, i) => {
        const itemId = uid();
        m.set(itemId, { id: itemId, ...it, orden: it.orden ?? i * 10 });
      });
      emit();
      return id;
    },

    async updateTrip(tripId, patch) {
      trips.set(tripId, { ...trips.get(tripId), ...patch });
      emit();
    },

    async deleteTrip(tripId) {
      trips.delete(tripId);
      items.delete(tripId);
      eventos.delete(tripId);
      actividad.delete(tripId);
      emit();
    },

    async addItem(tripId, item) {
      const id = uid();
      tripItems(tripId).set(id, { id, ...item });
      emit();
    },

    async updateItem(tripId, itemId, patch) {
      const m = tripItems(tripId);
      m.set(itemId, { ...m.get(itemId), ...patch });
      emit();
    },

    async reorderItems(tripId, cambios) {
      const m = tripItems(tripId);
      cambios.forEach(({ id, orden }) => m.set(id, { ...m.get(id), orden }));
      emit();
    },

    async deleteItem(tripId, itemId) {
      tripItems(tripId).delete(itemId);
      emit();
    },

    subscribeItinerario(tripId, onData) {
      if (!eventos.has(tripId)) eventos.set(tripId, new Map());
      return listen(() => [...eventos.get(tripId).values()].map((e) => ({ ...e })), onData);
    },

    async addEvento(tripId, evento) {
      if (!eventos.has(tripId)) eventos.set(tripId, new Map());
      const id = uid();
      eventos.get(tripId).set(id, { id, ...evento });
      emit();
    },

    async updateEvento(tripId, eventoId, patch) {
      const m = eventos.get(tripId);
      m.set(eventoId, { ...m.get(eventoId), ...patch });
      emit();
    },

    async deleteEvento(tripId, eventoId) {
      eventos.get(tripId)?.delete(eventoId);
      emit();
    },

    async reorderEventos(tripId, cambios) {
      const m = eventos.get(tripId);
      cambios.forEach(({ id, orden }) => m.set(id, { ...m.get(id), orden }));
      emit();
    },

    subscribeComentarios(tripId, itemId, onData) {
      const k = `${tripId}/${itemId}`;
      if (!comentarios.has(k)) comentarios.set(k, new Map());
      return listen(() => [...comentarios.get(k).values()].sort((a, b) => a.creado - b.creado), onData);
    },

    async addComentario(tripId, itemId, comentario) {
      const k = `${tripId}/${itemId}`;
      if (!comentarios.has(k)) comentarios.set(k, new Map());
      const id = uid();
      comentarios.get(k).set(id, { id, ...comentario, creado: Date.now() });
      emit();
    },

    async deleteComentario(tripId, itemId, comentarioId) {
      comentarios.get(`${tripId}/${itemId}`)?.delete(comentarioId);
      emit();
    },

    subscribeActividad(tripId, onData) {
      return listen(() => [...(actividad.get(tripId) || [])].sort((a, b) => b.creado - a.creado).slice(0, 40), onData);
    },

    async registrarActividad(tripId, evento) {
      if (!actividad.has(tripId)) actividad.set(tripId, []);
      actividad.get(tripId).push({ id: uid(), ...evento, creado: Date.now() });
      emit();
    },

    async getProfile(userId) {
      return perfiles.get(userId) || null;
    },

    async saveProfile(userId, perfil) {
      perfiles.set(userId, { ...perfiles.get(userId), ...perfil });
    },

    async createInvite(user, tripId, rol) {
      const token = `demo${uid()}`.replace('-', '');
      invites.set(token, { id: token, tripId, rol, ownerId: user.uid, activo: true });
      emit();
      return token;
    },

    subscribeInvites(user, tripId, onData) {
      return listen(
        () => [...invites.values()].filter((i) => i.tripId === tripId && i.activo),
        onData,
      );
    },

    async revokeInvite(token) {
      invites.set(token, { ...invites.get(token), activo: false });
      emit();
    },

    async getInvite(token) {
      return invites.get(token) || null;
    },

    async joinTrip() {
      // En modo demo hay un solo usuario: no hay nada que unir.
    },

    async setMemberRole(tripId, userId, rol) {
      const t = trips.get(tripId);
      trips.set(tripId, { ...t, miembros: { ...t.miembros, [userId]: rol } });
      emit();
    },

    async removeMember(tripId, userId) {
      const t = trips.get(tripId);
      const { [userId]: _a, ...miembros } = t.miembros;
      const { [userId]: _b, ...miembrosInfo } = t.miembrosInfo;
      trips.set(tripId, {
        ...t,
        miembros,
        miembrosInfo,
        miembrosUids: t.miembrosUids.filter((u) => u !== userId),
      });
      emit();
    },
  };
}
