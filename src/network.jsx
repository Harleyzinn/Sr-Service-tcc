import { useEffect, useState } from "react";
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
export function NetworkNotice() {
  const online = useOnline();
  return online ? null : (
    <div className="network-notice" role="alert">
      Você está sem conexão. Os rascunhos desta aba continuam disponíveis.
      Gravações no Firebase precisam de conexão e não são confirmadas offline.
    </div>
  );
}
