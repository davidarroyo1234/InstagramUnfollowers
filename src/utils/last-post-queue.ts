import { LastPostInfo } from "../model/last-post";
import { LAST_POST_CACHE_STORAGE_KEY, LAST_POST_MAX_DELAY, LAST_POST_MIN_DELAY } from "../constants/constants";
import { fetchLastPostInfo, sleep } from "./utils";

/**
 * Serial, throttled, cached fetcher — the block-safety core. One request at a
 * time with a randomized gap, cached by user id, gated to idle time. Each
 * iteration is isolated (GS26): a poison item never kills the queue.
 */
type Cache = Record<string, LastPostInfo>;

const load = (): Cache => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LAST_POST_CACHE_STORAGE_KEY) ?? "{}");
    return typeof parsed === "object" && parsed !== null ? (parsed as Cache) : {};
  } catch {
    return {};
  }
};

const cache: Cache = load();
const inFlight = new Set<string>();
const queue: { id: string; username: string; cb: (info: LastPostInfo) => void }[] = [];
let processing = false;
let gate: () => boolean = () => true;

export const setLastPostGate = (fn: () => boolean): void => { gate = fn; };
export const getCachedLastPostInfos = (): Cache => ({ ...cache });

async function run(): Promise<void> {
  if (processing) return;
  processing = true;
  while (queue.length > 0) {
    while (!gate()) await sleep(1000);
    const { id, username, cb } = queue.shift()!;
    try {
      const info = await fetchLastPostInfo(username);
      if (info.status === "loaded") {
        cache[id] = info;
        try { localStorage.setItem(LAST_POST_CACHE_STORAGE_KEY, JSON.stringify(cache)); } catch (e) { console.error("lastpost.persist", e); }
      }
      cb(info);
    } catch (e) {
      console.error("lastpost.queue", username, e);
      cb({ status: "error", ageText: null, shortcode: null });
    } finally {
      inFlight.delete(id);
    }
    if (queue.length > 0) await sleep(Math.floor(Math.random() * (LAST_POST_MAX_DELAY - LAST_POST_MIN_DELAY)) + LAST_POST_MIN_DELAY);
  }
  processing = false;
}

/** Serve from cache, dedup in-flight, else enqueue. Emits `loading` first. */
export function enqueueLastPost(id: string, username: string, cb: (info: LastPostInfo) => void): void {
  if (cache[id]?.status === "loaded") { cb(cache[id]); return; }
  if (inFlight.has(id)) return;
  inFlight.add(id);
  cb({ status: "loading", ageText: null, shortcode: null });
  queue.push({ id, username, cb });
  void run();
}
