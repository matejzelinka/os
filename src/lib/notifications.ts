export type NotificationState =
  | NotificationPermission
  | "unsupported"
  | "insecure"
  | "service-worker-unavailable";

export function getNotificationState(): NotificationState {
  if (typeof window === "undefined") return "unsupported";
  if (!window.isSecureContext) return "insecure";
  if (!("Notification" in window)) return "unsupported";
  if (!("serviceWorker" in navigator)) return "service-worker-unavailable";
  return Notification.permission;
}

export async function ensureNotificationWorker() {
  if (!("serviceWorker" in navigator)) throw new Error("SERVICE_WORKER_UNAVAILABLE");
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  return registration;
}

export async function showOsNotification(args:{
  title:string;
  body:string;
  tag:string;
  url?:string;
}) {
  if (Notification.permission !== "granted") throw new Error("PERMISSION_NOT_GRANTED");
  const registration = await ensureNotificationWorker();
  await registration.showNotification(args.title, {
    body: args.body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: args.tag,
    data: { url: args.url || "/inbox" }
  });
}
