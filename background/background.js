// Background service worker: fetch dict.cn and parse it. Content scripts cannot
// fetch dict.cn directly (no CORS headers), so all network work lives here.

import { parseDictCn } from "./dict_parser.js";

const cache = new Map(); // word -> entry (null when dict.cn has no such word)

async function lookup(word) {
  const key = word.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const response = await fetch(`https://dict.cn/${encodeURIComponent(word)}`, {
    headers: { "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8" },
  });
  if (!response.ok) throw new Error(`dict.cn HTTP ${response.status}`);

  const entry = parseDictCn(await response.text());
  cache.set(key, entry); // cache misses (null) too, so a typo isn't refetched
  return entry;
}

// Response: { entry } on success (entry null = no such word), or
// { entry: null, error } when the lookup failed and is worth retrying.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action !== "lookup_word") return;
  lookup(message.word)
    .then((entry) => sendResponse({ entry }))
    .catch((error) => sendResponse({ entry: null, error: String(error?.message || error) }));
  return true; // async response
});

async function isEnabled() {
  const { word_lookup_enabled: enabled = true } = await chrome.storage.local.get("word_lookup_enabled");
  return enabled;
}

// Toolbar icon toggles 取词 on/off (the card's "关闭取词" writes the same flag).
async function refreshBadge() {
  chrome.action.setBadgeBackgroundColor({ color: "#9aa0a6" });
  chrome.action.setBadgeText({ text: (await isEnabled()) ? "" : "OFF" });
}

chrome.runtime.onInstalled.addListener(refreshBadge);
chrome.runtime.onStartup.addListener(refreshBadge);
chrome.action.onClicked.addListener(async () => {
  await chrome.storage.local.set({ word_lookup_enabled: !(await isEnabled()) });
  refreshBadge();
});
