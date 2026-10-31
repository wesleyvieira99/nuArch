/** One expandable knowledge graph. Data and source images stay outside the renderer. */
export function createMindMap({escape: esc, sources, readNote, writeNote, isRead, toggleRead, onSelect}) {
  let data, host, svg, layer, camera, layout, observer, abort, selected = 'root';
  let expanded = new Set(), relationMode = true, materialPage = 0, materialQuery = '', full = false;
  let dragging = null, moved = false, pointers = new Map(), pinch = null;
  let inertSiblings=[],fullReturn=null;
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const color = g => /^#[\da-f]{6}$/i.test(g?.color || '') ? g.color : '#8041b8';
  const q = s => host?.querySelector(s);
  const qa = s => [...(host?.querySelectorAll(s) || [])];
  const node = id => data.nodes.find(n => n.id === id);
  const group = id => data.groups.find(g => g.id === id);
  const groupOf = id => group(id) || group(node(id)?.group);
  const label = id => id === 'root' ? 'System Design' : (node(id) || group(id))?.label || id;
  const button = (id, text, cls = '') => `<button class="${cls}" data-map-select="${esc(id)}">${esc(text)}</button>`;
  const paras = xs => (xs || []).map(x => `<p>${esc(x)}</p>`).join('');
  const lines = (text, max = 27) => {
    const out = [''];
    for (const word of text.split(' ')) {
      if (out[out.length - 1].length + word.length > max) out.push(word);
      else out[out.length - 1] += (out[out.length - 1] ? ' ' : '') + word;
    }
    return out;
  };

  function html(d, id) {
    data = d;
    selected = id && (node(id) || group(id)) ? id : 'root';
    expanded.clear();
    if (selected !== 'root') expanded.add(groupOf(selected).id);
    return `<section class="map-page" aria-label="Mapa mental de System Design">
      <header class="map-heading"><div><span class="eyebrow">SEU DRAW.IO · CONHECIMENTO CONECTADO</span><h1>Veja como as decisões se conectam.</h1><p>Um mapa para explorar seu material, seguir relações e transformar cada conceito em uma explicação de entrevista.</p></div><div class="map-counts"><strong>${data.groups.length}<small>temas</small></strong><strong>${data.nodes.length}<small>conceitos</small></strong><strong>${data.materials.length}<small>imagens do mural</small></strong></div></header>
      <div class="map-workspace" id="map-workspace">
        <div class="map-command"><label class="map-search-label"><span>⌕</span><input type="search" id="map-search" placeholder="Encontre TCP, idempotência, cache…" aria-label="Buscar conceitos no mapa" autocomplete="off"></label><select id="map-theme" aria-label="Ir para um tema"><option value="root">Todos os temas</option>${data.groups.map(g => `<option value="${esc(g.id)}" ${groupOf(selected)?.id === g.id ? 'selected' : ''}>${esc(g.label)}</option>`).join('')}</select><button class="button small" id="map-overview">Visão geral</button><button class="button small" id="map-full" aria-pressed="false">Ampliar mapa ⛶</button><div id="map-results" class="map-search-results" aria-live="polite" hidden></div></div>
        <div class="map-body"><div class="map-stage-wrap"><div class="map-stage" id="map-stage"><svg id="knowledge-map" role="group" tabindex="0" aria-label="Mapa mental: use Tab para selecionar temas; setas para mover; + e − para ampliar; Home para enquadrar"><defs><pattern id="map-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor" opacity=".13"/></pattern></defs><rect width="100%" height="100%" fill="url(#map-dots)"/><g id="map-world"></g></svg><div class="map-camera-tools"><button id="map-zoom-in" aria-label="Aproximar mapa">+</button><span id="map-zoom" aria-live="polite">100%</span><button id="map-zoom-out" aria-label="Afastar mapa">−</button><button id="map-fit" aria-label="Enquadrar desenho">⌖</button></div><div class="map-stage-caption" id="map-stage-caption">Selecione um tema para abrir seu ramo.</div><svg id="map-mini" class="map-minimap" viewBox="0 0 180 115" role="img" aria-label="Minimapa com a área visível"></svg></div><div class="map-options"><button class="quiet" id="map-expand">Expandir todos os temas</button><button class="quiet" id="map-explain">Ler explicação ↓</button><label><input type="checkbox" id="map-relations" ${relationMode ? 'checked' : ''}> Conexões entre conceitos</label><span>Arraste o fundo · Ctrl/⌘ + rolagem para zoom</span></div></div><aside id="map-inspector" class="map-inspector" aria-label="Explicação do conceito"></aside></div>
        <dialog id="map-image-dialog" class="map-image-dialog"><header><strong id="map-image-title"></strong><button class="icon-button" id="map-image-close" aria-label="Fechar imagem">×</button></header><img id="map-image" alt=""><div class="map-image-actions"><button class="button small" id="map-image-prev">← Anterior</button><span id="map-image-count"></span><a id="map-image-link" class="button small" target="_blank" rel="noopener">Abrir imagem ↗</a><button class="button small" id="map-image-next">Próxima →</button></div><p>Recorte de estudo fornecido no DSNu.drawio. Consulte as observações técnicas do mapa ao interpretar o original.</p></dialog>
      </div>
      <details class="panel map-index"><summary>Navegar pelo índice de conceitos</summary><p>O mesmo mapa em uma lista navegável, útil com teclado ou leitor de tela.</p><div>${data.groups.map(g => `<section><h2>${button(g.id, g.label)}</h2><ul>${data.nodes.filter(n => n.group === g.id).map(n => `<li>${button(n.id, n.label)}</li>`).join('')}</ul></section>`).join('')}</div></details>
      <details class="panel map-provenance"><summary>Como o seu material foi organizado</summary><p>${esc(data.meta?.description || 'Os temas do mural foram reorganizados em um grafo de estudo. As conexões conceituais e explicações são uma curadoria editorial; as imagens preservam os recortes fornecidos.')}</p><p>Abra “Material do seu mural” para consultar as imagens. Há recortes que se repetem e simplificações que exigem contexto; as notas técnicas explicam os pontos de atenção. O OCR auxilia a busca e pode conter erros. As fontes de aprofundamento acompanham cada conceito.</p></details>
    </section>`;
  }

  function computeLayout() {
    const items = [], edges = [], bounds = new Map();
    const halves = [data.groups.slice(0, Math.ceil(data.groups.length / 2)), data.groups.slice(Math.ceil(data.groups.length / 2))];
    const heights = halves.map(gs => gs.reduce((h, g) => h + (expanded.has(g.id) ? Math.max(120, data.nodes.filter(n => n.group === g.id).length * 74 + 35) : 88), 0));
    const height = Math.max(...heights) + 100;
    items.push({id:'root', x:1020, y:height / 2, w:235, h:100, type:'root', color:'#8041b8'});
    halves.forEach((gs, side) => {
      let y = (height - heights[side]) / 2;
      for (const g of gs) {
        const children = data.nodes.filter(n => n.group === g.id);
        const h = expanded.has(g.id) ? Math.max(120, children.length * 74 + 35) : 88;
        const cy = y + h / 2, x = side ? 1390 : 650;
        items.push({id:g.id, x, y:cy, w:270, h:76, type:'group', color:color(g), count:children.length});
        edges.push({from:'root', to:g.id, color:color(g)});
        if (expanded.has(g.id)) children.forEach((n, j) => {
          items.push({id:n.id, x:side ? 1820 : 220, y:y+42+j*74, w:330, h:58, type:'concept', color:color(g)});
          edges.push({from:g.id, to:n.id, color:color(g)});
        });
        bounds.set(g.id, {x:side ? 1210 : 20, y:y-15, w:810, h:h+30});
        y += h;
      }
    });
    return {items, edges, bounds, width:2040, height};
  }

  function draw() {
    const focused=document.activeElement?.dataset?.mapNode;
    layout = computeLayout();
    const byId = new Map(layout.items.map(n => [n.id, n]));
    const path = (f, t) => {
      const sign = Math.sign(t.x - f.x) || 1;
      const a = f.x + sign * f.w/2, b = t.x - sign * t.w/2;
      return `M${a},${f.y} C${a+sign*100},${f.y} ${b-sign*100},${t.y} ${b},${t.y}`;
    };
    const related = relationMode && node(selected) ? data.connections.filter(r => r.from === selected || r.to === selected) : [];
    const relatedIds = new Set(related.flatMap(r => [r.from, r.to]));
    layer.innerHTML = `${layout.edges.map(r => {const f=byId.get(r.from),t=byId.get(r.to);return `<path class="map-branch" d="${path(f,t)}" stroke="${r.color}"/>`;}).join('')}${related.filter(r=>byId.has(r.from)&&byId.has(r.to)).map(r=>{const f=byId.get(r.from),t=byId.get(r.to);return `<path class="map-relation" d="M${f.x},${f.y} Q1020,${(f.y+t.y)/2-100} ${t.x},${t.y}"><title>${esc(r.label)}</title></path>`;}).join('')}${layout.items.map(n=>{
      const title = label(n.id), text = lines(title, n.type==='concept'?32:25);
      const cy = n.y-(text.length-1)*9+(n.type==='group'?-6:0);
      return `<g class="map-node ${n.type} ${selected===n.id?'selected':''} ${relatedIds.has(n.id)?'related':''}" data-map-node="${esc(n.id)}" role="button" tabindex="0" aria-label="${esc(title)}${n.type==='group'?`, ${n.count} conceitos. ${expanded.has(n.id)?'Ramo aberto':'Abrir ramo'}`:''}" ${n.type==='group'?`aria-expanded="${expanded.has(n.id)}"`:''} style="--node-color:${n.color}"><title>${esc(title)}</title><rect x="${n.x-n.w/2}" y="${n.y-n.h/2}" width="${n.w}" height="${n.h}" rx="${n.type==='root'?26:15}"/><circle class="map-node-dot" cx="${n.x-n.w/2+17}" cy="${n.y}" r="4"/>${text.map((t,j)=>`<text x="${n.x+3}" y="${cy+j*18+5}" text-anchor="middle">${esc(t)}</text>`).join('')}${n.type==='group'?`<text class="map-node-count" x="${n.x+3}" y="${n.y+25}" text-anchor="middle">${n.count} conceitos · ${expanded.has(n.id)?'aberto':'explorar +'}</text>`:''}${n.type==='concept'&&isRead(n.id)?`<text class="map-read-mark" x="${n.x+n.w/2-18}" y="${n.y+5}">✓</text>`:''}</g>`;
    }).join('')}`;
    applyCamera();
    if(focused)q(`[data-map-node="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
  }

  function dims() { const r=svg.getBoundingClientRect(); return {w:r.width||800,h:r.height||600}; }
  function applyCamera() {
    if (!camera || !layer) return;
    layer.setAttribute('transform', `translate(${camera.x} ${camera.y}) scale(${camera.z})`);
    q('#map-zoom').textContent=`${Math.round(camera.z*100)}%`;
    q('#map-expand').textContent=expanded.size===data.groups.length?'Recolher todos os temas':'Expandir todos os temas';
    const d=dims(), scale=Math.min(170/layout.width,105/layout.height), ox=(180-layout.width*scale)/2,oy=(115-layout.height*scale)/2;
    q('#map-mini').innerHTML=`<rect width="180" height="115" rx="12" class="map-mini-bg"/>${layout.items.map(n=>`<rect x="${ox+(n.x-n.w/2)*scale}" y="${oy+(n.y-n.h/2)*scale}" width="${Math.max(2,n.w*scale)}" height="${Math.max(2,n.h*scale)}" rx="1" fill="${n.id===selected?'#8129c9':n.color}" opacity=".65"/>`).join('')}<rect class="map-mini-view" x="${ox-camera.x/camera.z*scale}" y="${oy-camera.y/camera.z*scale}" width="${d.w/camera.z*scale}" height="${d.h/camera.z*scale}"/>`;
  }
  function fit(box) {
    const d=dims(),xs=layout.items.map(n=>n.x-n.w/2),ys=layout.items.map(n=>n.y-n.h/2),xe=layout.items.map(n=>n.x+n.w/2),ye=layout.items.map(n=>n.y+n.h/2);const b=box||{x:Math.min(...xs)-25,y:Math.min(...ys)-25,w:Math.max(...xe)-Math.min(...xs)+50,h:Math.max(...ye)-Math.min(...ys)+50};
    const availableH=Math.max(100,d.h-136),z=Math.max(.08,Math.min(1.2,Math.min((d.w-50)/b.w,availableH/b.h)));
    camera={z,x:(d.w-b.w*z)/2-b.x*z,y:24+(availableH-b.h*z)/2-b.y*z}; applyCamera();
  }
  function zoom(factor, x, y) {
    const d=dims(); x??=d.w/2; y??=d.h/2;
    const z=Math.min(2,Math.max(.08,camera.z*factor)),ratio=z/camera.z;
    camera={z,x:x-(x-camera.x)*ratio,y:y-(y-camera.y)*ratio};applyCamera();
  }
  function focus(id) {
    const n=layout.items.find(n=>n.id===id); if(!n)return;
    if(group(id)){const b=layout.bounds.get(id),children=layout.items.filter(x=>node(x.id)?.group===id);if(dims().w<550&&children.length){const first=children[0];fit({x:first.x-190,y:first.y-55,w:380,h:Math.min(b.h,520)});}else fit(b);}
    else if(id==='root')fit();
    else {const d=dims(),z=Math.min(1.05,(d.w-60)/n.w);camera={z,x:d.w/2-n.x*z,y:d.h/2-n.y*z};applyCamera();}
  }
  function select(id, {move=true,updateUrl=true}={}) {
    if(id!=='root'&&!node(id)&&!group(id))return;
    selected=id;materialPage=0;materialQuery='';
    if(id!=='root')expanded.add(groupOf(id).id);
    if(relationMode&&node(id)) data.connections.filter(r=>r.from===id||r.to===id).forEach(r=>{const n=node(r.from===id?r.to:r.from);if(n)expanded.add(n.group);});
    draw();inspector();if(move)focus(id);
    q('#map-theme').value=groupOf(id)?.id||'root';
    q('#map-results').hidden=true;
    q('#map-stage-caption').textContent=id==='root'?'Selecione um tema para abrir seu ramo.':`${groupOf(id)?.label||''} · ${label(id)}`;
    if(updateUrl){history.replaceState(null,'',id==='root'?'#map':`#map/${encodeURIComponent(id)}`);onSelect(id==='root'?'':id);}
  }
  function scopedMaterials() {
    const g=groupOf(selected),n=node(selected);
    let ms=data.materials.filter(m=>selected==='root'||(n?(m.nodeIds||[]).includes(n.id):m.group===g?.id));
    if(n&&!ms.length)ms=data.materials.filter(m=>m.group===n.group);
    if(materialQuery)ms=ms.filter(m=>norm(`${m.title} ${m.ocrText||''}`).includes(norm(materialQuery)));
    return ms;
  }
  function gallery() {
    const ms=scopedMaterials();materialPage=Math.min(materialPage,Math.max(0,Math.ceil(ms.length/8)-1));
    return `<details class="map-material" ${selected==='root'?'open':''}><summary>Material do seu mural <span>${ms.length}</span></summary><p>Imagens de origem, com notas técnicas complementares acima. As repetições exatas foram reunidas.</p><input type="search" id="map-material-search" placeholder="Buscar texto nos recortes…" value="${esc(materialQuery)}" aria-label="Buscar nas imagens do mural"><div class="map-gallery">${ms.slice(materialPage*8,materialPage*8+8).map(m=>`<button data-map-image="${esc(m.id)}"><img src="${esc(m.thumb||m.path)}" alt="${esc(m.title)}" width="160" height="100" loading="lazy"><span>${esc(m.title)}</span><small>${esc(m.id)}</small></button>`).join('')||'<p>Nenhum recorte encontrado neste tema.</p>'}</div>${ms.length>8?`<div class="map-gallery-pages"><button class="button small" data-map-page="${materialPage-1}" ${materialPage===0?'disabled':''}>←</button><span>${materialPage+1} / ${Math.ceil(ms.length/8)}</span><button class="button small" data-map-page="${materialPage+1}" ${(materialPage+1)*8>=ms.length?'disabled':''}>→</button></div>`:''}</details>`;
  }
  function inspector() {
    const n=node(selected),g=groupOf(selected),relations=n?data.connections.filter(r=>r.from===n.id||r.to===n.id):[];
    let body;
    if(selected==='root')body=`<span class="eyebrow">COMECE POR UMA DECISÃO</span><h2>Seu mapa de System Design.</h2><p>Abra um dos ${data.groups.length} temas para revelar os conceitos. Selecione uma peça para entender o mecanismo, seus custos e a pergunta que ela ajuda a responder.</p><ol class="map-how"><li><strong>Explore.</strong> Abra um ramo, amplie e arraste o desenho.</li><li><strong>Conecte.</strong> Siga as relações entre problemas e garantias.</li><li><strong>Explique.</strong> Responda em voz alta e registre a sua versão.</li></ol><div class="map-theme-list">${data.groups.map(g=>button(g.id,g.label)).join('')}</div><div class="map-editorial-note"><strong>Origem + revisão técnica</strong><p>Seu mural é o ponto de partida. As descrições do mapa detalham os limites e corrigem simplificações, com fontes de aprofundamento.</p></div>`;
    else if(!n)body=`<span class="eyebrow">RAMO DO MAPA</span><h2>${esc(g.label)}</h2><p>${esc(g.description)}</p><div class="map-theme-list">${data.nodes.filter(x=>x.group===g.id).map(x=>button(x.id,x.label)).join('')}</div><button class="button small" id="map-collapse-group">Recolher este ramo</button>`;
    else body=`<div class="map-breadcrumb">${button('root','Mapa')}<span>/</span>${button(g.id,g.label)}</div><h2 id="map-concept-title" tabindex="-1">${esc(n.label)}</h2><p class="map-summary">${esc(n.summary)}</p><section><h3>Como funciona</h3>${paras(n.mechanism)}</section><section><h3>O preço da escolha</h3><ul>${(n.tradeoffs||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section><div class="map-editorial-note"><strong>Atenção ao limite</strong><p>${esc(n.pitfall)}</p></div><section class="map-answer"><h3>Leve para a entrevista</h3><p>${esc(n.interview)}</p></section>${relations.length?`<section class="map-connections"><h3>Conecte o raciocínio</h3>${relations.map(r=>{const other=r.from===n.id?r.to:r.from;return `<button data-map-select="${esc(other)}"><strong>${esc(label(other))} ↗</strong><span>${esc(r.label)}</span><small>${esc(r.explanation)}</small></button>`;}).join('')}</section>`:''}<section class="map-deeper"><h3>Aprofunde no portal</h3>${(n.links||[]).map(l=>`<a href="${esc(l.href)}">${esc(l.label)} ↗</a>`).join('')}${sources(n.sourceIds)}</section><section class="map-practice"><button class="button small" id="map-read" aria-pressed="${isRead(n.id)}">${isRead(n.id)?'✓ Consigo explicar':'Marcar como revisado'}</button><label>Minha explicação<textarea id="map-note" rows="4" placeholder="A garantia é… A falha que muda a escolha é…">${esc(readNote(n.id))}</textarea></label></section>`;
    q('#map-inspector').scrollTop=0;
    q('#map-inspector').innerHTML=`<div class="map-inspector-content"><button class="quiet map-back-board" id="map-back-board">↑ Voltar ao desenho</button>${body}<div id="map-gallery-area">${gallery()}</div></div>`;
  }

  function search(value) {
    const box=q('#map-results');if(!value.trim()){box.hidden=true;return;}
    const text=norm(value),score=n=>norm(n.label).includes(text)?0:norm((n.keywords||[]).join(' ')).includes(text)?1:2;
    const ns=data.nodes.filter(n=>norm([n.label,n.summary,...(n.keywords||[]),...(n.mechanism||[]),...(n.tradeoffs||[]),n.pitfall,n.interview].join(' ')).includes(text)).sort((a,b)=>score(a)-score(b));
    const gs=data.groups.filter(g=>norm(g.label).includes(text));
    box.innerHTML=[...gs.map(g=>({id:g.id,label:g.label,sub:'Tema'})),...ns.map(n=>({id:n.id,label:n.label,sub:group(n.group).label}))].slice(0,16).map(r=>`<button data-map-select="${esc(r.id)}"><strong>${esc(r.label)}</strong><small>${esc(r.sub)}</small></button>`).join('')||'<p>Nenhum conceito encontrado. Experimente outro termo.</p>';
    box.hidden=false;
  }

  let currentImage='';
  function showImage(id) {
    const m=data.materials.find(x=>x.id===id);if(!m)return;currentImage=id;
    const ms=scopedMaterials(),i=ms.findIndex(x=>x.id===id),dialog=q('#map-image-dialog');
    q('#map-image-title').textContent=m.title;q('#map-image').src=m.path;q('#map-image').alt=m.title;q('#map-image-link').href=m.path;
    q('#map-image-count').textContent=`${Math.max(0,i)+1} / ${ms.length}`;q('#map-image-prev').disabled=i<=0;q('#map-image-next').disabled=i<0||i>=ms.length-1;
    if(!dialog.open)dialog.showModal();
  }

  function bind(d,id) {
    destroy();data=d;host=document.querySelector('.map-page');if(!host)return;
    svg=q('#knowledge-map');layer=q('#map-world');camera={x:0,y:0,z:1};abort=new AbortController();const signal=abort.signal;
    const listen=(el,event,fn,options={})=>el?.addEventListener(event,fn,{...options,signal});
    selected=id&&(node(id)||group(id))?id:'root';
    draw();inspector();requestAnimationFrame(()=>{if(host&&document.contains(host))focus(selected);});
    observer=new ResizeObserver(()=>{if(camera&&layout)applyCamera();});observer.observe(svg);
    listen(host,'click',ev=>{
      const pick=ev.target.closest('[data-map-select],[data-map-node]');
      if(pick){if(moved&&pick.dataset.mapNode){moved=false;return;}moved=false;const id=pick.dataset.mapSelect||pick.dataset.mapNode;select(id);if(ev.detail===0)q(`[data-map-node="${CSS.escape(id)}"]`)?.focus({preventScroll:true});return;}moved=false;
      const img=ev.target.closest('[data-map-image]');if(img){showImage(img.dataset.mapImage);return;}
      const page=ev.target.closest('[data-map-page]');if(page){materialPage=Number(page.dataset.mapPage);q('#map-gallery-area').innerHTML=gallery();q('.map-material').open=true;return;}
      if(ev.target.closest('#map-back-board'))q('#map-stage').scrollIntoView({block:'start'});
      if(ev.target.closest('#map-read')){toggleRead(selected);q('#map-read').setAttribute('aria-pressed',String(isRead(selected)));q('#map-read').textContent=isRead(selected)?'✓ Consigo explicar':'Marcar como revisado';draw();}
      if(ev.target.closest('#map-collapse-group')){expanded.delete(groupOf(selected).id);selected='root';select('root');}
    });
    listen(host,'keydown',ev=>{const el=ev.target.closest('[data-map-node]');if(el&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();const id=el.dataset.mapNode;select(id);q(`[data-map-node="${CSS.escape(id)}"]`)?.focus({preventScroll:true});}});
    listen(host,'input',ev=>{
      if(ev.target.id==='map-note')writeNote(selected,ev.target.value);
      if(ev.target.id==='map-material-search'){materialQuery=ev.target.value;materialPage=0;const pos=ev.target.selectionStart;q('#map-gallery-area').innerHTML=gallery();q('.map-material').open=true;const input=q('#map-material-search');input.focus({preventScroll:true});try{input.setSelectionRange(pos,pos);}catch{}}
    });
    listen(q('#map-search'),'input',ev=>search(ev.target.value));
    listen(q('#map-search'),'keydown',ev=>{if(ev.key==='ArrowDown'){ev.preventDefault();q('#map-results button')?.focus();}if(ev.key==='Escape')q('#map-results').hidden=true;});
    listen(q('#map-theme'),'change',ev=>select(ev.target.value));
    listen(q('#map-overview'),'click',()=>{expanded.clear();select('root');});
    listen(q('#map-fit'),'click',()=>fit());listen(q('#map-explain'),'click',()=>{q('#map-inspector').scrollIntoView({block:'start'});q('#map-inspector').tabIndex=-1;q('#map-inspector').focus({preventScroll:true});});
    listen(q('#map-zoom-in'),'click',()=>zoom(1.25));listen(q('#map-zoom-out'),'click',()=>zoom(.8));
    listen(q('#map-expand'),'click',()=>{expanded=expanded.size===data.groups.length?new Set():new Set(data.groups.map(g=>g.id));selected='root';draw();inspector();fit();history.replaceState(null,'','#map');onSelect('');});
    listen(q('#map-relations'),'change',ev=>{relationMode=ev.target.checked;select(selected,{move:false});});
    listen(q('#map-full'),'click',()=>{full=!full;const workspace=q('#map-workspace');workspace.classList.toggle('map-fullscreen',full);document.body.classList.toggle('map-is-full',full);q('#map-full').textContent=full?'Sair da tela ampliada ⤢':'Ampliar mapa ⛶';q('#map-full').setAttribute('aria-pressed',String(full));if(full){fullReturn=document.activeElement;workspace.setAttribute('role','dialog');workspace.setAttribute('aria-modal','true');workspace.setAttribute('aria-label','Mapa mental ampliado');for(let current=workspace;current.parentElement;current=current.parentElement){for(const sibling of current.parentElement.children){if(sibling!==current&&!['SCRIPT','STYLE'].includes(sibling.tagName)){inertSiblings.push([sibling,sibling.inert]);sibling.inert=true;}}if(current.parentElement===document.body)break;}q('#map-full').focus();}else{restoreOutside();workspace.removeAttribute('role');workspace.removeAttribute('aria-modal');workspace.removeAttribute('aria-label');if(fullReturn?.isConnected)fullReturn.focus({preventScroll:true});}requestAnimationFrame(()=>{if(host?.isConnected)focus(selected)});});
    listen(document,'keydown',ev=>{if(!full||q('#map-image-dialog').open)return;if(ev.key==='Escape'){ev.preventDefault();q('#map-full').click();}if(ev.key==='Tab'){const els=[...q('#map-workspace').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')].filter(el=>!el.closest('[hidden],dialog:not([open])')&&el.getClientRects().length);const first=els[0],last=els[els.length-1];if(ev.shiftKey&&(document.activeElement===first||!q('#map-workspace').contains(document.activeElement))){ev.preventDefault();last?.focus();}else if(!ev.shiftKey&&(document.activeElement===last||!q('#map-workspace').contains(document.activeElement))){ev.preventDefault();first?.focus();}}});
    listen(svg,'focusin',ev=>{const el=ev.target.closest('[data-map-node]');if(!el)return;const a=el.getBoundingClientRect(),b=svg.getBoundingClientRect();if(a.left<b.left||a.right>b.right||a.top<b.top||a.bottom>b.bottom)focus(el.dataset.mapNode);});
    listen(q('#map-image-close'),'click',()=>q('#map-image-dialog').close());
    listen(q('#map-image-dialog'),'click',ev=>{if(ev.target===q('#map-image-dialog'))q('#map-image-dialog').close();});
    listen(q('#map-image-prev'),'click',()=>{const ms=scopedMaterials(),i=ms.findIndex(m=>m.id===currentImage);if(i>0)showImage(ms[i-1].id);});
    listen(q('#map-image-next'),'click',()=>{const ms=scopedMaterials(),i=ms.findIndex(m=>m.id===currentImage);if(i>=0&&i<ms.length-1)showImage(ms[i+1].id);});
    listen(svg,'wheel',ev=>{if(!ev.ctrlKey&&!ev.metaKey)return;ev.preventDefault();const r=svg.getBoundingClientRect();zoom(Math.exp(-ev.deltaY*.004),ev.clientX-r.left,ev.clientY-r.top);},{passive:false});
    listen(svg,'pointerdown',ev=>{
      if(ev.target.closest('[data-map-node]')&&ev.pointerType!=='touch'){moved=false;return;}
      pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});svg.setPointerCapture(ev.pointerId);moved=false;
      if(pointers.size===2){const ps=[...pointers.values()];pinch={distance:Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y)};dragging=null;}
      else dragging={x:ev.clientX,y:ev.clientY,cx:camera.x,cy:camera.y,node:ev.target.closest('[data-map-node]')?.dataset.mapNode};
    });
    listen(svg,'pointermove',ev=>{
      if(!pointers.has(ev.pointerId))return;pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
      if(pointers.size===2&&pinch){const ps=[...pointers.values()],distance=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y),r=svg.getBoundingClientRect();zoom(distance/Math.max(1,pinch.distance),(ps[0].x+ps[1].x)/2-r.left,(ps[0].y+ps[1].y)/2-r.top);pinch.distance=distance;moved=true;}
      else if(dragging){const dx=ev.clientX-dragging.x,dy=ev.clientY-dragging.y;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;camera.x=dragging.cx+dx;camera.y=dragging.cy+dy;applyCamera();}
    });
    const end=ev=>{const tapped=ev.type==='pointerup'&&dragging?.node&&!moved?dragging.node:null;pointers.delete(ev.pointerId);dragging=null;pinch=null;if(svg.hasPointerCapture(ev.pointerId))svg.releasePointerCapture(ev.pointerId);if(tapped)select(tapped);};
    listen(svg,'pointerup',end);listen(svg,'pointercancel',end);
    listen(svg,'keydown',ev=>{if(ev.target!==svg)return;const step=65;const keys={ArrowLeft:[step,0],ArrowRight:[-step,0],ArrowUp:[0,step],ArrowDown:[0,-step]};if(keys[ev.key]){ev.preventDefault();camera.x+=keys[ev.key][0];camera.y+=keys[ev.key][1];applyCamera();}else if(['+','=','-','Home'].includes(ev.key)){ev.preventDefault();if(ev.key==='Home')fit();else zoom(ev.key==='-'?.8:1.25);}});
  }
  function restoreOutside(){for(const [el,value] of inertSiblings)el.inert=value;inertSiblings=[];}
  function destroy() {
    abort?.abort();observer?.disconnect();restoreOutside();document.body.classList.remove('map-is-full');full=false;pointers.clear();dragging=null;pinch=null;host=null;
  }
  return {html,bind,destroy};
}
