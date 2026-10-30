"""Synchronize the chapter's downloadable/viewable examples with their source."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
path=root/'data'/'ledger.json'
data=json.loads(path.read_text())
files=['ledger.py','test_ledger.py','demo.py','requirements.txt','README.md']
data['codeFiles']=[{'name':name,'language':{'py':'Python','md':'Markdown','txt':'texto'}[name.rsplit('.',1)[1]],'text':(root/'examples'/'ledger'/name).read_text()} for name in files]
path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(f'Embedded {len(files)} ledger source files.')
