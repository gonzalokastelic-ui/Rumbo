# Rumbo

Organizá un viaje desde cero. Elegís un destino y Rumbo arma el checklist completo según el país (documentos,
salud, vuelos, alojamiento, actividades), calcula las fechas límite hacia atrás desde tu salida, recomienda
vuelos (SlickTrip) y hoteles (Brek) y te deja compartir el viaje con un link de **editor** o **solo lectura**.

Rumbo **no vende** pasajes ni alojamiento: organiza y recomienda.

> TP 2 de Desarrollo Frontend II. React + Vite, Cloud Firestore, Firebase Authentication y Vercel.

## Qué hace

- **Landing scrollweb** con escenario fotográfico fijo, vidrio esmerilado (glassmorphism) y animaciones atadas al scroll (GSAP ScrollTrigger).
- **Checklist automático** para 8 destinos desde Argentina: Brasil, Chile, España, Estados Unidos, Italia, Uruguay, México y Aruba.
- **Estados por ítem** (pendiente, en trámite, listo), fecha límite, costo, responsable, notas y link.
- **Fechas límite** recalculadas si cambia la salida; avisos de ítems vencidos o urgentes.
- **Presupuesto** total, por persona y por categoría.
- **Recomendados**: calendario de precios de vuelos, aerolíneas directas, hoteles y actividades, con links a SlickTrip y Brek ya cargados con tus fechas.
- **Grupos y roles**: invitás por link, elegís editor o solo lectura, cambiás el rol o cerrás el link cuando quieras.
- **Tiempo real**: los cambios se ven al instante en todos los dispositivos (onSnapshot).
- **Tema claro y oscuro**, responsive (celular y computadora).

## Cómo correrlo

```bash
npm install
cp .env.example .env   # completá los valores de Firebase
npm run dev
```

Sin variables de Firebase la app arranca en **modo demo**: entrás con un botón y los datos viven solo en
memoria (se pierden al recargar). Sirve para recorrer la interfaz, pero no cumple la persistencia pedida.

## Configurar Firebase

1. Crear un proyecto en [Firebase Console](https://console.firebase.google.com/) (Hosting y Analytics no hacen falta).
2. Agregar una app web con el ícono `</>` y copiar el `firebaseConfig`.
3. **Authentication** > Método de acceso: habilitar **Google** y **Correo electrónico/contraseña**.
   En Configuración > Dominios autorizados, agregar el dominio de Vercel.
4. **Firestore Database**: crear base `(default)`, edición Standard, región `southamerica-east1` (São Paulo), modo producción.
5. En la pestaña **Reglas**, pegar el contenido de [`firestore.rules`](firestore.rules) y publicar.
   Vercel no publica las reglas: hay que hacerlo en Firebase cada vez que cambien.
6. Completar `.env` (una variable por línea, sin comas ni comillas):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

Reiniciá `npm run dev` después de cambiar `.env`.

### Dónde se conecta Firebase

| Archivo | Qué hace |
|---|---|
| `src/lib/firebase.js` | Lee `import.meta.env` e inicializa app, Auth y Firestore (carga diferida). |
| `src/context/AuthContext.jsx` | Login con Google y email, sesión con `onAuthStateChanged`. |
| `src/lib/store.firebase.js` | Todas las lecturas y escrituras: `onSnapshot`, `setDoc`, `updateDoc`, `deleteDoc`, `writeBatch`. |
| `src/lib/store.memory.js` | Misma API en memoria, solo para modo demo. |

### Modelo de datos

```
trips/{tripId}
  nombre, destinoId, origen, fechaIda, fechaVuelta, viajeros, plantilla
  ownerId, miembros { uid: 'owner' | 'editor' | 'viewer' }, miembrosUids [uid], miembrosInfo { uid: {nombre, foto} }
  resumen { total, listos, tramite }

trips/{tripId}/items/{itemId}
  titulo, categoria, estado ('pendiente' | 'tramite' | 'listo'), fechaLimite, diasAntes
  costo, notas, link, asignadoA, predeterminado, clave, desc, orden

invites/{token}
  tripId, rol ('editor' | 'viewer'), ownerId, activo
```

### Reglas de seguridad (resumen)

- Solo los miembros de un viaje lo leen. Solo el organizador lo modifica o lo elimina.
- Editores y organizador crean, modifican y eliminan ítems. Lectores solo leen.
- Un invitado se agrega a sí mismo, y solo con el rol del link activo que usó.
- Los links de invitación se pueden obtener con `get` pero no listar; solo el dueño los administra.

## Publicar en Vercel

1. Subir el repositorio a GitHub (`.env` y `node_modules` ya están en `.gitignore`).
2. En [Vercel](https://vercel.com/) importar el repositorio. Framework: **Vite**, build `npm run build`, salida `dist`.
3. En Settings > Environment Variables cargar las 4 variables `VITE_FIREBASE_*` en Production.
4. Deploy. Si cambiás variables después, hacé **Redeploy**.

`vercel.json` reescribe todas las rutas a `index.html` para que `/viaje/:id` y `/unirse/:token` funcionen al recargar.

## Datos de recomendaciones

Los vuelos y hoteles **no se piden a ninguna API en tiempo de ejecución**. Son una captura de referencia de
SlickTrip y Brek (13/10/2026) guardada en `src/data/snapshot.json`:

- Calendario de precios por día (49 días) y aerolíneas directas por destino.
- Hasta 6 hoteles por destino con foto, estrellas, puntaje y banda de precio.
- Brek no devolvió alojamientos publicados para Uruguay en esa consulta; la app lo informa y enlaza a Brek.

Cada tarjeta lleva al sitio de origen con tus fechas cargadas (`src/lib/recomendados.js`). Los precios exactos y
la disponibilidad siempre se ven allí.

## Estructura

```
src/
  data/       destinos, requisitos por destino y plantillas, snapshot de vuelos y hoteles
  lib/        fechas, links a SlickTrip, capa de datos (Firebase y memoria)
  context/    autenticación
  components/ nav, anillo de progreso, toasts, modal
  pages/      Landing, Login, Dashboard, NuevoViaje, Viaje (+ Checklist, Recomendados, Presupuesto, Grupo), Unirse
  styles/     tokens, base, componentes, app, landing
```

## Diseño

Glassmorphism sobre fotografía con un único acento rojo y tipografía Geist (sans-serif).
Una escala de radios (26 / 18 / 14 y botones en pastilla), vidrio con blur solo en superficies principales,
y fotos que se desenfocan después de la sección de destinos para que el texto y el vidrio se lean bien.
Respeta `prefers-reduced-motion` y `prefers-reduced-transparency`.

## Requisitos migratorios

La lista de requisitos de cada destino se armó con información pública y cambia con frecuencia (visas, ETIAS,
formularios). La app lo avisa en pantalla y cada ítem incluye, cuando existe, el link al sitio oficial.
Revisá siempre la fuente oficial antes de viajar.

## Créditos de fotos

Fotografías de Wikimedia Commons con licencias CC0 y CC BY-SA. Autores y licencias en `src/data/credits.json`
y en el pie de la landing.
