import { create } from 'zustand';
import { api } from '../services/api';
import { useAuthStore } from './auth.store';

/**
 * The few user preferences that change how the app behaves outside Settings.
 *
 * Settings used to be the only place that knew about `autoSave`: it wrote the
 * value to the server and nothing else ever read it, so switching Auto Save
 * off changed nothing, and (because it needed the separate "Save Settings"
 * button) often was not even stored. The Editor and AI Studio read it from
 * here instead.
 */
interface PreferencesState {
  /** Defaults to true, matching the database default, until the server answers. */
  autoSave: boolean;
  /** User id the values above were loaded for (null = not loaded yet). */
  loadedFor: string | null;
  /** Loads the preferences once per signed-in user. Never rejects. */
  ensureLoaded: () => Promise<void>;
  /** Saves the Auto Save choice right away; rolls back and rethrows on failure. */
  setAutoSave: (value: boolean) => Promise<void>;
  /** Used by Settings after it has fetched / saved the full set. */
  applyServerValues: (values: { autoSave?: boolean }) => void;
}

let inflight: Promise<void> | null = null;

const currentUserId = () => useAuthStore.getState().user?.id ?? null;

export const usePreferencesStore = create<PreferencesState>()((set, get) => ({
  autoSave: true,
  loadedFor: null,

  ensureLoaded: () => {
    const uid = currentUserId();
    if (get().loadedFor !== null && get().loadedFor === uid) return Promise.resolve();
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        const res = await api.get<{ data: { preferences: { autoSave?: boolean } } }>(
          '/user/preferences',
        );
        set({ autoSave: res.data.data.preferences.autoSave ?? true, loadedFor: uid });
      } catch {
        // Offline / signed out: keep the default (auto-save on) and try again
        // next time rather than caching a guess as if it were the answer.
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },

  setAutoSave: async (value) => {
    const previous = get().autoSave;
    set({ autoSave: value });
    try {
      await api.put('/user/preferences', { autoSave: value });
      set({ loadedFor: currentUserId() });
    } catch (err) {
      set({ autoSave: previous });
      throw err;
    }
  },

  applyServerValues: (values) => {
    set({
      ...(values.autoSave !== undefined ? { autoSave: values.autoSave } : {}),
      loadedFor: currentUserId(),
    });
  },
}));

// A different person signing in on the same browser must not inherit the last
// person's setting.
useAuthStore.subscribe(
  (s) => s.user?.id ?? null,
  (uid) => {
    if (uid !== usePreferencesStore.getState().loadedFor) {
      usePreferencesStore.setState({ autoSave: true, loadedFor: null });
    }
  },
);
