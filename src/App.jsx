import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { Cargando, ToastProvider } from './components/ui.jsx';

// Cada pantalla es su propio bundle: la landing (GSAP) y la app (Firebase) no se mezclan
const Landing = lazy(() => import('./pages/Landing.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const NuevoViaje = lazy(() => import('./pages/NuevoViaje.jsx'));
const Viaje = lazy(() => import('./pages/Viaje.jsx'));
const Unirse = lazy(() => import('./pages/Unirse.jsx'));
const Perfil = lazy(() => import('./pages/Perfil.jsx'));

function Privada({ children }) {
  const { listo, user, perfil, perfilListo } = useAuth();
  const location = useLocation();
  if (!listo || (user && !perfilListo)) {
    return (
      <div className="auth-wait">
        <Cargando texto="Preparando tu sesión" />
      </div>
    );
  }
  if (!user) return <Navigate to="/ingresar" replace state={{ from: location.pathname + location.search }} />;
  // La primera vez se piden los datos minimos del perfil
  if (!perfil && location.pathname !== '/perfil') {
    return <Navigate to="/perfil" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}

function NoEncontrada() {
  return (
    <div className="auth-wait">
      <div className="empty glass">
        <h1>No encontramos esa página</h1>
        <a className="btn btn--primary" href="/">
          Volver al inicio
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense
          fallback={
            <div className="auth-wait">
              <Cargando texto="Cargando" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/ingresar" element={<Login />} />
            <Route path="/viajes" element={<Privada><Dashboard /></Privada>} />
            <Route path="/viajes/nuevo" element={<Privada><NuevoViaje /></Privada>} />
            <Route path="/viaje/:id" element={<Privada><Viaje /></Privada>} />
            <Route path="/unirse/:token" element={<Privada><Unirse /></Privada>} />
            <Route path="/perfil" element={<Privada><Perfil /></Privada>} />
            <Route path="*" element={<NoEncontrada />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  );
}
