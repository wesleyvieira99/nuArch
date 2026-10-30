"""Export one portable HTML (embedded content, code and official icons)."""
from pathlib import Path
import base64,json,mimetypes,re,sys
root=Path(__file__).resolve().parents[1]
out=Path(sys.argv[1]) if len(sys.argv)>1 else root/'nuArch-portable.html'
data=[json.loads((root/'data'/f'{name}.json').read_text()) for name in ('architectures','practice','research','logos','ledger')]
for entry in data[3]['entries']:
    path=root/entry['logo'];mime=mimetypes.guess_type(path)[0] or 'application/octet-stream'
    entry['logo']=f'data:{mime};base64,'+base64.b64encode(path.read_bytes()).decode()
js=(root/'app.js').read_text();start=js.index('const responses=await Promise.all(');end=js.index(';const [a,p,r,l,g]=responses',start)
js=js[:start]+'const responses=window.__NUARCH_DATA__'+js[end:]
css=re.sub(r'@import url\([^;]+;','',(root/'styles.css').read_text())
html=(root/'index.html').read_text()
html=html.replace('<link rel="stylesheet" href="styles.css">','<style>'+css+'</style>')
favicon='data:image/svg+xml;base64,'+base64.b64encode((root/'assets/favicon.svg').read_bytes()).decode()
html=html.replace('assets/favicon.svg',favicon)
payload=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
html=html.replace('<script type="module" src="app.js"></script>','<script>window.__NUARCH_DATA__='+payload+';</script><script type="module">'+js.replace('</script','<\\/script')+'</script>')
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(html)
print(f'Portable HTML written: {out.name} ({out.stat().st_size:,} bytes)')
