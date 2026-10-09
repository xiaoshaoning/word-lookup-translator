// Background service worker: fetch dict.cn and parse it. Content scripts cannot
// fetch dict.cn directly (no CORS headers), so all network work lives here.

import { parseDictCn } from "./dict_parser.js";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const cache = new Map(); // word -> { at, data }

async function lookup(word) {
  const key = word.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const response = await fetch(`https://dict.cn/${encodeURIComponent(word)}`, {
    headers: { "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8" },
  });
  if (!response.ok) throw new Error(`dict.cn HTTP ${response.status}`);

  const data = parseDictCn(await response.text());
  cache.set(key, { at: Date.now(), data }); // cache misses (null) too
  return data;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action !== "lookup_word") return;
  lookup(message.word)
    .then((data) => sendResponse({ ok: data !== null, data }))
    .catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
  return true; // async response
});

// Toolbar icon toggles 取词 on/off (the card's "关闭取词" writes the same flag).
async function refreshBadge() {
  const { word_lookup_enabled: enabled = true } = await chrome.storage.local.get("word_lookup_enabled");
  chrome.action.setBadgeBackgroundColor({ color: "#9aa0a6" });
  chrome.action.setBadgeText({ text: enabled ? "" : "OFF" });
}

chrome.runtime.onInstalled.addListener(refreshBadge);
chrome.runtime.onStartup.addListener(refreshBadge);
chrome.action.onClicked.addListener(async () => {
  const { word_lookup_enabled: enabled = true } = await chrome.storage.local.get("word_lookup_enabled");
  await chrome.storage.local.set({ word_lookup_enabled: !enabled });
  refreshBadge();
});
