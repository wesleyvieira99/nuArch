/** Canonical content order shared by the browser and the portable export. */
export const CONTENT_COLLECTIONS = [
  'architectures',
  'practice',
  'research',
  'logos',
  'ledger',
  'foundations',
  'videos',
  'course-linux',
  'guided',
  'mindmap',
  'playbook',
  'fieldnotes',
];

export async function loadPortalData() {
  if (Array.isArray(window.__NUARCH_DATA__)) return window.__NUARCH_DATA__;
  return Promise.all(
    CONTENT_COLLECTIONS.map(async (name) => {
      const version = ['playbook', 'fieldnotes'].includes(name) ? '?v=20261105-fieldnotes1' : '';
      const response = await fetch(`data/${name}.json${version}`);
      if (!response.ok) throw new Error(`Falha ao carregar ${name}`);
      return response.json();
    }),
  );
}
