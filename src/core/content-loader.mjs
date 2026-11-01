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
];

export async function loadPortalData() {
  if (Array.isArray(window.__NUARCH_DATA__)) return window.__NUARCH_DATA__;
  return Promise.all(
    CONTENT_COLLECTIONS.map(async (name) => {
      const version = name === 'playbook' ? '?v=20261101-structure1' : '';
      const response = await fetch(`data/${name}.json${version}`);
      if (!response.ok) throw new Error(`Falha ao carregar ${name}`);
      return response.json();
    }),
  );
}
