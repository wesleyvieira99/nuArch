import test from 'node:test';
import assert from 'node:assert/strict';
import { filterFieldnotes } from '../src/features/fieldnotes/fieldnotes.mjs';

test('study lookup combines accent-insensitive terms with a category without changing source data', () => {
  const concepts = [
    {
      id: 'idempotency',
      category: 'reliability',
      title: 'Idempotência',
      mechanism: ['Chave única persistida no PostgreSQL'],
    },
    {
      id: 'unique-index',
      category: 'data',
      title: 'Índice único PostgreSQL',
      mechanism: ['Conflito de chave'],
    },
    {
      id: 'retry',
      category: 'reliability',
      title: 'Retentativa com jitter',
      mechanism: ['Preserva a chave de idempotência'],
    },
  ];
  const original = structuredClone(concepts);
  assert.deepEqual(
    filterFieldnotes(concepts, { query: '  IDEMPOTENCIA postgres  ', category: 'reliability' }).map(
      (item) => item.id,
    ),
    ['idempotency'],
  );
  assert.deepEqual(
    filterFieldnotes(concepts, { query: 'chave', category: 'data' }).map((item) => item.id),
    ['unique-index'],
  );
  assert.equal(filterFieldnotes(concepts, { query: 'not-present' }).length, 0);
  assert.deepEqual(filterFieldnotes(concepts), concepts);
  assert.deepEqual(concepts, original);
});

test('one photo may belong to multiple themes and still appears once per result', () => {
  const photos = [
    { id: 'IMG_9933', title: 'Cache e consistência', categoryIds: ['cache', 'data'] },
    { id: 'IMG_9934', title: 'Filas', categoryIds: ['events'] },
  ];
  for (const category of ['cache', 'data']) {
    assert.deepEqual(
      filterFieldnotes(photos, { category, query: 'consistencia' }).map((item) => item.id),
      ['IMG_9933'],
    );
  }
  assert.equal(filterFieldnotes(photos, { category: 'events', query: 'cache' }).length, 0);
});

test('portable image bytes and Drive URLs do not become false-positive search results', () => {
  const photos = [
    {
      id: 'photo',
      title: 'Filas',
      categoryIds: ['events'],
      path: 'data:image/webp;base64,quorum',
      thumb: 'data:image/webp;base64,quorum',
      driveUrl: 'https://drive.google.com/quorum',
    },
  ];
  assert.equal(filterFieldnotes(photos, { query: 'quorum' }).length, 0);
  assert.equal(filterFieldnotes(photos, { query: 'filas' }).length, 1);
});
