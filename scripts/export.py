"""Export one portable HTML (embedded content, code and official icons)."""
from pathlib import Path
import base64,json,mimetypes,re,sys
root=Path(__file__).resolve().parents[1]
out=Path(sys.argv[1]) if len(sys.argv)>1 else root/'nuArch-portable.html'
data=[json.loads((root/'data'/f'{name}.json').read_text()) for name in ('architectures','practice','research','logos','ledger','foundations','videos','course-linux','guided','mindmap','playbook')]
for entry in data[3]['entries']:
    path=root/entry['logo'];mime=mimetypes.guess_type(path)[0] or 'application/octet-stream'
    entry['logo']=f'data:{mime};base64,'+base64.b64encode(path.read_bytes()).decode()
for material in data[9]['materials']:
    for field in ('path','thumb'):
        path=root/material[field]
        material[field]='data:image/webp;base64,'+base64.b64encode(path.read_bytes()).decode()
js=(root/'app.js').read_text();start=js.index('const responses=await Promise.all(')
end=start+re.search(r';const \[[^]]+\]=responses',js[start:]).start()
js=js[:start]+'const responses=window.__NUARCH_DATA__'+js[end:]
js=js.replace("import {quorumModel,queueModel,cacheBurstModel,poolModel,tokenBucketModel} from './models.mjs';",(root/'models.mjs').read_text().replace('export function ','function '))
js=js.replace("import {createProgressStore} from './progress-merge.mjs';",(root/'progress-merge.mjs').read_text().replace('export function ','function ').replace('export const ','const '))
js=re.sub(r"import \{createMindMap\} from './mindmap\.mjs(?:\?[^']*)?';",lambda _: (root/'mindmap.mjs').read_text().replace('export function ','function '),js)
js=re.sub(r"import \{createPlaybook\} from './playbook\.mjs(?:\?[^']*)?';",lambda _: (root/'playbook.mjs').read_text().replace('export function ','function '),js)
js=re.sub(r"import \{routeDiagram\} from './playbook-routing\.mjs(?:\?[^']*)?';",lambda _: (root/'playbook-routing.mjs').read_text().replace('export function ','function '),js)
html=(root/'index.html').read_text()
for name in ('styles.css','mindmap.css','playbook.css'):
    css=re.sub(r'^@import[^\n]*\n','',(root/name).read_text(),flags=re.M)
    html=re.sub(r'<link rel="stylesheet" href="'+re.escape(name)+r'(?:\?[^"\s]*)?">',lambda _:'<style>'+css+'</style>',html)
favicon='data:image/svg+xml;base64,'+base64.b64encode((root/'assets/favicon.svg').read_bytes()).decode()
html=html.replace('assets/favicon.svg',favicon)
payload=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
html=re.sub(r'<script type="module" src="app\.js(?:\?[^"\s]*)?"></script>',lambda _:'<script>window.__NUARCH_DATA__='+payload+';</script><script type="module">'+js.replace('</script','<\\/script')+'</script>',html)
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(html)
print(f'Portable HTML written: {out.name} ({out.stat().st_size:,} bytes)')
