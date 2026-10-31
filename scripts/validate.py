"""Structural and publication checks. Run with: python3 scripts/validate.py."""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
load=lambda n:json.loads((root/'data'/f'{n}.json').read_text())
a,p,r,l,g,f,v,course,guided,mindmap,playbook=[load(n) for n in ('architectures','practice','research','logos','ledger','foundations','videos','course-linux','guided','mindmap','playbook')]
assert len(a['architectures'])>=60
assert len(p['questions'])>1000
assert len(p['mocks'])>100
for objects,key in [(a['architectures'],'id'),(p['questions'],'id'),(p['questions'],'question'),(p['mocks'],'id'),(p['mocks'],'title')]:
    vals=[x[key] for x in objects]
    assert len(vals)==len(set(vals)),f'Duplicate {key}'
sources={}
for s in r['sources']+a['sources']+p['sources']+g['sources']+f['sources']+v['sources']+course['sources']+guided['sources']+mindmap['sources']+playbook['sources']:
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
for obj in (a,p,r,g,f,v,course,guided,mindmap,playbook):refs(obj)
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

    o=arch['operations']
    assert len(o['bottlenecks'])>=2 and len(o['resilience'])>=2,arch['id']
    for b in o['bottlenecks']:
        assert all(isinstance(b[k],str) and len(b[k])>=(3 if k=='where' else 15) for k in ('where','signal','cause','mitigation','tradeoff')),(arch['id'],b)
    assert o['scaling']['trigger'] and len(o['scaling']['sequence'])>=3 and o['scaling']['limit'],arch['id']
    for b in o['resilience']:
        assert all(isinstance(b[k],str) and len(b[k])>=(3 if k=='failure' else 15) for k in ('failure','detection','failover','recovery','userImpact','dataRisk')),(arch['id'],b)
    assert all(isinstance(o['serviceLevel'][k],str) and len(o['serviceLevel'][k])>=15 for k in ('userJourney','sli','slo','timeoutPolicy','recoveryObjectives','validation')),arch['id']
    assert o['staffQuestion']['question'] and o['staffQuestion']['answer'] and o['sourceIds'],arch['id']
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

assert [c['id'] for c in f['chapters']]==['cap','replication','databases','caches','balancing','queues']
for chapter in f['chapters']:
    assert len(chapter['sections'])>=5 and len(chapter['questions'])>=4 and chapter['sourceIds'],chapter['id']
    for section in chapter['sections']:
        assert section['title'] and section['blocks'],chapter['id']
        for block in section['blocks']:
            assert block['type'] in ('prose','code','table','callout','list'),block
            if block['type']=='table':
                assert block['headers'] and block['rows']
                assert all(len(row)==len(block['headers']) for row in block['rows'])
assert len(v['videos'])==50
assert len({x['id'] for x in v['videos']})==50
assert len({x['guide'] for x in v['videos']})==50
for video in v['videos']:
    assert re.fullmatch(r'[A-Za-z0-9_-]{11}',video['id'])
    assert video['url']=='https://www.youtube.com/watch?v='+video['id']
    assert video['thumbnail']=='https://i.ytimg.com/vi/'+video['id']+'/hqdefault.jpg'
    assert video['seconds']>600 and video['channelUrl'].startswith('https://www.youtube.com/')
    assert video['kind'] in ('Entrevista simulada','Walkthrough')
    assert len(video['guide'])>120 and len(video['focus'])>=2 and len(video['challenge'])>40,video['id']
    assert video['category']==video['topic']
    assert len(video['relatedArchitectures'])>=2
    assert all(x in {arch['id'] for arch in a['architectures']} for x in video['relatedArchitectures'])
    assert 'revisão editorial' not in video['guide']

assert len(course['lessons'])==29
assert [l['number'] for l in course['lessons']]==list(range(1,30))
assert len({l['id'] for l in course['lessons']})==29
course_files=course['otherResources']+[r for l in course['lessons'] for r in l['resources'] if not r.get('external')]
assert len(course_files)==len({r['path'] for r in course_files})==341
assert course['coverage']['fileCount']==course['coverage']['catalogedFileCount']==341
assert course['coverage']['treeTruncated'] is False
assert sum(r['type']=='Diagrama' for r in course_files)==course['coverage']['diagramCount']==16
assert course['videoLinks']==[]
for lesson in course['lessons']:
    slides=[r for r in lesson['resources'] if r['type']=='Slides']
    assert len(slides)==1 and re.fullmatch(r'https://docs\.google\.com/presentation/d/[\w-]+/edit\?[^ ]+',slides[0]['url'])
    assert len(lesson['summary'])>100 and lesson['topics']
    assert all(x in {arch['id'] for arch in a['architectures']} for x in lesson['relatedArchitectures']),lesson['id']
for resource in course_files:
    assert '/blob/'+course['commit']+'/' in resource['url'] and resource['url'].startswith(course['repositoryUrl'])
    assert resource['path'] and resource['type'] and resource['group']
for resource in course['allLinks']+[r for l in course['lessons'] for r in l['links']]:
    assert resource['url'].startswith('https://'),resource

assert len(guided['cases'])==5
assert len({c['id'] for c in guided['cases']})==5
for case in guided['cases']:
    assert len(case['steps'])==10 and len(case['nodes'])>=8 and len(case['failureDrills'])==3,case['id']
    assert len(case['rubric'])>=5 and len(case['assumptions'])>=3 and len(case['invariants'])>=3,case['id']
    assert case['evidence']['kind'] in ('Relato público','Caso oficial adaptado','Cenário plausível')
    assert case['evidence']['sourceIds'] and case['evidence']['limits']
    node_ids={n['id'] for n in case['nodes']}
    assert len(node_ids)==len(case['nodes'])
    cursor=0
    for i,step in enumerate(case['steps']):
        assert step['minute']==cursor and step['duration']>0,(case['id'],i)
        cursor+=step['duration']
        assert len(step['candidate'])>=2 and all(len(x)>80 for x in step['candidate']),(case['id'],i)
        assert len(step['draw'])>=2 and step['focusNodes'] and step['mechanics'],(case['id'],i)
        assert step['artifact']['code'] and step['interviewer'] and step['checkpoint'] and step['principal']
        assert all(step['challenge'].get(k) for k in ('question','answer','pivot'))
        assert all(step['decision'].get(k) for k in ('choice','alternative','why','whenToChange'))
        for nid in step['focusNodes']:
            assert nid in node_ids and next(n for n in case['nodes'] if n['id']==nid)['firstStep']<=i,(case['id'],i,nid)
    assert cursor==60,case['id']
    for node in case['nodes']:
        assert 83<=node['x']<=892 and 32<=node['y']<=410 and 0<=node['firstStep']<=9,(case['id'],node)
    for edge in case['edges']:
        assert edge['from'] in node_ids and edge['to'] in node_ids
        assert 0<=edge['firstStep']<=9 and all(next(n for n in case['nodes'] if n['id']==nid)['firstStep']<=edge['firstStep'] for nid in (edge['from'],edge['to']))
    assert all(id in {arch['id'] for arch in a['architectures']} for id in case['relatedArchitectures'])
    assert all(isinstance(case['deployment'][p],str) and len(case['deployment'][p])>100 for p in ('aws','azure','onprem'))

# Mind map: coverage, graph integrity, references and local media are publication contracts.
assert len(mindmap['groups'])==16
map_nodes={n['id']:n for n in mindmap['nodes']}
map_groups={g['id']:g for g in mindmap['groups']}
assert len(map_nodes)==len(mindmap['nodes'])>=80
assert not set(map_nodes).intersection(map_groups)
map_links=set()
for edge in mindmap['connections']:
    assert edge['from'] in map_nodes and edge['to'] in map_nodes,edge
    assert edge['from']!=edge['to'] and edge['label'] and edge['explanation'],edge
    map_links.update([edge['from'],edge['to']])
assert map_links==set(map_nodes),f'Concepts without connections: {set(map_nodes)-map_links}'
seen=set();pending=[next(iter(map_nodes))]
while pending:
    nid=pending.pop()
    if nid in seen:continue
    seen.add(nid)
    for edge in mindmap['connections']:
        if edge['from']==nid:pending.append(edge['to'])
        elif edge['to']==nid:pending.append(edge['from'])
assert seen==set(map_nodes),'The concept graph must be connected'
route_ids={'atlas':{x['id'] for x in a['architectures']},'foundations':{x['id'] for x in f['chapters']},'ledger':{x['id'] for x in g['sections']},'guided':{x['id'] for x in guided['cases']},'map':set(map_nodes)|set(map_groups)}
for n in map_nodes.values():
    assert n['group'] in map_groups and n['label'] and len(n['summary'])>=40,n['id']
    assert len(n['mechanism'])>=2 and len(n['tradeoffs'])>=2,n['id']
    assert n['pitfall'] and n['interview'] and n['links'] and n['sourceIds'],n['id']
    assert n['originCellIds'],f'Missing origin: {n["id"]}'
    for link in n['links']:
        assert link['href'].startswith('#'),link
        parts=link['href'][1:].split('?')[0].split('/')
        if len(parts)>1 and parts[0] in route_ids:assert parts[1] in route_ids[parts[0]],link
for gid in map_groups:assert any(n['group']==gid for n in map_nodes.values()),gid
assert len(mindmap['materials'])==368
assert len({m['id'] for m in mindmap['materials']})==368
for material in mindmap['materials']:
    assert material['group'] in map_groups and material['title'] and material['cellIds'],material['id']
    assert material['nodeIds'] and set(material['nodeIds']).issubset(map_nodes),material['id']
    for field in ('path','thumb'):
        path=(root/material[field]).resolve()
        assert path.is_relative_to(root/'assets'/'mindmap') and path.is_file(),material[field]
        assert path.read_bytes()[:4]==b'RIFF',material[field]
assert mindmap['meta']['embeddedOccurrences']==372 and mindmap['meta']['externalIcons']==4
# Interview playbook: complete review inventory, reusable steps and progressive boards.
assert not playbook['meta']['draft'], 'A draft review must never be published'
assert len(playbook['cases'])==13 and len({c['id'] for c in playbook['cases']})==13
assert len(playbook['stages'])==10
cursor=0
for s in playbook['stages']:
    assert s['startMinute']==cursor and s['duration']>0
    cursor+=s['duration']
    assert all(s[k] for k in ('title','goal','say','ask','draw','decisionRule','principalLens'))
assert cursor==60
for c in playbook['cases']:
    assert len(c['steps'])==10 and c['evidence']['sourceIds'] and c['evidence']['limits'],c['id']
    assert len(c['invariants'])>=3 and c['promise'] and c['authority'],c['id']
    assert len(c['nodes'])>=7 and len({n['id'] for n in c['nodes']})==len(c['nodes']),c['id']
    nodes={n['id']:n for n in c['nodes']}
    for n in c['nodes']:
        assert 80<=n['x']<=920 and 60<=n['y']<=560 and 0<=n['firstStep']<=9,(c['id'],n)
        assert n['detail'] and n['label'] and n['role']
    for edge in c['edges']:
        assert edge['from'] in nodes and edge['to'] in nodes
        assert max(nodes[x]['firstStep'] for x in (edge['from'],edge['to']))<=edge['firstStep']<=9
        assert edge.get('lastStep',9)>=edge['firstStep'] and edge.get('lastStep',9)<=9
        assert edge['label'] and edge['detail']
    for i,step in enumerate(c['steps']):
        assert len(step['say'].split())>=50 and len(step['deepDive'].split())>=60,(c['id'],i)
        assert len(step['interviewer'])>40,(c['id'],i)
        assert len(step['ask'])>=2 and len(step['draw'])>=2 and step['check'],(c['id'],i)
        assert all(isinstance(step['memory'][k],str) and len(step['memory'][k])>30 for k in ('say','concept','connect','technology','defend')),(c['id'],i)
    for provider in ('aws','azure','onprem'):assert len(c['deployments'][provider])>100,(c['id'],provider)
    for link in c['links']:
        parts=link['href'][1:].split('?')[0].split('/')
        assert link['href'].startswith('#')
        if len(parts)>1 and parts[0] in route_ids:assert parts[1] in route_ids[parts[0]],(c['id'],link)
assert set(playbook['concepts'])==set(map_nodes), 'Every draw.io concept must be in the consultation'
assert [s['stage'] for s in playbook['stageConcepts']]==list(range(10))
consulted=set()
for section in playbook['stageConcepts']:
    for group in section['groups']:
        assert group['label'] and group['conceptIds']
        assert set(group['conceptIds']).issubset(map_nodes)
        consulted.update(group['conceptIds'])
assert consulted==set(map_nodes)
tech_ids={t['id'] for t in a['technologies']}
for id,concept in playbook['concepts'].items():
    assert all(isinstance(concept[k],str) and len(concept[k])>40 for k in ('whyHere','alternatives','bankingExample')),id
    assert concept['technologyIds'] and set(concept['technologyIds']).issubset(tech_ids),(id,concept['technologyIds'])
update=playbook['meta']['cacheUpdate']
assert update['caseId']=='distributed-cache' and len(set(update['materialIds']))==6
assert len(playbook['decisions'])==26+len(update['decisionIds'])
assert len(playbook['interruptions'])==32+len(update['interruptionIds'])
assert len({x['id'] for x in playbook['decisions']})==len(playbook['decisions'])
assert len({x['id'] for x in playbook['interruptions']})==len(playbook['interruptions'])
cache_notes=[(c['id'],n) for c in playbook['cases'] for step in c['steps'] for n in step.get('cacheNotes',[])]
assert len(cache_notes)==update['stepAdditions'] and len(cache_notes)>=6
assert {id for id,n in cache_notes}==set(update['enrichedCaseIds'])
for id,n in cache_notes:
    assert n['title'] and n['sourceIds'],id
    assert all(isinstance(n[k],str) and len(n[k])>=40 for k in ('say','concept','connect','technology','defend')),(id,n['title'])
assert {m['id'] for m in playbook['materials'] if m.get('collection')=='distributed-cache'}==set(update['materialIds'])
for d in playbook['decisions']:
    assert d.get('architectureId') in {x['id'] for x in a['architectures']} or (d.get('diagnostic') and d.get('sourceIds')),d['id']
    assert d['say'] and d['draw'] and d['cost'] and d['remove'],d['id']
for q in playbook['interruptions']:
    assert 0<=q['stage']<=9 and all(q[k] for k in ('question','answer','redraw','guardrail','principal')),q['id']
assert len({m['id'] for m in playbook['materials']})==len(playbook['materials'])==46
assert {kind:sum(m['type']==kind for m in playbook['materials']) for kind in ('PDF','Vídeo','Mapa draw.io')}=={'PDF':41,'Vídeo':4,'Mapa draw.io':1}
for m in playbook['materials']:
    assert m['reviewStatus'] and m['insights'] and m['application'] and m['limit'] and m['sourceIds'],m['id']
    assert 'andamento' not in m['reviewStatus'],m['id']
    if m['type']=='Vídeo':
        assert len(m['chapters'])>=4 and m['corrections'],m['id']
        for ch in m['chapters']:assert ch['href'].startswith('https://www.youtube.com/watch?v=') and ch['text']

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
        assert not re.search(r'meet\.google\.com/[a-z-]+|@(?:gmail|hotmail|outlook)\.com|/Users/|/Downloads/',text),path
print(json.dumps({'architectures':len(a['architectures']),'questions':len(p['questions']),'mocks':len(p['mocks']),'cases':len(r['cases']),'unique_source_urls':len({s['url'] or s['id'] for s in sources.values()}),'official_assets':len(l['entries']),'ledger_sections':len(g['sections']),'ledger_code_files':len(g['codeFiles']),'foundation_chapters':len(f['chapters']),'foundation_sections':sum(len(c['sections']) for c in f['chapters']),'operational_analyses':sum('operations' in x for x in a['architectures']),'videos':len(v['videos']),'course_lessons':len(course['lessons']),'course_files':len(course_files),'guided_cases':len(guided['cases']),'guided_steps':sum(len(c['steps']) for c in guided['cases']),'map_groups':len(map_groups),'map_concepts':len(map_nodes),'map_relations':len(mindmap['connections']),'map_images':len(mindmap['materials']),'playbook_cases':len(playbook['cases']),'playbook_steps':sum(len(c['steps']) for c in playbook['cases']),'playbook_concepts':len(playbook['concepts']),'playbook_materials':len(playbook['materials']),'playbook_decisions':len(playbook['decisions']),'playbook_followups':len(playbook['interruptions']),'status':'PASS'},ensure_ascii=False,indent=2))
