/** Contextual video facade. No network access occurs until an explicit load click. */
const studyVideoEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function studyVideoTarget(raw) {
  let url;
  try { url = new URL(String(raw)); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  let id;
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname) && url.pathname === '/watch') id = url.searchParams.get('v');
  else if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
  else return null;
  if (!/^[A-Za-z0-9_-]{11}$/.test(id || '')) return null;
  const rawStart = url.searchParams.get('start') ?? url.searchParams.get('t') ?? '0';
  let start = 0;
  if (/^\d+s?$/.test(rawStart)) start = Number.parseInt(rawStart, 10);
  else {
    const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(rawStart);
    if (!match || !rawStart) return null;
    start = Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
  }
  if (!Number.isSafeInteger(start) || start < 0 || start > 86400) return null;
  const watch = `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ''}`;
  const stamp = start >= 3600 ? `${Math.floor(start / 3600)}:${String(Math.floor(start % 3600 / 60)).padStart(2,'0')}:${String(start % 60).padStart(2,'0')}` : `${Math.floor(start / 60)}:${String(start % 60).padStart(2,'0')}`;
  return {id, start, watch, stamp};
}

function studyVideoLoadButton(title, stamp) {
  return `<button type="button" class="sv-load" data-study-video-load aria-label="Carregar player do YouTube: ${studyVideoEscape(title)}, a partir de ${studyVideoEscape(stamp)}"><span class="sv-symbol" aria-hidden="true">▶</span><strong>Carregar vídeo</strong><small>YouTube · a partir de ${studyVideoEscape(stamp)}</small></button>`;
}

export function renderStudyVideo(url, title, note = '') {
  const target = studyVideoTarget(url);
  if (!target) return ''; // Fail closed: do not turn arbitrary URLs into iframe src.
  const safeTitle = String(title || 'Vídeo de estudo');
  return `<section class="study-video" data-study-video data-study-video-url="${studyVideoEscape(target.watch)}" data-study-video-title="${studyVideoEscape(safeTitle)}" aria-label="Vídeo de estudo: ${studyVideoEscape(safeTitle)}">
    <div class="sv-poster">
      <div class="sv-art" aria-hidden="true"><svg viewBox="0 0 640 360" focusable="false"><path d="M-20 240C100 240 130 80 270 80S430 250 680 140M-20 280C120 280 170 140 300 140S480 290 680 210M-20 180C120 180 180 250 300 250S480 60 680 90"/><circle cx="140" cy="176" r="7"/><circle cx="307" cy="141" r="7"/><circle cx="490" cy="129" r="7"/><circle cx="540" cy="229" r="7"/></svg></div>
      <div class="sv-slot" data-study-video-slot>${studyVideoLoadButton(safeTitle, target.stamp)}</div>
    </div>
    <div class="sv-caption"><p class="sv-title">${studyVideoEscape(safeTitle)}</p>${note ? `<p class="sv-note">${studyVideoEscape(note)}</p>` : ''}<p class="sv-privacy">O clique conecta ao YouTube. A reprodução começa pelos controles do player.</p>
      <div class="sv-actions"><a class="button small" href="${studyVideoEscape(target.watch)}" target="_blank" rel="noopener">Abrir no YouTube ↗</a><button class="button small" type="button" data-study-video-close hidden>Fechar vídeo</button></div>
      <p class="sv-status" role="status" aria-live="polite" data-study-video-status></p>
    </div>
  </section>`;
}

function resetStudyVideo(card, focus) {
  const target = studyVideoTarget(card.dataset.studyVideoUrl);
  const slot = card.querySelector('[data-study-video-slot]');
  if (!target || !slot) return;
  slot.innerHTML = studyVideoLoadButton(card.dataset.studyVideoTitle, target.stamp);
  card.classList.remove('is-loaded');
  card.querySelector('[data-study-video-close]').hidden = true;
  card.querySelector('[data-study-video-status]').textContent = 'Player fechado.';
  if (focus) slot.querySelector('button').focus({preventScroll:true});
}

/** Optional capture-phase toggle hook: stop playback when a containing details closes. */
export function closeStudyVideosWithin(container) {
  container?.querySelectorAll?.('[data-study-video].is-loaded').forEach(card => resetStudyVideo(card, false));
}

/** Call at the start of the existing delegated click listener. Returns true if handled. */
export function handleStudyVideoClick(event, root = document.querySelector('#main')) {
  const button = event.target?.closest?.('[data-study-video-load], [data-study-video-close]');
  if (!button || !root?.contains(button)) return false;
  const card = button.closest('[data-study-video]');
  if (!card) return false;
  event.preventDefault();
  // Do not stopPropagation: unrelated delegated routers simply ignore these data attributes.
  if (button.hasAttribute('data-study-video-close')) {
    resetStudyVideo(card, true);
    return true;
  }
  const target = studyVideoTarget(card.dataset.studyVideoUrl);
  if (!target) return true;
  // One loaded contextual player at a time, avoiding overlapping audio.
  root.querySelectorAll('[data-study-video].is-loaded').forEach(other => {
    if (other !== card) resetStudyVideo(other, false);
  });
  const iframe = document.createElement('iframe');
  const params = new URLSearchParams({start:String(target.start), autoplay:'0', playsinline:'1', rel:'0'});
  iframe.src = `https://www.youtube-nocookie.com/embed/${target.id}?${params}`;
  iframe.title = `YouTube: ${card.dataset.studyVideoTitle} — a partir de ${target.stamp}`;
  iframe.loading = 'eager'; // It has already been explicitly requested; this is not eager page load.
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.allow = 'encrypted-media; picture-in-picture; fullscreen';
  iframe.allowFullscreen = true;
  iframe.tabIndex = 0;
  card.querySelector('[data-study-video-slot]').replaceChildren(iframe);
  card.classList.add('is-loaded');
  card.querySelector('[data-study-video-close]').hidden = false;
  card.querySelector('[data-study-video-status]').textContent = 'Player incorporado. Use os controles para reproduzir; se não abrir, use o link do YouTube.';
  // Focus the browsing context as part of this user gesture, never from a delayed load event.
  iframe.focus({preventScroll:true});
  return true;
}

/** Motion belongs to navigation and diagrams; reading remains static. */
export function installStudio(){
  const main=document.querySelector('#main'), toggle=document.querySelector('#motion-toggle');
  if(!main||!toggle)return;
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused=false,frame=0,lastMotionKey='';
  try{paused=localStorage.getItem('nuarch-motion')==='paused';}catch{}
  const seen=new WeakSet(), animations=new Set(), svgStates=new Map();
  const reduced=()=>preference.matches||paused;
  const syncSVG=(svg,visible)=>{if(!svg.isConnected||typeof svg.pauseAnimations!=='function')return;try{if(reduced()||document.hidden||!visible)svg.pauseAnimations();else svg.unpauseAnimations();}catch{}};
  const svgObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries){svgStates.set(entry.target,entry.isIntersecting);syncSVG(entry.target,entry.isIntersecting);}},{rootMargin:'80px'}):null;
  const syncControls=()=>{
    document.body.classList.toggle('motion-paused',reduced());
    toggle.setAttribute('aria-pressed',String(reduced()));
    toggle.setAttribute('aria-label',preference.matches?'Movimentos reduzidos pelo sistema':paused?'Ativar animações':'Pausar animações');
    toggle.title=toggle.getAttribute('aria-label');
    toggle.disabled=preference.matches;
    for(const [svg,visible] of svgStates)syncSVG(svg,visible);
    if(reduced()){for(const animation of animations)animation.finish();animations.clear();}
  };
  toggle.addEventListener('click',()=>{paused=!paused;try{localStorage.setItem('nuarch-motion',paused?'paused':'active');}catch{}syncControls();});
  preference.addEventListener('change',syncControls);
  document.addEventListener('visibilitychange',()=>{for(const [svg,visible] of svgStates)syncSVG(svg,visible);});
  function refresh(){
    frame=0;
    for(const [svg] of svgStates)if(!svg.isConnected){svgObserver?.unobserve(svg);svgStates.delete(svg);}
    main.querySelectorAll('svg').forEach(svg=>{if(svg.querySelector('animateMotion,animateTransform')&&!svgStates.has(svg)){svgStates.set(svg,false);if(svgObserver)svgObserver.observe(svg);else svgStates.set(svg,true);syncSVG(svg,svgStates.get(svg));}});
    const candidates=main.querySelectorAll('.study-hero,.pb-hero,.page-title,.detail-header');
    const routeKey=(location.hash||'#home').split('?')[0]+'|'+(new URLSearchParams(location.hash.split('?')[1]).get('view')||'');
    const enterRoute=candidates.length>0&&lastMotionKey!==routeKey;
    if(candidates.length)lastMotionKey=routeKey;
    let count=0;
    for(const el of candidates){if(seen.has(el))continue;seen.add(el);const bounds=el.getBoundingClientRect();if(!enterRoute||reduced()||count>=3||bounds.bottom<0||bounds.top>innerHeight||!el.animate)continue;
      const animation=el.animate([{opacity:.55,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:360,easing:'cubic-bezier(.22,1,.36,1)'});animations.add(animation);animation.onfinish=()=>animations.delete(animation);count++;
    }
    updateProgress();
  }
  const observer=new MutationObserver(records=>{if(frame)return;if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1)))frame=requestAnimationFrame(refresh);});
  observer.observe(main,{childList:true,subtree:true});
  main.addEventListener('click',event=>handleStudyVideoClick(event,main));
  main.addEventListener('toggle',event=>{if(event.target.tagName==='DETAILS'&&!event.target.open)closeStudyVideosWithin(event.target);},true);
  let scrollFrame=0;
  function updateProgress(){const height=document.documentElement.scrollHeight-innerHeight;document.documentElement.style.setProperty('--studio-progress',String(height>0?Math.min(1,Math.max(0,scrollY/height)):0));}
  window.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;updateProgress();});},{passive:true});
  window.addEventListener('resize',updateProgress,{passive:true});
  syncControls();refresh();
}
