import { useEffect } from "react";
export default function SyncBootstrap() {
  useEffect(() => {
    const f = () => location.reload();
    addEventListener("os-cloud-applied", f);
    return () => removeEventListener("os-cloud-applied", f);
  }, []);
  return null;
}
