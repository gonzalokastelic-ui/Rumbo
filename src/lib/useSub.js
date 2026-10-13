import { useEffect, useState } from 'react';

// Se suscribe a una fuente en tiempo real del store.
// subscribe(onData, onError) debe devolver la funcion para desuscribirse.
export function useSub(subscribe, deps) {
  const [estado, setEstado] = useState({ data: undefined, error: null });

  useEffect(() => {
    if (!subscribe) return undefined;
    setEstado({ data: undefined, error: null });
    const off = subscribe(
      (data) => setEstado({ data, error: null }),
      (error) => setEstado({ data: undefined, error }),
    );
    return () => off && off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...estado, cargando: estado.data === undefined && !estado.error };
}
