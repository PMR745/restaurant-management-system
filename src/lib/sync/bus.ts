import { uuid } from "@/lib/utils/id";

/**
 * Cross-tab message bus.
 *
 * BroadcastChannel where available, falling back to the `storage` event.
 * The two have identical semantics for our purpose — crucially, NEITHER
 * delivers to the tab that posted. That is not a limitation we work around:
 * `apply()` returns authoritative post-images synchronously, so the posting
 * tab never depends on the bus to see its own write.
 *
 * Same-origin only, so this will not bridge localhost and a phone on the LAN.
 * That is precisely why the Supabase adapter exists.
 */

export interface Bus<T> {
  post(payload: T): void;
  subscribe(handler: (payload: T) => void): () => void;
  close(): void;
}

export function makeBus<T>(name: string): Bus<T> {
  if (typeof window === "undefined") {
    return { post: () => {}, subscribe: () => () => {}, close: () => {} };
  }

  if (typeof BroadcastChannel !== "undefined") {
    const ch = new BroadcastChannel(name);
    return {
      post: (payload) => ch.postMessage(payload),
      subscribe: (handler) => {
        const listener = (e: MessageEvent) => handler(e.data as T);
        ch.addEventListener("message", listener);
        return () => ch.removeEventListener("message", listener);
      },
      close: () => ch.close(),
    };
  }

  // Fallback: write to a dedicated key and let other tabs pick up the
  // `storage` event. The nonce forces a value change even when the payload
  // is identical to the previous one.
  const key = `${name}:bus`;
  return {
    post: (payload) => {
      try {
        window.localStorage.setItem(
          key,
          JSON.stringify({ nonce: uuid(), payload }),
        );
      } catch {
        // Private mode / quota. The originating tab is still correct.
      }
    },
    subscribe: (handler) => {
      const listener = (e: StorageEvent) => {
        if (e.key !== key || !e.newValue) return;
        try {
          handler(JSON.parse(e.newValue).payload as T);
        } catch {
          /* ignore malformed */
        }
      };
      window.addEventListener("storage", listener);
      return () => window.removeEventListener("storage", listener);
    },
    close: () => {},
  };
}
