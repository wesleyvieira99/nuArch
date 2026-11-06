/** A searchable reading desk connecting handwritten reminders to the interview. */
export function filterFieldnotes(items, { category = '', query = '' } = {}) {
  const normalize = (value) =>
    String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const categories = item.categoryIds || [item.category];
    if (category && !categories.includes(category)) return false;
    if (!words.length) return true;
    // Portable photos contain large data URIs: search the reading, never image bytes.
    const { path, thumb, driveUrl, ...reading } = item;
    const text = normalize(JSON.stringify(reading));
    return words.every((word) => text.includes(word));
  });
}

export function createFieldnotes({ escape: e, sources, isRead, toggleRead, onNavigate }) {
  let data, host, controller;
  let category = '',
    query = '',
    view = 'concepts',
    selected = '',
    openPhoto = '';
  const $ = (selector) => host?.querySelector(selector);
  const arr = (value) => (Array.isArray(value) ? value : value ? [value] : []);
  const prose = (value) =>
    typeof value === 'object' && value !== null
      ? Object.values(value).map(prose).join(' · ')
      : String(value ?? '');
  const bullets = (value) =>
    `<ul>${arr(value)
      .map((line) => `<li>${e(prose(line))}</li>`)
      .join('')}</ul>`;
  const categoryTitle = (id) => data.categories.find((item) => item.id === id)?.title || id;
  const photo = (id) => data.photos.find((item) => item.id === id);
  const address = (id = selected) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (query) params.set('q', query);
    if (view !== 'concepts') params.set('view', view);
    return `#fieldnotes${id ? '/' + encodeURIComponent(id) : ''}${params.size ? '?' + params : ''}`;
  };
  function syncAddress() {
    history.replaceState(null, '', address());
    onNavigate(
      selected,
      data.concepts.find((item) => item.id === selected)?.title || 'Post-its Staff',
    );
  }
  function html(content, id) {
    data = content;
    const params = new URLSearchParams(location.hash.split('?')[1]);
    selected = data.concepts.some((item) => item.id === id) ? id : '';
    category = data.categories.some((item) => item.id === params.get('category'))
      ? params.get('category')
      : '';
    query = params.get('q') || '';
    view = params.get('view') === 'photos' ? 'photos' : 'concepts';
    if (selected) {
      category = '';
      query = '';
      view = 'concepts';
    }
    return `<section id="fieldnotes-root" class="fn-page">${markup()}</section>`;
  }
  function markup() {
    return `<header class="fn-hero"><div><span class="eyebrow">DO SEU MURAL À SUA EXPLICAÇÃO</span><h1>Post-its Staff.<br><span class="gradient-text">Lembre. Conecte. Defenda.</span></h1><p>${e(data.meta.subtitle || 'Suas anotações de estudo, organizadas por decisão: o mecanismo, quando usar e o custo da escolha.')}</p><div class="fn-numbers"><span><b>${data.photos.length}</b> fotos de origem</span><span><b>${data.concepts.length}</b> conceitos conectados</span><span><b>${data.categories.length}</b> temas de consulta</span></div><div class="actions"><a class="button small" href="#playbook">Aplicar no roteiro →</a><a class="button small" href="${e(data.meta.folderUrl)}" target="_blank" rel="noopener">Abrir o acervo no Drive ↗</a></div></div><div class="fn-note-stack" aria-hidden="true"><div class="fn-paper fn-paper-back">A garantia vem<br>antes da tecnologia.</div><div class="fn-paper fn-paper-front"><small>NA HORA DE EXPLICAR</small><strong>Qual problema?<br>Qual garantia?<br>Qual custo?</strong><span>→ E quando eu mudaria de ideia?</span></div></div></header>
    <section class="fn-method" aria-label="Como usar as anotações"><span><b>01</b> Encontre o conceito</span><i aria-hidden="true">→</i><span><b>02</b> Reveja a decisão</span><i aria-hidden="true">→</i><span><b>03</b> Pratique a fala no cenário</span></section>
    <div class="fn-toolbar"><label class="fn-search"><span>Buscar no seu mural</span><input id="fn-search" type="search" value="${e(query)}" placeholder="Idempotência, cache, Kafka, quorum…" autocomplete="off"></label><div class="fn-switch" aria-label="Visualização"><button data-fn-view="concepts" aria-pressed="${view === 'concepts'}">Conceitos & decisões</button><button data-fn-view="photos" aria-pressed="${view === 'photos'}">As ${data.photos.length} fotos</button></div></div>
    <nav class="fn-categories" aria-label="Filtrar por tema"><button data-fn-category="" aria-pressed="${!category}">Todos os temas</button>${data.categories.map((item) => `<button data-fn-category="${e(item.id)}" aria-pressed="${category === item.id}">${e(item.title)}</button>`).join('')}</nav>
    <div class="fn-results-heading"><p id="fn-count" role="status" aria-live="polite">${count()}</p><button class="quiet" data-fn-reset>Limpar filtros</button></div><div id="fn-results">${results()}</div>
    <details class="panel fn-provenance"><summary>Da anotação à explicação: origem e critérios de leitura</summary><p>${e(data.meta.reviewSummary)}</p><p>A foto preserva a anotação original. Os textos de consulta desenvolvem os conceitos e registram ressalvas quando uma frase curta precisa de contexto. Exemplos bancários são exercícios de arquitetura; não descrevem, por si só, a implementação interna do Nubank.</p><a href="#playbook/pix?view=evidence&collection=fieldnotes-2026-11-05">Ver estes materiais no acervo do roteiro →</a></details>
    <dialog id="fn-photo-dialog" class="fn-photo-dialog" aria-labelledby="fn-photo-title"></dialog>`;
  }
  function visible() {
    return filterFieldnotes(view === 'photos' ? data.photos : data.concepts, { category, query });
  }
  function count() {
    const size = visible().length;
    const label =
      view === 'photos'
        ? size === 1
          ? 'foto de origem'
          : 'fotos de origem'
        : size === 1
          ? 'conceito para consultar'
          : 'conceitos para consultar';
    return `${size} ${label}${category ? ' · ' + e(categoryTitle(category)) : ''}`;
  }
  function results() {
    const items = visible();
    if (!items.length)
      return '<div class="empty fn-empty"><h2>Nenhuma anotação encontrada.</h2><p>Tente uma palavra mais curta ou explore todos os temas.</p><button class="button" data-fn-reset>Ver o mural completo</button></div>';
    return view === 'photos'
      ? `<div class="fn-photo-grid">${items.map(photoCard).join('')}</div>`
      : `<div class="fn-concepts">${items.map(conceptCard).join('')}</div>`;
  }
  function photoCard(item) {
    const concepts = (item.conceptIds || [])
      .map((id) => data.concepts.find((concept) => concept.id === id))
      .filter(Boolean);
    const links = (items) =>
      items
        .map(
          (concept) =>
            `<a class="chip" href="#fieldnotes/${e(concept.id)}">${e(concept.title)} →</a>`,
        )
        .join('');
    const remaining = concepts.slice(4);
    return `<article class="fn-photo-card"><button class="fn-photo-preview" data-fn-photo="${e(item.id)}" aria-label="Ampliar ${e(item.title)}"><img src="${e(item.thumb || item.path)}" alt="Anotação manuscrita: ${e(item.title)}" loading="lazy" decoding="async"><span>Ampliar foto ↗</span></button><div><small>${e(item.fileName || item.id)}</small><h2>${e(item.title)}</h2><p>${(item.categoryIds || []).map(categoryTitle).map(e).join(' · ')}</p><div class="actions">${links(concepts.slice(0, 4))}</div>${remaining.length ? `<details class="fn-photo-more"><summary>Mais ${remaining.length} ${remaining.length === 1 ? 'conceito' : 'conceitos'}</summary><div class="actions">${links(remaining)}</div></details>` : ''}</div></article>`;
  }
  function conceptCard(item) {
    const reviewed = isRead(item.id);
    return `<article class="fn-concept" data-fn-concept="${e(item.id)}"><details ${item.id === selected ? 'open' : ''}><summary><span class="fn-concept-head"><small>${e(categoryTitle(item.category))}</small><strong>${e(item.title)}</strong><span>${e(item.summary || item.what)}</span></span><span class="fn-expand" aria-hidden="true">+</span></summary><div class="fn-concept-body"><p class="fn-definition">${e(item.what)}</p><div class="fn-choice-grid"><section><h3>Quando usar</h3>${bullets(item.when)}</section><section><h3>Quando evitar ou simplificar</h3>${bullets(item.whenNot)}</section></div><section class="fn-mechanism"><span class="eyebrow">POR BAIXO DO NOME</span><h3>O mecanismo, passo a passo</h3>${bullets(item.mechanism)}</section><div class="fn-choice-grid"><section><h3>O que eu ganho — e o que pago</h3>${bullets(item.tradeoffs)}</section><section><h3>Alternativas para comparar</h3>${bullets(item.alternatives)}</section></div><section class="fn-banking"><span class="eyebrow">APLICAÇÃO NO EXERCÍCIO BANCÁRIO</span><p>${e(prose(item.bankingExample))}</p></section><blockquote class="fn-interview"><span>COMO EU EXPLICARIA</span><p>“${e(prose(item.interviewPhrase))}”</p></blockquote>${arr(item.corrections).length ? `<aside class="fn-corrections"><h3>Precisão que faz diferença</h3>${bullets(item.corrections)}</aside>` : ''}<div class="actions fn-links">${(item.links || []).map((link) => `<a class="button small" href="${e(link.href)}">${e(link.label)} →</a>`).join('')}</div><section class="fn-origin"><h3>Voltar à anotação de origem</h3><div class="fn-origin-photos">${(
      item.photoIds || []
    )
      .map((id) => {
        const image = photo(id);
        return image
          ? `<button data-fn-photo="${e(id)}"><img src="${e(image.thumb || image.path)}" loading="lazy" alt="${e(image.title)}"><span>${e(image.fileName || image.id)} ↗</span></button>`
          : '';
      })
      .join(
        '',
      )}</div></section>${sources(item.sourceIds || [])}<div class="actions fn-concept-actions"><button class="button small" data-fn-read="${e(item.id)}" aria-pressed="${reviewed}">${reviewed ? '✓ Consigo explicar' : 'Marcar: consigo explicar'}</button><a class="quiet" href="#fieldnotes/${e(item.id)}">Link deste conceito ↗</a></div></div></details></article>`;
  }
  function refreshResults() {
    $('#fn-results').innerHTML = results();
    $('#fn-count').innerHTML = count();
    host
      .querySelectorAll('[data-fn-category]')
      .forEach((button) =>
        button.setAttribute('aria-pressed', String(button.dataset.fnCategory === category)),
      );
    syncAddress();
  }
  function showPhoto(id) {
    const item = photo(id);
    if (!item) return;
    openPhoto = id;
    const index = data.photos.indexOf(item),
      dialog = $('#fn-photo-dialog');
    dialog.innerHTML = `<header><div><small>${index + 1} / ${data.photos.length} · ${e(item.fileName || item.id)}</small><h2 id="fn-photo-title">${e(item.title)}</h2></div><button class="icon-button" data-fn-close aria-label="Fechar foto">×</button></header><div class="fn-photo-stage"><img src="${e(item.path)}" alt="Foto original das anotações sobre ${e(item.title)}"></div><div class="fn-photo-notes"><p>${e(item.reviewStatus)}</p>${item.transcription ? `<details><summary>Leitura organizada da anotação</summary><p class="fn-transcription">${e(prose(item.transcription))}</p></details>` : ''}${arr(item.notes).length ? bullets(item.notes) : ''}<div class="actions"><button class="button small" data-fn-prev ${index === 0 ? 'disabled' : ''}>← Anterior</button><button class="button small" data-fn-next ${index === data.photos.length - 1 ? 'disabled' : ''}>Próxima →</button><button class="button small" data-fn-zoom aria-pressed="false">Ampliar para ler</button><a class="button small" href="${e(item.path)}" ${item.path.startsWith('data:') ? `download="${e(item.id)}.webp"` : 'target="_blank" rel="noopener"'}>${item.path.startsWith('data:') ? 'Baixar imagem ↧' : 'Abrir imagem ↗'}</a>${item.driveUrl ? `<a class="button small" href="${e(item.driveUrl)}" target="_blank" rel="noopener">Original no Drive ↗</a>` : ''}</div></div>`;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    $('[data-fn-close]').focus({ preventScroll: true });
  }
  function bind() {
    host = document.getElementById('fieldnotes-root');
    controller = new AbortController();
    host.addEventListener(
      'input',
      (event) => {
        if (event.target.id !== 'fn-search') return;
        query = event.target.value;
        selected = '';
        refreshResults();
      },
      { signal: controller.signal },
    );
    host.addEventListener(
      'click',
      (event) => {
        const target = event.target.closest('button');
        if (!target) return;
        if (target.hasAttribute('data-fn-category')) {
          category = target.dataset.fnCategory;
          selected = '';
          refreshResults();
        }
        if (target.hasAttribute('data-fn-view')) {
          view = target.dataset.fnView;
          selected = '';
          syncAddress();
          host.innerHTML = markup();
          $(`[data-fn-view="${view}"]`).focus({ preventScroll: true });
        }
        if (target.hasAttribute('data-fn-reset')) {
          category = '';
          query = '';
          selected = '';
          $('#fn-search').value = '';
          refreshResults();
        }
        if (target.hasAttribute('data-fn-read')) {
          const id = target.dataset.fnRead;
          toggleRead(id);
          target.setAttribute('aria-pressed', String(isRead(id)));
          target.textContent = isRead(id) ? '✓ Consigo explicar' : 'Marcar: consigo explicar';
        }
        if (target.hasAttribute('data-fn-photo')) showPhoto(target.dataset.fnPhoto);
        if (target.hasAttribute('data-fn-close')) $('#fn-photo-dialog').close();
        if (target.hasAttribute('data-fn-zoom')) {
          const zoomed = $('.fn-photo-stage').classList.toggle('is-zoomed');
          target.setAttribute('aria-pressed', String(zoomed));
          target.textContent = zoomed ? 'Ajustar à janela' : 'Ampliar para ler';
        }
        if (target.hasAttribute('data-fn-prev') || target.hasAttribute('data-fn-next')) {
          const offset = target.hasAttribute('data-fn-prev') ? -1 : 1;
          showPhoto(
            data.photos[data.photos.findIndex((item) => item.id === openPhoto) + offset]?.id,
          );
        }
      },
      { signal: controller.signal },
    );
    if (selected) {
      const element = host.querySelector(`[data-fn-concept="${CSS.escape(selected)}"]`);
      requestAnimationFrame(() => {
        if (!element?.isConnected) return;
        element.scrollIntoView({ block: 'start' });
        element.querySelector('summary').focus({ preventScroll: true });
      });
    }
  }
  function destroy() {
    controller?.abort();
    $('#fn-photo-dialog')?.close();
    host = null;
  }
  return { html, bind, destroy };
}
