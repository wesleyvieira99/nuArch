"""Build a portable HTML from local ESM, content and assets; no external bundler."""

import ast
import base64
import json
import mimetypes
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT = re.compile(r'^\s*import\s+\{[^}]+\}\s+from\s+[\'"]([^\'"]+)[\'"];\s*', re.MULTILINE)
# Read the literal collection list from the browser loader to keep one order.
loader_source = (ROOT / 'src/core/content-loader.mjs').read_text()
collection_match = re.search(r'export const CONTENT_COLLECTIONS = (\[[\s\S]*?\]);', loader_source)
if not collection_match:
    raise ValueError('Expected a literal CONTENT_COLLECTIONS array in the content loader')
COLLECTIONS = ast.literal_eval(collection_match.group(1))


def data_uri(path):
    mime = mimetypes.guess_type(path)[0] or 'application/octet-stream'
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode()


def bundle_modules(entry):
    """Inline the project's named local imports in dependency order, once each.

    This deliberately supports only the small ESM subset used in this portal.
    A future library, default import or re-export must fail rather than silently
    produce a broken portable artifact.
    """
    emitted, visiting, chunks = set(), set(), []

    def visit(path):
        path = path.resolve()
        if path in emitted:
            return
        if path in visiting:
            raise ValueError(f'Circular module dependency: {path.relative_to(ROOT)}')
        if not path.is_relative_to(ROOT / 'src'):
            raise ValueError(f'Module outside src/: {path}')
        visiting.add(path)
        source = path.read_text()
        for match in IMPORT.finditer(source):
            reference = match.group(1).split('?')[0]
            if not reference.startswith('.'):
                raise ValueError(f'External module cannot be embedded: {reference}')
            visit(path.parent / reference)
        source = IMPORT.sub('', source)
        source = re.sub(r'\bexport\s+(?=(?:async\s+)?function\b|const\b)', '', source)
        if re.search(r'^\s*(?:import|export)\b', source, re.MULTILINE):
            raise ValueError(f'Unsupported ESM statement: {path.relative_to(ROOT)}')
        chunks.append(f'// Source: {path.relative_to(ROOT)}\n{source}')
        emitted.add(path)
        visiting.remove(path)

    visit(entry)
    return '\n\n'.join(chunks)


def export(destination):
    data = [json.loads((ROOT / 'data' / f'{name}.json').read_text()) for name in COLLECTIONS]
    for entry in data[3]['entries']:
        entry['logo'] = data_uri(ROOT / entry['logo'])
    for material in data[9]['materials']:
        for field in ('path', 'thumb'):
            material[field] = data_uri(ROOT / material[field])

    javascript = bundle_modules(ROOT / 'src/app.js')
    html = (ROOT / 'index.html').read_text()
    for name in ('base', 'mindmap', 'playbook', 'studio'):
        css_path = f'styles/{name}.css'
        css = re.sub(r'^@import[^;]+;\s*', '', (ROOT / css_path).read_text(), flags=re.MULTILINE)
        pattern = (
            r'<link\s+rel="stylesheet"\s+href="' + re.escape(css_path) + r'(?:\?[^"\s]*)?"\s*/?>'
        )
        html, count = re.subn(pattern, lambda _: '<style>' + css + '</style>', html)
        if count != 1:
            raise ValueError(f'Expected one stylesheet: {css_path}')

    for asset in (
        'assets/favicon.svg',
        'assets/brand/nubank.svg',
        'assets/brand/nuarch-symbol.svg',
    ):
        embedded = data_uri(ROOT / asset)
        pattern = re.escape(asset) + r'(?:\?[^"\s]*)?'
        html = re.sub(pattern, lambda _: embedded, html)
        javascript = javascript.replace(asset, embedded)

    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    script = '<script>window.__NUARCH_DATA__=' + payload + ';</script><script type="module">'
    script += javascript.replace('</script', '<\\/script') + '</script>'
    html, count = re.subn(
        r'<script\s+type="module"\s+src="src/app\.js(?:\?[^"\s]*)?"\s*>\s*</script>',
        lambda _: script,
        html,
    )
    if count != 1:
        raise ValueError('Expected the src/app.js entry point in index.html')
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(html)
    print(f'Portable HTML written: {destination.name} ({destination.stat().st_size:,} bytes)')


if __name__ == '__main__':
    export(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'dist/nuArch.html')
