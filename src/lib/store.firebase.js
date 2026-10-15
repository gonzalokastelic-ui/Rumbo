// Capa de datos sobre Cloud Firestore. Es la unica parte de la app que habla con
// Firebase: todas las lecturas (onSnapshot / getDoc) y escrituras (setDoc,
// updateDoc, deleteDoc, writeBatch) pasan por aca.
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
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
      const [items, eventos] = await Promise.all([
        getDocs(collection(db, 'trips', tripId, 'items')),
        getDocs(collection(db, 'trips', tripId, 'itinerario')),
      ]);
      const batch = writeBatch(db);
      items.forEach((d) => batch.delete(d.ref));
      eventos.forEach((d) => batch.delete(d.ref));
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
    async createInvite(user, tripId, rol) {
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
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

    joinTrip(user, { tripId, token, rol }) {
      return updateDoc(doc(db, 'trips', tripId), {
        [`miembros.${user.uid}`]: rol,
        miembrosUids: arrayUnion(user.uid),
        [`miembrosInfo.${user.uid}`]: { nombre: user.displayName || 'Invitado', foto: user.photoURL || null },
        joinToken: token,
      });
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
