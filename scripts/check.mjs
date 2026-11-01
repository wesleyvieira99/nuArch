/** Reproducible local checks for source, behavior, content and portable output. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const python = process.env.NUARCH_PYTHON || 'python3';

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed with status ${result.status}`);
}

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

const sources = files(join(root, 'src')).filter((path) => /\.(?:js|mjs)$/.test(path));
for (const source of sources) run(process.execPath, ['--check', source]);
const tests = files(join(root, 'tests')).filter((path) => path.endsWith('.test.mjs'));
run(process.execPath, ['--test', ...tests]);
run(python, ['scripts/validate.py']);

const temporary = mkdtempSync(join(tmpdir(), 'nuarch-check-'));
try {
  const output = join(temporary, 'nuArch.html');
  run(python, ['scripts/export.py', output]);
  const html = readFileSync(output, 'utf8');
  const module = /<script type="module">([\s\S]*?)<\/script>/.exec(html)?.[1];
  assert.ok(module, 'Portable module is present');
  assert.ok(!/^\s*import\s/m.test(module), 'Portable artifact has no unresolved imports');
  assert.ok(!/assets\/brand\/[^"\s]+/.test(html), 'Brand assets are embedded');
  assert.ok(!/<link\s+rel="stylesheet"/.test(html), 'Stylesheets are embedded');
  assert.ok(!/<script[^>]+src="src\//.test(html), 'Entry point is embedded');
  assert.ok(html.includes('window.__NUARCH_DATA__='), 'Content payload is embedded');
  const javascript = join(temporary, 'portable.mjs');
  writeFileSync(javascript, module);
  run(process.execPath, ['--check', javascript]);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
console.log(
  `Validated ${sources.length} source modules, ${tests.length} test suites, content and portable export.`,
);
