import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  closeStudyVideosWithin,
  handleStudyVideoClick,
  renderStudyVideo,
  studyVideoTarget,
} from '../src/ui/studio.mjs';

const VIDEO_ID = 'YaNeSFOVNCE';
const WATCH_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

test('video URLs normalize approved origins and preserve a requested start time', () => {
  const examples = [
    [WATCH_URL, 0, '0:00'],
    [`${WATCH_URL}&t=67s`, 67, '1:07'],
    [`https://youtu.be/${VIDEO_ID}?t=1m7s`, 67, '1:07'],
    [`https://m.youtube.com/watch?v=${VIDEO_ID}&t=1h2m3s`, 3723, '1:02:03'],
    [`https://youtube.com/watch?v=${VIDEO_ID}&start=327`, 327, '5:27'],
  ];

  for (const [url, seconds, stamp] of examples) {
    assert.deepEqual(studyVideoTarget(url), {
      id: VIDEO_ID,
      start: seconds,
      watch: `${WATCH_URL}${seconds ? `&t=${seconds}s` : ''}`,
      stamp,
    });
  }
});

test('untrusted URLs cannot select another origin, credentials, port or script scheme', () => {
  const rejected = [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    `http://www.youtube.com/watch?v=${VIDEO_ID}`,
    `//www.youtube.com/watch?v=${VIDEO_ID}`,
    `https://www.youtube.com.attacker.test/watch?v=${VIDEO_ID}`,
    `https://youtube.com@attacker.test/watch?v=${VIDEO_ID}`,
    `https://attacker.test@www.youtube.com/watch?v=${VIDEO_ID}`,
    `https://user:password@www.youtube.com/watch?v=${VIDEO_ID}`,
    `https://www.youtube.com:8443/watch?v=${VIDEO_ID}`,
    `https://www.youtube.com/redirect?v=${VIDEO_ID}`,
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/watch?v=%22%3E%3Cscript%3E',
    `https://youtu.be/${VIDEO_ID}/another-path`,
    'not a URL',
    undefined,
  ];

  for (const url of rejected) {
    assert.equal(studyVideoTarget(url), null, String(url));
    assert.equal(renderStudyVideo(url, 'Vídeo'), '', String(url));
  }
});

test('invalid or excessive timestamps fail closed instead of entering an embed URL', () => {
  for (const start of [
    '-1',
    '1.5',
    'NaN',
    'Infinity',
    '9007199254740993',
    '86401',
    '25h',
    '67s<script>',
  ]) {
    assert.equal(studyVideoTarget(`${WATCH_URL}&t=${encodeURIComponent(start)}`), null, start);
  }
});

test('the initial facade has an accessible load action and external fallback, but no remote media', () => {
  const html = renderStudyVideo(`${WATCH_URL}&t=67s`, 'Estudo de arquitetura', 'Síntese externa.');
  assert.match(html, /<button\b[^>]*data-study-video-load/);
  assert.match(
    html,
    /aria-label="Carregar player do YouTube: Estudo de arquitetura, a partir de 1:07"/,
  );
  assert.match(html, /href="https:\/\/www\.youtube\.com\/watch\?v=YaNeSFOVNCE&amp;t=67s"/);
  assert.match(html, /target="_blank" rel="noopener"/);
  assert.match(html, /data-study-video-close hidden/);
  assert.doesNotMatch(html, /<(?:iframe|img|script|video|audio|link)\b/i);
  assert.doesNotMatch(html, /\bsrc\s*=/i);
  assert.doesNotMatch(html, /youtube-nocookie|ytimg\.com/);
});

test('titles and evidence notes stay text even when they contain HTML or attribute delimiters', () => {
  const title = '" autofocus onfocus="alert(1)"><img src=x onerror=alert(1)> & \'título\'';
  const note = '</p><script>alert(1)</script><p>';
  const html = renderStudyVideo(WATCH_URL, title, note);
  assert.doesNotMatch(html, /<img|<script|"\s+autofocus\b/i);
  assert.ok(!html.includes(title));
  assert.ok(!html.includes(note));
  assert.match(html, /&quot; autofocus onfocus=&quot;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /&amp; &#39;título&#39;/);
  assert.match(html, /&lt;\/p&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;&lt;p&gt;/);
});

test('all contextual and reviewed source-video links render and retain their editorial timestamps', () => {
  const playbook = JSON.parse(
    readFileSync(new URL('../data/playbook.json', import.meta.url), 'utf8'),
  );
  const context = playbook.nubankContext.topics.map((topic) => topic.videoEvidence.href);
  const materials = playbook.materials
    .filter((material) => material.type === 'Vídeo')
    .map((material) => material.chapters[0].href);
  const urls = [...context, ...materials];

  // These are the 15 current topic links and four reviewed videos. New entries
  // are checked automatically; the test does not pin the catalogue's total size.
  assert.ok(context.length > 0, 'the contextual-video fixture must not be empty');
  assert.ok(materials.length > 0, 'the reviewed-video fixture must not be empty');
  const seenIds = new Set();
  for (const href of urls) {
    const original = new URL(href);
    const target = studyVideoTarget(href);
    assert.ok(target, href);
    seenIds.add(target.id);
    assert.equal(target.id, original.searchParams.get('v'), href);
    const editorialTime = original.searchParams.get('t') || '0s';
    assert.match(editorialTime, /^\d+s$/, 'editorial links declare an integer number of seconds');
    assert.equal(target.start, Number.parseInt(editorialTime, 10), href);
    assert.ok(renderStudyVideo(href, 'Trecho revisado').includes('data-study-video-load'), href);
  }
  for (const id of ['3oeHz3sFKWI', 'YaNeSFOVNCE', '4RJ_GtoHhrs', '2WeFdAXZz30']) {
    assert.ok(seenIds.has(id), `reviewed source ${id} remains linked`);
  }
});

// A small DOM boundary double, not a browser or a simulation of YouTube. It
// observes media insertion/removal and focus so regressions in privacy and
// keyboard behavior can be tested without adding a runtime dependency.
function mediaHarness(t) {
  const cards = [];
  const createdFrames = [];
  let focused = null;
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement(tag) {
        assert.equal(tag, 'iframe');
        const frame = {
          focus() {
            focused = frame;
          },
        };
        createdFrames.push(frame);
        return frame;
      },
    },
  });
  t.after(() => {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else delete globalThis.document;
  });

  function makeCard(url, title = 'Vídeo de estudo') {
    const classes = new Set();
    const card = {
      dataset: { studyVideoUrl: url, studyVideoTitle: title },
      classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
      classes,
      status: { textContent: '' },
      close: { hidden: true },
    };
    function makeButton(kind) {
      return {
        card,
        hasAttribute: (name) => name === `data-study-video-${kind}`,
        closest: (selector) => (selector === '[data-study-video]' ? card : null),
        focus() {
          focused = this;
        },
      };
    }
    card.load = makeButton('load');
    card.closeButton = makeButton('close');
    card.slot = {
      frame: null,
      set innerHTML(html) {
        this.frame = null;
        this.html = html;
        card.load = makeButton('load');
      },
      replaceChildren(frame) {
        this.frame = frame;
      },
      querySelector: (selector) => (selector === 'button' ? card.load : null),
    };
    card.querySelector = (selector) =>
      ({
        '[data-study-video-slot]': card.slot,
        '[data-study-video-close]': card.close,
        '[data-study-video-status]': card.status,
      })[selector] ?? null;
    cards.push(card);
    return card;
  }

  const root = {
    contains: (element) => cards.includes(element.card),
    querySelectorAll: () => cards.filter((card) => card.classes.has('is-loaded')),
  };
  function click(card, kind = 'load') {
    const button = kind === 'load' ? card.load : card.closeButton;
    const event = {
      target: { closest: () => button },
      prevented: false,
      preventDefault() {
        this.prevented = true;
      },
    };
    return { handled: handleStudyVideoClick(event, root), event };
  }
  return {
    makeCard,
    root,
    click,
    createdFrames,
    get focused() {
      return focused;
    },
  };
}

test('an explicit load creates the approved non-autoplay player and focuses its controls', (t) => {
  const harness = mediaHarness(t);
  const card = harness.makeCard(`${WATCH_URL}&t=327s`, 'Contratos e eventos');
  assert.equal(harness.createdFrames.length, 0);
  assert.equal(harness.click(card).handled, true);
  const frame = card.slot.frame;
  const src = new URL(frame.src);
  assert.equal(src.origin, 'https://www.youtube-nocookie.com');
  assert.equal(src.pathname, `/embed/${VIDEO_ID}`);
  assert.equal(src.searchParams.get('start'), '327');
  assert.equal(src.searchParams.get('autoplay'), '0');
  assert.equal(frame.referrerPolicy, 'strict-origin-when-cross-origin');
  assert.doesNotMatch(frame.allow, /autoplay/);
  assert.match(frame.title, /Contratos e eventos/);
  assert.equal(harness.focused, frame);
  assert.equal(card.close.hidden, false);
});

test('opening a second player removes the first; closing restores focus to its new load button', (t) => {
  const harness = mediaHarness(t);
  const first = harness.makeCard(WATCH_URL);
  const second = harness.makeCard('https://www.youtube.com/watch?v=3oeHz3sFKWI&t=67s');
  harness.click(first);
  harness.click(second);
  assert.equal(first.slot.frame, null, 'the old media context is removed');
  assert.equal(first.close.hidden, true);
  assert.equal(harness.focused, second.slot.frame, 'resetting the old card must not steal focus');
  harness.click(second, 'close');
  assert.equal(second.slot.frame, null);
  assert.equal(second.close.hidden, true);
  assert.equal(harness.focused, second.load);
});

test('a closing evidence panel removes its media so audio cannot keep playing invisibly', (t) => {
  const harness = mediaHarness(t);
  const card = harness.makeCard(WATCH_URL);
  harness.click(card);
  closeStudyVideosWithin(harness.root);
  assert.equal(card.slot.frame, null);
  assert.equal(card.close.hidden, true);
  assert.equal(harness.root.querySelectorAll().length, 0);
});

test('delegated clicks outside the root and tampered URLs cannot create a player', (t) => {
  const harness = mediaHarness(t);
  const outsideEvent = {
    target: { closest: () => ({ card: {} }) },
    preventDefault() {
      assert.fail('unrelated clicks must not be consumed');
    },
  };
  assert.equal(handleStudyVideoClick(outsideEvent, harness.root), false);
  const card = harness.makeCard('https://attacker.test/watch?v=YaNeSFOVNCE');
  harness.click(card);
  assert.equal(card.slot.frame, null);
  assert.equal(harness.createdFrames.length, 0);
});
