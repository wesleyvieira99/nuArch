"""Structural and publication checks. Run with: python3 scripts/validate.py."""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
load=lambda n:json.loads((root/'data'/f'{n}.json').read_text())
a,p,r,l,g=[load(n) for n in ('architectures','practice','research','logos','ledger')]
assert len(a['architectures'])>=60
assert len(p['questions'])>1000
assert len(p['mocks'])>100
for objects,key in [(a['architectures'],'id'),(p['questions'],'id'),(p['questions'],'question'),(p['mocks'],'id'),(p['mocks'],'title')]:
    vals=[x[key] for x in objects]
    assert len(vals)==len(set(vals)),f'Duplicate {key}'
sources={}
for s in r['sources']+a['sources']+p['sources']+g['sources']:
    assert s['id'] not in sources or sources[s['id']]['url']==s['url'],s['id']
    assert s.get('url') is None or s['url'].startswith('https://'),s
    sources[s['id']]=s

def refs(obj):
    if isinstance(obj,dict):
        for key,value in obj.items():
            if key=='sourceId':
                assert value in sources,f'Missing source: {value}'
            elif key=='sourceIds':
                for sid in value:assert sid in sources,f'Missing source: {sid}'
            else:refs(value)
    elif isinstance(obj,list):
        for item in obj:refs(item)
for obj in (a,p,r,g):refs(obj)
for arch in a['architectures']:
    assert arch['title'] and len(arch['steps'])>=2 and len(arch['internals'])>=5,arch['id']
    assert len(arch['code']['text'])>15 and arch['sourceIds'],arch['id']
    ids={n['id'] for n in arch['nodes']}
    assert len(ids)==len(arch['nodes'])>=3,arch['id']
    for n in arch['nodes']:
        assert 76<=n['x']<=724 and 28<=n['y']<=332,(arch['id'],n)
    for edge in arch['edges']:assert edge['from'] in ids and edge['to'] in ids,arch['id']
    for provider in ('aws','azure','onprem'):
        dep=arch['deployments'][provider]
        assert len(dep['components'])==len(arch['nodes']) and dep['notes'],(arch['id'],provider)
        for n,c in zip(arch['nodes'],dep['components']):assert n['label']==c['role'] and c['service'] and c['reason']
for q in p['questions']:
    assert len(q['answer'])>=2 and q['redFlags'] and q['followUp'] and q['scenario'],q['id']
for mock in p['mocks']:
    cursor=0
    for step in mock['timeline']:
        assert step['minute']==cursor and step['duration']>0,(mock['id'],step)
        cursor+=step['duration']
        assert step['prompt'] and step['expected'] and step['followUps'],mock['id']
    assert cursor==60,(mock['id'],cursor)
    assert mock['rubric'] and mock['requirements'] and mock['constraints'],mock['id']
assert [str(s['id']) for s in g['sections']]==['1','2','3','4','5']
for section in g['sections']:
    assert section['title'] and len(section['blocks'])>=4,section['id']
    for block in section['blocks']:
        assert block['type'] in ('prose','code','table','callout','list')
        if block['type']=='table':
            assert block['headers'] and block['rows']
            assert all(len(row)==len(block['headers']) for row in block['rows'])
assert len(g['codeFiles'])>=4
for file in g['codeFiles']:
    assert file['text']==(root/'examples'/'ledger'/file['name']).read_text(),file['name']
for asset in l['entries']:
    path=(root/asset['logo']).resolve()
    assert path.is_relative_to(root) and path.is_file(),asset
    assert asset['sourceUrl'].startswith('https://'),asset
    if path.suffix=='.svg':
        assert not re.search(r'<script|<foreignObject|\bonload\s*=',path.read_text(),re.I),path
for path in root.rglob('*'):
    if '.git' in path.parts or path.name=='validate.py' or not path.is_file():continue
    if path.suffix in ('.html','.js','.json','.md','.css'):
        text=path.read_text()
        assert not re.search(r'meet\.google\.com/[a-z-]+|[\w.+-]+@(?:gmail|hotmail|outlook)\.com|/Users/|/Downloads/',text),path
print(json.dumps({'architectures':len(a['architectures']),'questions':len(p['questions']),'mocks':len(p['mocks']),'cases':len(r['cases']),'unique_source_urls':len({s['url'] or s['id'] for s in sources.values()}),'official_assets':len(l['entries']),'ledger_sections':len(g['sections']),'ledger_code_files':len(g['codeFiles']),'status':'PASS'},ensure_ascii=False,indent=2))
