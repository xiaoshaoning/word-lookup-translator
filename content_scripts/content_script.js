// Content script: hover an English word -> Bing-style card (headword + IPA +
// Chinese definitions), with a word-level highlight and a 关闭取词 toggle.
// Dictionary data comes from dict.cn via the background worker.

(() => {
  const HOVER_DELAY_MS = 250;
  const HIDE_DELAY_MS = 200;
  const HIGHLIGHT_NAME = "word-lookup";
  const WORD_CHAR = /[A-Za-z'-]/;
  const WORD_RE = /^[A-Za-z][A-Za-z'-]*[A-Za-z]$/;

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

    const word = text.slice(start, end + 1);
    if (!WORD_RE.test(word)) return null;

    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end + 1);
    return { word, range };
  }

  // --- rendering ---
  function render(data) {
    ui.word.textContent = data.headword;

    const ipa = data.pronunciations.map((p) => `${p.label} [${p.ipa}]`).join("  ");
    ui.ipa.textContent = ipa;
    ui.ipa.hidden = !ipa;

    ui.defs.replaceChildren();
    if (!data.basicTranslations.length) {
      ui.defs.append(definitionRow("wl-def wl-empty", "", "未找到释义"));
      return;
    }
    for (const item of data.basicTranslations) {
      ui.defs.append(definitionRow("wl-def", item.pos, item.meanings));
    }
  }

  function definitionRow(className, pos, meanings) {
    const row = document.createElement("div");
    row.className = className;
    if (pos) {
      const span = document.createElement("span");
      span.className = "wl-pos";
      span.textContent = pos;
      row.append(span, " ");
    }
    row.append(meanings); // text node, never innerHTML
    return row;
  }

  function place(range) {
    const rect = range.getBoundingClientRect();
    const gap = 6;
    const el = ui.el;
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

  function show(data, range) {
    render(data);
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
  function lookup(word) {
    const key = word.toLowerCase();
    if (cache.has(key)) return Promise.resolve(cache.get(key));

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "lookup_word", word }, (response) => {
        const data = !chrome.runtime.lastError && response?.ok ? response.data : null;
        cache.set(key, data);
        resolve(data);
      });
    });
  }

  async function trigger(word, range) {
    activeWord = word;
    highlight(range);
    const data = await lookup(word);
    if (activeWord !== word) return; // pointer moved on while fetching
    show(data || { headword: word, pronunciations: [], basicTranslations: [] }, range);
  }

  // --- events ---
  function onMove(event) {
    if (!enabled) return;
    if (ui.el.contains(event.target)) return; // keep the card open while pointing at it

    const hit = wordAtPoint(event.clientX, event.clientY);
    if (!hit) {
      scheduleHide();
      return;
    }
    if (hit.word === activeWord) {
      clearTimeout(hideTimer);
      return;
    }

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
