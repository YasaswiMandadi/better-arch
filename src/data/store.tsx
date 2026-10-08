import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { SiteDB } from './types';
import { buildSeed } from './seed';
import { assembleDb, diffItems, signature, splitDb } from './remoteModel';
import { REMOTE_ENABLED, clearToken, fetchRemote, getToken, loginRequest, pushChanges, setToken } from './remote';

const DB_KEY = 'ba-site-db';
const DB_VERSION = 1;

function loadInitial(): SiteDB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.__v === DB_VERSION && parsed.data) return parsed.data as SiteDB;
    }
  } catch {
    /* fall through to seed */
  }
  return buildSeed();
}

function persist(data: SiteDB) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify({ __v: DB_VERSION, data }));
  } catch {
    /* quota / private mode: in-memory only for this tab */
  }
}

export type SyncStatus = 'off' | 'loading' | 'synced' | 'saving' | 'error' | 'readonly';

export interface RemoteInfo {
  /** The app was built to use the shared MongoDB database (VITE_REMOTE=1). */
  enabled: boolean;
  /** The API answered; false means we fell back to this browser's own copy. */
  available: boolean;
  /** A valid admin session is active (edits are saved to the database). */
  admin: boolean;
  status: SyncStatus;
  message: string;
}

export interface SiteDataContextValue {
  data: SiteDB;
  /** Mutates a draft (via structuredClone) and persists + broadcasts the result. */
  update: (fn: (draft: SiteDB) => void) => void;
  remote: RemoteInfo;
  /** Resolves to an error message, or null on success. */
  login: (password: string) => Promise<string | null>;
  logout: () => void;
}

const SiteDataContext = createContext<SiteDataContextValue | null>(null);

/**
 * Single source of truth for all site content — themes, sub-themes, episodes,
 * essays, collaborators. Both the public site and the /console admin forms
 * read and write through this same provider, so an edit made in the console
 * is reflected on the public pages immediately (and across tabs, via the
 * storage event).
 *
 * Storage: always cached in this browser's localStorage. When the app is
 * built with VITE_REMOTE=1 it additionally loads from — and, for a signed-in
 * admin, saves changes to — the MongoDB-backed API, so every visitor sees
 * the same content. Without that flag nothing below touches the network.
 */
export function SiteDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SiteDB>(() => loadInitial());
  const [ready, setReady] = useState(!REMOTE_ENABLED);
  const [remote, setRemote] = useState<RemoteInfo>({
    enabled: REMOTE_ENABLED, available: false, admin: false, status: REMOTE_ENABLED ? 'loading' : 'off', message: '',
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<SiteDB>(data);
  const base = useRef<Map<string, string> | null>(null); // what the database is known to hold
  const admin = useRef(false);
  const dirty = useRef(false);
  const pushing = useRef(false);
  const rerun = useRef(false);

  const patchRemote = useCallback((p: Partial<RemoteInfo>) => setRemote((r) => ({ ...r, ...p })), []);

  const flush = useCallback(async () => {
    if (pushing.current) { rerun.current = true; return; }
    if (!admin.current || !base.current) return;
    pushing.current = true;
    try {
      do {
        rerun.current = false;
        const snap = latest.current;
        const { upserts, deletes, sigs } = diffItems(base.current!, splitDb(snap));
        if (!upserts.length && !deletes.length) {
          if (latest.current === snap) { dirty.current = false; patchRemote({ status: 'synced', message: '' }); }
          continue;
        }
        patchRemote({ status: 'saving', message: '' });
        const r = await pushChanges(getToken(), upserts, deletes);
        if (r === 'ok') {
          base.current = sigs;
          if (latest.current !== snap) rerun.current = true;
          else { dirty.current = false; patchRemote({ status: 'synced', message: '' }); }
        } else if (r === 'unauthorized') {
          // Keep the unsaved edits; they are pushed after the admin signs in again.
          admin.current = false;
          patchRemote({ admin: false, status: 'readonly', message: 'Your session expired — sign in again to save.' });
          return;
        } else {
          patchRemote({ status: 'error', message: 'Could not save to the database — retrying…' });
          if (pushTimer.current) clearTimeout(pushTimer.current);
          pushTimer.current = setTimeout(() => { void flush(); }, 5000);
          return;
        }
      } while (rerun.current);
    } finally {
      pushing.current = false;
    }
  }, [patchRemote]);

  const update = useCallback((fn: (draft: SiteDB) => void) => {
    setData((cur) => {
      const next = structuredClone(cur);
      fn(next);
      latest.current = next;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(next), 200);
      if (admin.current && base.current) {
        dirty.current = true;
        if (pushTimer.current) clearTimeout(pushTimer.current);
        pushTimer.current = setTimeout(() => { void flush(); }, 700);
      }
      return next;
    });
  }, [flush]);

  /** Pulls the database. Returns false when the API is unavailable. */
  const loadRemote = useCallback(async (): Promise<boolean> => {
    const token = getToken();
    const res = await fetchRemote(token);
    if (!res) {
      admin.current = false; base.current = null;
      patchRemote({ available: false, admin: false, status: 'error', message: 'Database unreachable — showing this browser’s own copy.' });
      return false;
    }
    if (token && !res.admin) clearToken();
    admin.current = res.admin;
    const db = assembleDb(res.items) as SiteDB | null;
    if (db) {
      latest.current = db;
      setData(db);
      persist(db);
      base.current = res.admin ? new Map(res.items.map((i) => [i._id, signature(i)])) : null;
      dirty.current = false;
      patchRemote({ available: true, admin: res.admin, status: res.admin ? 'synced' : 'readonly', message: '' });
    } else if (res.admin) {
      // Brand-new, empty database: store what this browser currently holds.
      base.current = new Map();
      dirty.current = true;
      patchRemote({ available: true, admin: true, status: 'saving', message: 'Database was empty — uploading the current content.' });
      void flush();
    } else {
      base.current = null;
      patchRemote({ available: true, admin: false, status: 'readonly', message: '' });
    }
    return true;
  }, [flush, patchRemote]);

  useEffect(() => {
    if (!REMOTE_ENABLED) return;
    void loadRemote().finally(() => setReady(true));
  }, [loadRemote]);

  // Visitors pick up newly published content without reloading.
  useEffect(() => {
    if (!REMOTE_ENABLED) return;
    async function refresh() {
      if (document.visibilityState !== 'visible' || admin.current) return;
      const res = await fetchRemote(null);
      const db = res && !res.admin ? (assembleDb(res.items) as SiteDB | null) : null;
      if (db && JSON.stringify(db) !== JSON.stringify(latest.current)) {
        latest.current = db;
        setData(db);
        persist(db);
      }
    }
    const id = setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(id); window.removeEventListener('focus', refresh); };
  }, []);

  // Don't let an admin close the tab with edits that haven't reached the database.
  useEffect(() => {
    if (!REMOTE_ENABLED) return;
    function warn(ev: BeforeUnloadEvent) {
      if (dirty.current || pushing.current) { ev.preventDefault(); ev.returnValue = ''; }
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const login = useCallback(async (password: string): Promise<string | null> => {
    const r = await loginRequest(password);
    if (!r.ok) return r.error;
    setToken(r.token);
    if (dirty.current && base.current) {
      // Session expired mid-edit: keep the local edits and push them now.
      admin.current = true;
      patchRemote({ admin: true, status: 'saving', message: '' });
      void flush();
      return null;
    }
    const ok = await loadRemote();
    return ok ? null : 'Signed in, but the database could not be reached.';
  }, [flush, loadRemote, patchRemote]);

  const logout = useCallback(() => {
    clearToken();
    admin.current = false;
    base.current = null;
    dirty.current = false;
    void loadRemote();
  }, [loadRemote]);

  // Cross-tab sync: another tab's console edit updates this tab's public view.
  useEffect(() => {
    function onStorage(ev: StorageEvent) {
      if (ev.key !== DB_KEY || !ev.newValue) return;
      try {
        const parsed = JSON.parse(ev.newValue);
        if (parsed?.__v === DB_VERSION && parsed.data) { latest.current = parsed.data; setData(parsed.data); }
      } catch {
        /* ignore malformed cross-tab payloads */
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!ready) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui, sans-serif', color: '#777' }}>Loading…</div>;
  }

  return <SiteDataContext.Provider value={{ data, update, remote, login, logout }}>{children}</SiteDataContext.Provider>;
}

export function useSiteData(): SiteDataContextValue {
  const ctx = useContext(SiteDataContext);
  if (!ctx) throw new Error('useSiteData must be used within a SiteDataProvider');
  return ctx;
}
