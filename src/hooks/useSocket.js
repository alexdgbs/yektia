import { useEffect, useRef } from "react";
import { SOCKET_URL } from "../services/apiConfig";
import {
  connectAuthenticatedSocket,
  connectPublicSocket,
} from "../services/socketClient";

// Un solo patrón de conexión para los 4 sitios que usaban sockets: conecta,
// suscribe los eventos y cierra al desmontar. Si la conexión falla no se
// registra nada: la app sigue funcionando con HTTP.
function useSocket(connect, handlers, deps) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  useEffect(() => {
    if (!SOCKET_URL) return undefined;
    let socket;
    let active = true;
    const attach = (connected) => {
      if (!active) {
        connected.disconnect();
        return;
      }
      socket = connected;
      for (const [event] of Object.entries(handlersRef.current)) {
        socket.on(event, (...args) => handlersRef.current[event]?.(...args));
      }
    };
    const connection = connect();
    if (connection && typeof connection.then === "function") {
      connection.then(attach).catch(() => {});
    } else {
      attach(connection);
    }
    return () => {
      active = false;
      socket?.disconnect();
    };
    // Los manejadores se leen siempre de la referencia: solo deps reconecta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function usePublicSocket(handlers, deps = []) {
  useSocket(connectPublicSocket, handlers, deps);
}

export function useAuthenticatedSocket(handlers, deps = []) {
  useSocket(connectAuthenticatedSocket, handlers, deps);
}
