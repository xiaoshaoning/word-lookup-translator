// Content script: hover an English word -> Bing-style card (headword + IPA +
// Chinese definitions), with a word-level highlight and a 关闭取词 toggle.
// Dictionary data comes from dict.cn via the background worker.

(() => {
  const HOVER_DELAY_MS = 250;
  const HIDE_DELAY_MS = 200;
  const HIGHLIGHT_NAME = "word-lookup";
  // Pages inject invisible characters inside words (soft hyphen, zero-width
  // joiners) and use curly apostrophes; left as-is they 404 a dict.cn lookup.
  const WORD_CHAR = /[A-Za-z'\u2019\u00AD\u200B-\u200D\uFEFF-]/;
  const WORD_RE = /^[A-Za-z][A-Za-z'-]*[A-Za-z]$/;
  const INVISIBLE = /[\u00AD\u200B-\u200D\uFEFF]/g;
  const CURLY_APOSTROPHE = /[\u2018\u2019]/g;

  let enabled = true;
  let hoverTimer = null;
  let hideTimer = null;
  let activeWord = null;
  const cache = new Map();

  const ui = buildTooltip();

  function buildTooltip() {
    const el = document.createElement("div");
    el.className = "word_lookup_tooltip";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div class="wl-head"><span class="wl-word"></span><span class="wl-ipa"></span></div>' +
      '<div class="wl-defs"></div>' +
      '<div class="wl-foot"><button type="button" class="wl-close">关闭取词<span class="wl-hint">（点扩展图标重开）</span></button></div>';
    el.querySelector(".wl-close").addEventListener("click", () => setEnabled(false));
    el.addEventListener("mouseenter", () => clearTimeout(hideTimer));
    el.addEventListener("mouseleave", scheduleHide);
    document.body.appendChild(el);
    return {
      el,
      word: el.querySelector(".wl-word"),
      ipa: el.querySelector(".wl-ipa"),
      defs: el.querySelector(".wl-defs"),
    };
  }

  function setEnabled(value) {
    enabled = value;
    if (!enabled) hide();
  }

  // --- highlight: CSS Custom Highlight API, so the page DOM is never mutated ---
  function highlight(range) {
    if (window.Highlight && CSS.highlights) {
      CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(range));
    }
  }

  function unhighlight() {
    if (CSS.highlights) CSS.highlights.delete(HIGHLIGHT_NAME);
  }

  // --- word under the pointer ---
  function wordAtPoint(x, y) {
    const caret = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
    const node = caret?.startContainer;
    if (!node || node.nodeType !== Node.TEXT_NODE) return null;

    const parent = node.parentElement;
    if (!parent || parent.isContentEditable) return null;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(parent.tagName)) return null;

    const text = node.data;
    let i = Math.min(caret.startOffset, text.length - 1);
    if (i < 0) return null;
    if (!WORD_CHAR.test(text[i])) {
      if (i > 0 && WORD_CHAR.test(text[i - 1])) i -= 1;
      else return null;
    }

    let start = i;
    let end = i;
    while (start > 0 && WORD_CHAR.test(text[start - 1])) start -= 1;
    while (end < text.length - 1 && WORD_CHAR.test(text[end + 1])) end += 1;

    const word = text.slice(start, end + 1).replace(INVISIBLE, "").replace(CURLY_APOSTROPHE, "'");
    if (!WORD_RE.test(word)) return null;

    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end + 1); // highlight the raw token, invisible chars included

    // caretRangeFromPoint returns the *nearest* caret even when the pointer is in
    // blank space (right of a line, below a paragraph, in the gap between words),
    // so require the pointer to actually be on the word before looking it up.
    const rect = range.getBoundingClientRect();
    const hitPad = 2;
    if (
      rect.width === 0 ||
      x < rect.left - hitPad ||
      x > rect.right + hitPad ||
      y < rect.top - hitPad ||
      y > rect.bottom + hitPad
    ) {
      return null;
    }

    return { word, range };
  }

  // --- rendering ---
  function render(word, entry, failed) {
    ui.word.textContent = entry ? entry.headword : word;

    const ipa = entry ? entry.pronunciations.map((p) => `${p.label} [${p.ipa}]`).join("  ") : "";
    ui.ipa.textContent = ipa;
    ui.ipa.hidden = !ipa;

    ui.defs.replaceChildren();
    if (failed) {
      ui.defs.append(messageRow("查询失败，请重试"));
    } else if (!entry || !entry.basicTranslations.length) {
      ui.defs.append(messageRow("未找到释义"));
    } else {
      for (const item of entry.basicTranslations) {
        ui.defs.append(definitionRow(item.pos, item.meanings));
      }
    }
  }

  function definitionRow(pos, meanings) {
    const row = document.createElement("div");
    row.className = "wl-def";
    const posElement = document.createElement("span");
    posElement.className = "wl-pos";
    posElement.textContent = pos;
    row.append(posElement, " ", meanings); // text nodes, never innerHTML
    return row;
  }

  function messageRow(text) {
    const element = document.createElement("div");
    element.className = "wl-empty";
    element.textContent = text;
    return element;
  }

  function place(range) {
    const rect = range.getBoundingClientRect();
    const gap = 6;
    const el = ui.el;
    // Measure from the top-left corner so the shrink-to-fit width is computed
    // against the whole viewport, not a half-off-screen position.
    el.style.left = "0px";
    el.style.top = "0px";
    const size = el.getBoundingClientRect();

    let left = rect.left;
    let top = rect.bottom + gap;
    if (left + size.width > window.innerWidth - 8) left = window.innerWidth - size.width - 8;
    if (left < 8) left = 8;
    if (top + size.height > window.innerHeight - 8) top = rect.top - size.height - gap;
    if (top < 8) top = 8;

    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
  }

  function show(word, range, entry, failed) {
    render(word, entry, failed);
    ui.el.classList.add("wl-visible");
    ui.el.setAttribute("aria-hidden", "false");
    place(range);
  }

  function hide() {
    clearTimeout(hoverTimer);
    clearTimeout(hideTimer);
    ui.el.classList.remove("wl-visible");
    ui.el.setAttribute("aria-hidden", "true");
    unhighlight();
    activeWord = null;
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, HIDE_DELAY_MS);
  }

  // --- lookup through the background worker ---
  // Resolves to { entry, failed }. failed marks a transient error, which is
  // never cached (a null entry, by contrast, means dict.cn has no such word).
  function lookup(word) {
    const key = word.toLowerCase();
    if (cache.has(key)) return Promise.resolve(cache.get(key));

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "lookup_word", word }, (response) => {
        const failed = Boolean(chrome.runtime.lastError) || Boolean(response?.error);
        const result = { entry: failed ? null : response?.entry ?? null, failed };
        if (!failed) cache.set(key, result);
        resolve(result);
      });
    });
  }

  async function trigger(word, range) {
    highlight(range);
    const { entry, failed } = await lookup(word);
    if (activeWord !== word) return; // pointer moved on while fetching
    show(word, range, entry, failed);
  }

  // --- events ---
  function onMove(event) {
    if (!enabled) return;
    if (ui.el.contains(event.target)) return; // keep the card open while pointing at it

    const hit = wordAtPoint(event.clientX, event.clientY);
    if (!hit) {
      activeWord = null; // drop the claim so a stale lookup can't render
      scheduleHide();
      return;
    }
    if (hit.word === activeWord) {
      clearTimeout(hideTimer);
      return;
    }

    // Claim the word now: a lookup for a word the pointer has left must not show.
    activeWord = hit.word;
    clearTimeout(hoverTimer);
    clearTimeout(hideTimer);
    unhighlight();
    hoverTimer = setTimeout(() => trigger(hit.word, hit.range), HOVER_DELAY_MS);
  }

  document.addEventListener("mousemove", onMove, { passive: true });
  document.addEventListener("mouseleave", hide);
  document.addEventListener("scroll", hide, { capture: true, passive: true });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && "word_lookup_enabled" in changes) {
      setEnabled(changes.word_lookup_enabled.newValue !== false);
    }
  });
  chrome.storage.local.get("word_lookup_enabled", (values) => {
    setEnabled(values.word_lookup_enabled !== false);
  });
})();
