import assert from 'node:assert/strict';
import {
  emptyProgress,
  normalizeProgress,
  mergeProgress,
  createProgressStore,
  ARRAY_FIELDS,
} from '../src/core/progress-store.mjs';
let count = 0;
const test = async (name, fn) => {
  await fn();
  count++;
  console.log(`PASS ${name}`);
};
const p = (patch) => ({ ...emptyProgress(), ...patch });
const storage = (initial) => {
  const values = new Map(initial ? [['nuarch-progress-v1', JSON.stringify(initial)]] : []);
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
};
const stored = (s) => JSON.parse(s.getItem('nuarch-progress-v1'));
const mutex = () => {
  let tail = Promise.resolve();
  return (operation) => {
    const task = tail.then(operation);
    tail = task.catch(() => {});
    return task;
  };
};
await test('all array fields preserve independent additions', () => {
  for (const field of ARRAY_FIELDS)
    assert.deepEqual(
      mergeProgress(p(), p({ [field]: ['mine'] }), p({ [field]: ['theirs'] }))[field],
      ['theirs', 'mine'],
    );
});
await test('local removal does not remove unrelated latest membership', () => {
  assert.deepEqual(
    mergeProgress(p({ checks: ['a'] }), p({ checks: [] }), p({ checks: ['a', 'b'] })).checks,
    ['b'],
  );
});
await test('unchanged local membership does not resurrect a remote removal', () => {
  assert.deepEqual(
    mergeProgress(p({ known: ['a'] }), p({ known: ['a'] }), p({ known: [] })).known,
    [],
  );
});
await test('last local removal wins over same membership in latest', () => {
  assert.deepEqual(mergeProgress(p({ read: ['a'] }), p({ read: [] }), p({ read: ['a'] })).read, []);
});
await test('local addition is retained and duplicate additions collapse', () => {
  assert.deepEqual(
    mergeProgress(p(), p({ bookmarks: ['a', 'a'] }), p({ bookmarks: ['a', 'b'] })).bookmarks,
    ['a', 'b'],
  );
});
await test('array reordering alone is not a user membership change', () => {
  assert.deepEqual(
    mergeProgress(p({ known: ['a', 'b'] }), p({ known: ['b', 'a'] }), p({ known: ['b', 'c'] }))
      .known,
    ['b', 'c'],
  );
});
await test('independent notes merge by key', () => {
  assert.deepEqual(
    mergeProgress(
      p({ notes: { a: 'old' } }),
      p({ notes: { a: 'mine' } }),
      p({ notes: { a: 'old', b: 'theirs' } }),
    ).notes,
    { a: 'mine', b: 'theirs' },
  );
});
await test('unchanged note preserves remote edit', () => {
  assert.equal(
    mergeProgress(
      p({ notes: { a: 'old' } }),
      p({ notes: { a: 'old' } }),
      p({ notes: { a: 'remote' } }),
    ).notes.a,
    'remote',
  );
});
await test('local note change wins same-key conflict', () => {
  assert.equal(
    mergeProgress(
      p({ notes: { a: 'old' } }),
      p({ notes: { a: 'local' } }),
      p({ notes: { a: 'remote' } }),
    ).notes.a,
    'local',
  );
});
await test('note deletion applies only to locally removed key', () => {
  assert.deepEqual(
    mergeProgress(p({ notes: { a: 'old' } }), p(), p({ notes: { a: 'remote', b: 'keep' } })).notes,
    { b: 'keep' },
  );
});
await test('empty note is a value, not deletion', () => {
  assert.deepEqual(mergeProgress(p({ notes: { a: 'old' } }), p({ notes: { a: '' } }), p()).notes, {
    a: '',
  });
});
await test('scores support independent writes and zero', () => {
  assert.deepEqual(
    mergeProgress(p({ scores: { a: 2 } }), p({ scores: { a: 0 } }), p({ scores: { a: 3, b: 1 } }))
      .scores,
    { a: 0, b: 1 },
  );
});
await test('prototype-shaped dictionary keys remain data', () => {
  const notes = JSON.parse('{"__proto__":"note","constructor":"text"}');
  const merged = mergeProgress(p(), p({ notes }), p());
  assert.equal(Object.getPrototypeOf(merged.notes), Object.prototype);
  assert.equal(Object.getOwnPropertyDescriptor(merged.notes, '__proto__').value, 'note');
  assert.equal({}.polluted, undefined);
});
await test('normalization copies values and rejects malformed schema', () => {
  assert.deepEqual(normalizeProgress({ known: ['x', 'x'] }), p({ known: ['x'] }));
  for (const bad of [
    null,
    [],
    { checks: 'x' },
    { notes: [] },
    { notes: { a: 5 } },
    { scores: { a: 4 } },
    { scores: { a: 1.5 } },
  ])
    assert.throws(() => normalizeProgress(bad), TypeError);
});
await test('merge never mutates its arguments', () => {
  const base = p({ notes: { a: 'old' } }),
    local = p({ notes: { a: 'new' }, checks: ['v'] }),
    latest = p({ read: ['r'] });
  const before = JSON.stringify([base, local, latest]);
  mergeProgress(base, local, latest);
  assert.equal(JSON.stringify([base, local, latest]), before);
});
await test('two stale tabs preserve independent sequential changes', () => {
  const s = storage(),
    a = createProgressStore({ storage: s }),
    b = createProgressStore({ storage: s });
  const pa = a.load(),
    pb = b.load();
  pa.notes.video = 'study';
  assert.equal(a.save(pa), true);
  pb.known.push('q1');
  assert.equal(b.save(pb), true);
  assert.deepEqual(stored(s), p({ notes: { video: 'study' }, known: ['q1'] }));
});
await test('adopting successful snapshot avoids deleting newly merged data', () => {
  const s = storage(),
    a = createProgressStore({ storage: s }),
    b = createProgressStore({ storage: s });
  let pa = a.load(),
    pb = b.load();
  pb.notes.remote = 'keep';
  b.save(pb);
  pa.checks.push('video1');
  a.save(pa);
  pa = a.snapshot();
  pa.checks.push('video2');
  a.save(pa);
  assert.deepEqual(stored(s).notes, { remote: 'keep' });
});
await test('failed write returns false and does not advance baseline', () => {
  const s = storage(p({ read: ['old'] })),
    warnings = [];
  const store = createProgressStore({ storage: s, onError: (e) => warnings.push(e.message) });
  const local = store.load();
  local.read.push('new');
  const write = s.setItem;
  s.setItem = () => {
    throw Error('quota');
  };
  assert.equal(store.save(local), false);
  assert.deepEqual(store.snapshot().read, ['old']);
  assert.equal(store.getLastError().message, 'quota');
  assert.deepEqual(warnings, ['quota']);
  s.setItem = write;
  assert.equal(store.save(local), true);
  assert.deepEqual(stored(s).read, ['old', 'new']);
});
await test('failed read never overwrites stored progress', () => {
  let writes = 0;
  const warnings = [];
  const store = createProgressStore({
    storage: {
      getItem: () => {
        throw Error('denied');
      },
      setItem: () => writes++,
    },
    onError: (e) => warnings.push(e.message),
  });
  assert.equal(store.save(p({ checks: ['x'] })), false);
  assert.equal(writes, 0);
  assert.deepEqual(warnings, ['denied']);
});
await test('corrupt latest JSON fails without clobbering it', () => {
  const s = storage();
  s.values.set('nuarch-progress-v1', '{bad');
  const store = createProgressStore({ storage: s });
  assert.equal(store.save(p({ known: ['x'] })), false);
  assert.equal(s.getItem('nuarch-progress-v1'), '{bad');
});
await test('successful-save notice is conditional, so failure notice survives', () => {
  const notices = [];
  const store = createProgressStore({
    storage: {
      getItem: () => null,
      setItem: () => {
        throw Error('full');
      },
    },
    onError: () => notices.push('Não foi possível salvar'),
  });
  if (store.save(p({ checks: ['x'] }))) notices.push('Salvo');
  assert.deepEqual(notices, ['Não foi possível salvar']);
});
await test('explicit import replaces instead of silently merging', () => {
  const s = storage(p({ known: ['old'], notes: { old: 'old' } })),
    store = createProgressStore({ storage: s });
  store.load();
  assert.equal(store.replace(p({ read: ['import'] })), true);
  assert.deepEqual(stored(s), p({ read: ['import'] }));
});
await test('failed import preserves previous baseline and data', () => {
  const s = storage(p({ read: ['old'] })),
    store = createProgressStore({ storage: s });
  store.load();
  s.setItem = () => {
    throw Error('full');
  };
  assert.equal(store.replace(p({ known: ['new'] })), false);
  assert.deepEqual(store.snapshot(), p({ read: ['old'] }));
});
await test('snapshots cannot mutate the stored baseline by reference', () => {
  const store = createProgressStore({ storage: storage(p({ notes: { a: 'old' } })) });
  store.load();
  const snap = store.snapshot();
  snap.notes.a = 'bad';
  snap.known.push('bad');
  assert.deepEqual(store.snapshot(), p({ notes: { a: 'old' } }));
});
await test('locked saves serialize cooperating tabs and preserve independent edits', async () => {
  const s = storage(),
    withLock = mutex(),
    a = createProgressStore({ storage: s, withLock }),
    b = createProgressStore({ storage: s, withLock });
  const pa = a.load(),
    pb = b.load();
  pa.notes.a = 'A';
  pb.notes.b = 'B';
  assert.deepEqual(await Promise.all([a.saveLocked(pa), b.saveLocked(pb)]), [true, true]);
  assert.deepEqual(stored(s).notes, { a: 'A', b: 'B' });
});
await test('queued same-tab saves keep their original local deltas', async () => {
  const s = storage(p({ notes: { old: 'x' } })),
    withLock = mutex(),
    a = createProgressStore({ storage: s, withLock }),
    b = createProgressStore({ storage: s, withLock });
  const pa = a.load(),
    pb = b.load();
  pb.notes.remote = 'R';
  pa.notes.old = 'first';
  const one = a.saveLocked(pa);
  const remote = b.saveLocked(pb);
  pa.notes.old = 'second';
  const two = a.saveLocked(pa);
  assert.deepEqual(await Promise.all([one, remote, two]), [true, true, true]);
  assert.deepEqual(stored(s).notes, { old: 'second', remote: 'R' });
});
await test('locked same-key conflict uses last persisted delta', async () => {
  const s = storage(p({ notes: { a: 'old' } })),
    withLock = mutex(),
    a = createProgressStore({ storage: s, withLock }),
    b = createProgressStore({ storage: s, withLock });
  const pa = a.load(),
    pb = b.load();
  pa.notes.a = 'first';
  pb.notes.a = 'last';
  await Promise.all([a.saveLocked(pa), b.saveLocked(pb)]);
  assert.equal(stored(s).notes.a, 'last');
});
await test('locked writes require a configured lock and surface lock failure', async () => {
  const s = storage(),
    warnings = [];
  const a = createProgressStore({ storage: s, onError: (e) => warnings.push(e.message) });
  assert.equal(await a.saveLocked(p()), false);
  assert.equal(s.getItem('nuarch-progress-v1'), null);
  const b = createProgressStore({
    storage: s,
    withLock: async () => {
      throw Error('lock unavailable');
    },
    onError: (e) => warnings.push(e.message),
  });
  assert.equal(await b.saveLocked(p()), false);
  assert.deepEqual(warnings, ['No cross-tab lock configured', 'lock unavailable']);
});
console.log(`\n${count} tests passed.`);
