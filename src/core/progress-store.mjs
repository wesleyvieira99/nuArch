/**
 * Progress schema v1 and three-way merge. No DOM/browser globals.
 *
 * Arrays represent membership (ordering is not a user change). Only the delta
 * baseline -> local is applied to latest. Notes/scores merge by own property.
 * Concurrent edits of the same membership/key: the last persisted local delta
 * wins. Unchanged local fields never overwrite a change from another tab.
 *
 * save() is synchronous and returns boolean. It fixes stale-tab overwrites for
 * sequential saves, but localStorage getItem/merge/setItem is NOT a transaction.
 * For overlapping tabs, every writer must use saveLocked()/replaceLocked() with
 * the same injected Web Lock. Mixing locked and unlocked writers loses that
 * guarantee. A lock does not coordinate other origins or copied portable files.
 */
export const ARRAY_FIELDS = Object.freeze(['known', 'bookmarks', 'read', 'checks']);
export const DICT_FIELDS = Object.freeze(['notes', 'scores']);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function emptyProgress() {
  return { known: [], bookmarks: [], read: [], checks: [], notes: {}, scores: {} };
}

/** Complete missing v1 fields, validate present fields and copy all containers. */
export function normalizeProgress(input) {
  if (!record(input)) throw new TypeError('Progress must be an object');
  const out = emptyProgress();
  for (const field of ARRAY_FIELDS) {
    const value = own(input, field) ? input[field] : [];
    if (!Array.isArray(value) || !value.every((x) => typeof x === 'string')) {
      throw new TypeError(`Invalid progress.${field}`);
    }
    out[field] = [...new Set(value)];
  }
  for (const field of DICT_FIELDS) {
    const value = own(input, field) ? input[field] : {};
    if (!record(value)) throw new TypeError(`Invalid progress.${field}`);
    const entries = Object.entries(value);
    const valid =
      field === 'notes'
        ? entries.every(([, v]) => typeof v === 'string')
        : entries.every(([, v]) => Number.isInteger(v) && v >= 0 && v <= 3);
    if (!valid) throw new TypeError(`Invalid progress.${field} value`);
    // fromEntries defines own data properties, including "__proto__" safely.
    out[field] = Object.fromEntries(entries);
  }
  return out;
}

export function mergeProgress(baseline, local, latest) {
  const base = normalizeProgress(baseline);
  const mine = normalizeProgress(local);
  const theirs = normalizeProgress(latest);
  const merged = emptyProgress();
  for (const field of ARRAY_FIELDS) {
    const previous = new Set(base[field]);
    const current = new Set(mine[field]);
    const removed = new Set(base[field].filter((id) => !current.has(id)));
    const added = mine[field].filter((id) => !previous.has(id));
    merged[field] = [...new Set([...theirs[field].filter((id) => !removed.has(id)), ...added])];
  }
  for (const field of DICT_FIELDS) {
    const values = new Map(Object.entries(theirs[field]));
    const keys = new Set([...Object.keys(base[field]), ...Object.keys(mine[field])]);
    for (const key of keys) {
      const before = own(base[field], key),
        after = own(mine[field], key);
      const changed = before !== after || (after && !Object.is(base[field][key], mine[field][key]));
      if (!changed) continue;
      if (after) values.set(key, mine[field][key]);
      else values.delete(key);
    }
    merged[field] = Object.fromEntries(values);
  }
  return merged;
}

/**
 * Dependency-injected persistence boundary. storage must expose getItem/setItem.
 * withLock is optional: callback => navigator.locks.request(lockName, callback).
 * onError is for an error notice only; callers show success only on true.
 * Failed reads, invalid stored JSON, and failed writes preserve the baseline.
 */
export function createProgressStore({
  storage,
  key = 'nuarch-progress-v1',
  initial = emptyProgress(),
  onError = () => {},
  withLock,
} = {}) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('Inject a storage adapter with getItem/setItem');
  }
  let baseline = normalizeProgress(initial);
  let lastError = null;
  const fail = (error) => {
    lastError = error;
    try {
      onError(error);
    } catch {
      /* A broken notice must not change success. */
    }
    return false;
  };
  const readLatest = () => {
    const raw = storage.getItem(key);
    return raw === null ? emptyProgress() : normalizeProgress(JSON.parse(raw));
  };
  const persist = (value) => {
    const next = normalizeProgress(value);
    storage.setItem(key, JSON.stringify(next));
    // Only a successful write advances the baseline.
    baseline = next;
    lastError = null;
    return true;
  };
  const capture = (local) => ({
    base: normalizeProgress(baseline),
    local: normalizeProgress(local),
  });
  const commit = (captured) => persist(mergeProgress(captured.base, captured.local, readLatest()));
  const locked = async (operation) => {
    if (typeof withLock !== 'function') return fail(new Error('No cross-tab lock configured'));
    try {
      return await withLock(operation);
    } catch (error) {
      return fail(error);
    }
  };
  return {
    /** Initial load. On failure, returns the previous safe baseline and warns. */
    load() {
      try {
        baseline = readLatest();
        lastError = null;
      } catch (error) {
        fail(error);
      }
      return normalizeProgress(baseline);
    },
    snapshot() {
      return normalizeProgress(baseline);
    },
    getLastError() {
      return lastError;
    },
    save(local) {
      try {
        return commit(capture(local));
      } catch (error) {
        return fail(error);
      }
    },
    async saveLocked(local) {
      let captured;
      try {
        captured = capture(local);
      } catch (error) {
        return fail(error);
      }
      // Capture the local delta before waiting: another queued save can advance
      // this store's baseline, but must not change the intent of this request.
      return locked(() => commit(captured));
    },
    /** Explicit import/restore: replace, not merge. Must be an intentional action. */
    replace(imported) {
      try {
        return persist(imported);
      } catch (error) {
        return fail(error);
      }
    },
    async replaceLocked(imported) {
      let replacement;
      try {
        replacement = normalizeProgress(imported);
      } catch (error) {
        return fail(error);
      }
      return locked(() => persist(replacement));
    },
  };
}
