// Capa de datos sobre Cloud Firestore. Es la unica parte de la app que habla con
// Firebase: todas las lecturas (onSnapshot / getDoc) y escrituras (setDoc,
// updateDoc, deleteDoc, writeBatch) pasan por aca.
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  deleteField,
} from 'firebase/firestore';
import { nuevoToken } from './viajes.js';

const conId = (snap) => ({ id: snap.id, ...snap.data() });

export function createFirebaseStore(db) {
  const trips = collection(db, 'trips');
  const invites = collection(db, 'invites');

  return {
    mode: 'firebase',

    // Mis viajes (propios y compartidos conmigo), en tiempo real
    subscribeTrips(uid, onData, onError) {
      const q = query(trips, where('miembrosUids', 'array-contains', uid));
      return onSnapshot(q, (s) => onData(s.docs.map(conId)), onError);
    },

    subscribeTrip(tripId, onData, onError) {
      return onSnapshot(
        doc(db, 'trips', tripId),
        (s) => onData(s.exists() ? conId(s) : null),
        onError,
      );
    },

    subscribeItems(tripId, onData, onError) {
      return onSnapshot(
        collection(db, 'trips', tripId, 'items'),
        (s) => onData(s.docs.map(conId)),
        onError,
      );
    },

    async createTrip(user, datos, items) {
      const tripRef = doc(trips);
      const batch = writeBatch(db);
      batch.set(tripRef, {
        ...datos,
        ownerId: user.uid,
        miembros: { [user.uid]: 'owner' },
        miembrosUids: [user.uid],
        miembrosInfo: { [user.uid]: { nombre: user.displayName || 'Vos', foto: user.photoURL || null } },
        creado: serverTimestamp(),
      });
      items.forEach((it, i) => {
        batch.set(doc(collection(db, 'trips', tripRef.id, 'items')), {
          ...it,
          orden: it.orden ?? i * 10,
          creado: serverTimestamp(),
        });
      });
      await batch.commit();
      return tripRef.id;
    },

    updateTrip(tripId, patch) {
      return updateDoc(doc(db, 'trips', tripId), patch);
    },

    async deleteTrip(tripId) {
      const [items, eventos, actividad, altas] = await Promise.all([
        getDocs(collection(db, 'trips', tripId, 'items')),
        getDocs(collection(db, 'trips', tripId, 'itinerario')),
        getDocs(collection(db, 'trips', tripId, 'actividad')),
        getDocs(collection(db, 'trips', tripId, 'joins')).catch(() => ({ forEach: () => {} })),
      ]);
      const comentarios = await Promise.all(
        items.docs.map((d) => getDocs(collection(db, 'trips', tripId, 'items', d.id, 'comentarios'))),
      );
      const batch = writeBatch(db);
      comentarios.forEach((snap) => snap.forEach((d) => batch.delete(d.ref)));
      items.forEach((d) => batch.delete(d.ref));
      eventos.forEach((d) => batch.delete(d.ref));
      actividad.forEach((d) => batch.delete(d.ref));
      altas.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, 'trips', tripId));
      await batch.commit();
    },

    addItem(tripId, item) {
      return setDoc(doc(collection(db, 'trips', tripId, 'items')), {
        ...item,
        creado: serverTimestamp(),
      });
    },

    updateItem(tripId, itemId, patch) {
      return updateDoc(doc(db, 'trips', tripId, 'items', itemId), patch);
    },

    deleteItem(tripId, itemId) {
      return deleteDoc(doc(db, 'trips', tripId, 'items', itemId));
    },

    // Guarda el nuevo orden de varios items en una sola escritura atomica
    reorderItems(tripId, cambios) {
      const batch = writeBatch(db);
      cambios.forEach(({ id, orden }) => batch.update(doc(db, 'trips', tripId, 'items', id), { orden }));
      return batch.commit();
    },

    // Itinerario: un documento por actividad, con su dia (fecha) y orden dentro del dia
    subscribeItinerario(tripId, onData, onError) {
      return onSnapshot(
        collection(db, 'trips', tripId, 'itinerario'),
        (s) => onData(s.docs.map(conId)),
        onError,
      );
    },

    addEvento(tripId, evento) {
      return setDoc(doc(collection(db, 'trips', tripId, 'itinerario')), {
        ...evento,
        creado: serverTimestamp(),
      });
    },

    updateEvento(tripId, eventoId, patch) {
      return updateDoc(doc(db, 'trips', tripId, 'itinerario', eventoId), patch);
    },

    deleteEvento(tripId, eventoId) {
      return deleteDoc(doc(db, 'trips', tripId, 'itinerario', eventoId));
    },

    reorderEventos(tripId, cambios) {
      const batch = writeBatch(db);
      cambios.forEach(({ id, orden }) => batch.update(doc(db, 'trips', tripId, 'itinerario', id), { orden }));
      return batch.commit();
    },

    // Perfil de la persona (datos minimos del registro)
    async getProfile(uid) {
      const s = await getDoc(doc(db, 'users', uid));
      return s.exists() ? s.data() : null;
    },

    saveProfile(uid, perfil) {
      return setDoc(doc(db, 'users', uid), { ...perfil, actualizado: serverTimestamp() }, { merge: true });
    },

    // Invitaciones por link con rol
    // El token se puede generar antes (nuevoToken) para copiar el link en el mismo clic
    async createInvite(user, tripId, rol, token = nuevoToken()) {
      await setDoc(doc(invites, token), {
        tripId,
        rol,
        ownerId: user.uid,
        activo: true,
        creado: serverTimestamp(),
      });
      return token;
    },

    subscribeInvites(user, tripId, onData, onError) {
      const q = query(invites, where('ownerId', '==', user.uid), where('tripId', '==', tripId));
      return onSnapshot(q, (s) => onData(s.docs.map(conId).filter((i) => i.activo)), onError);
    },

    revokeInvite(token) {
      return updateDoc(doc(invites, token), { activo: false });
    },

    async getInvite(token) {
      const s = await getDoc(doc(invites, token));
      return s.exists() ? conId(s) : null;
    },

    // El token viaja en un registro privado (joins/{uid}) del mismo lote:
    // las reglas lo validan sin que quede visible para el resto del grupo.
    joinTrip(user, { tripId, token, rol }) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'trips', tripId, 'joins', user.uid), { token, rol, creado: serverTimestamp() });
      batch.update(doc(db, 'trips', tripId), {
        [`miembros.${user.uid}`]: rol,
        miembrosUids: arrayUnion(user.uid),
        [`miembrosInfo.${user.uid}`]: { nombre: user.displayName || 'Invitado', foto: user.photoURL || null },
      });
      return batch.commit();
    },

    // Comentarios de un item, del mas viejo al mas nuevo
    subscribeComentarios(tripId, itemId, onData, onError) {
      const q = query(collection(db, 'trips', tripId, 'items', itemId, 'comentarios'), orderBy('creado', 'asc'));
      return onSnapshot(q, (s) => onData(s.docs.map(conId)), onError);
    },

    addComentario(tripId, itemId, comentario) {
      return setDoc(doc(collection(db, 'trips', tripId, 'items', itemId, 'comentarios')), {
        ...comentario,
        creado: serverTimestamp(),
      });
    },

    deleteComentario(tripId, itemId, comentarioId) {
      return deleteDoc(doc(db, 'trips', tripId, 'items', itemId, 'comentarios', comentarioId));
    },

    // Actividad del grupo: las ultimas 40 acciones
    subscribeActividad(tripId, onData, onError) {
      const q = query(collection(db, 'trips', tripId, 'actividad'), orderBy('creado', 'desc'), limit(40));
      return onSnapshot(q, (s) => onData(s.docs.map(conId)), onError);
    },

    registrarActividad(tripId, evento) {
      return setDoc(doc(collection(db, 'trips', tripId, 'actividad')), { ...evento, creado: serverTimestamp() });
    },

    setMemberRole(tripId, uid, rol) {
      return updateDoc(doc(db, 'trips', tripId), { [`miembros.${uid}`]: rol });
    },

    removeMember(tripId, uid) {
      return updateDoc(doc(db, 'trips', tripId), {
        [`miembros.${uid}`]: deleteField(),
        [`miembrosInfo.${uid}`]: deleteField(),
        miembrosUids: arrayRemove(uid),
      });
    },
  };
}
