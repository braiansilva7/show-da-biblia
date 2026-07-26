type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribeToSessionExpiration(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function emitSessionExpiration() {
  for (const listener of listeners) listener();
}
