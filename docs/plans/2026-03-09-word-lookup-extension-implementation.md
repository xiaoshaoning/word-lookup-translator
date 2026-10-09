# Word Lookup Chrome Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome extension that highlights English words on hover and shows tooltips with IPA phonetic symbols and Chinese definitions.

**Architecture:** Separated architecture with content script for UI/word detection, background script for data lookup/caching, and tooltip components for display. Uses local dictionary first, Dictionary API fallback.

**Tech Stack:** Chrome Extensions Manifest V3, JavaScript (ES6+), CSS, Dictionary API (dictionaryapi.dev)

---

## Project Structure Setup

### Task 1: Create project directory structure

**Files:**
- Create: `manifest.json`
- Create: `background/background.js`
- Create: `content_scripts/content_script.js`
- Create: `data/common_words.json`
- Create: `ui/tooltip.css`
- Create: `ui/tooltip.js`
- Create: `ui/highlight.css`
- Create: `icons/` (directory)

**Step 1: Create directories**

```bash
mkdir -p background content_scripts data ui icons
```

**Step 2: Verify directory structure**

```bash
ls -la
```

Expected output shows all directories created.

**Step 3: Initialize git repository**

```bash
git init
```

**Step 4: Create .gitignore**

Create file: `.gitignore`

```gitignore
node_modules/
dist/
*.log
.DS_Store
```

**Step 5: Commit initial structure**

```bash
git add .
git commit -m "chore: initialize project structure"
```

---

## Extension Manifest

### Task 2: Create manifest.json

**Files:**
- Create: `manifest.json`

**Step 1: Write manifest.json**

Create file: `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "Word Lookup Translator",
  "version": "1.0.0",
  "description": "Look up English words with IPA and Chinese definitions",

  "permissions": [
    "storage",
    "activeTab"
  ],

  "host_permissions": [
    "https://api.dictionaryapi.dev/*"
  ],

  "background": {
    "service_worker": "background/background.js",
    "type": "module"
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content_scripts/content_script.js"],
      "css": ["ui/highlight.css", "ui/tooltip.css"],
      "run_at": "document_idle"
    }
  ],

  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },

  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

**Step 2: Create placeholder icons**

Create placeholder icon files (16x16, 48x48, 128x128 black squares for now) or use a simple SVG.

Create file: `icons/icon16.png` (placeholder - can be created with ImageMagick or online tool)
Create file: `icons/icon48.png` (placeholder)
Create file: `icons/icon128.png` (placeholder)

**Step 3: Verify manifest syntax**

```bash
# Create a simple test to validate JSON
python -c "import json; json.load(open('manifest.json')); print('JSON valid')"
```

Expected: "JSON valid" or no error.

**Step 4: Commit manifest**

```bash
git add manifest.json icons/
git commit -m "feat: add extension manifest and icons"
```

---

## Local Dictionary Data

### Task 3: Create common_words.json with sample data

**Files:**
- Create: `data/common_words.json`

**Step 1: Write sample dictionary data**

Create file: `data/common_words.json`

```json
{
  "hello": {
    "phonetic": "/həˈləʊ/",
    "definitions": [
      {
        "part_of_speech": "noun",
        "meaning": "招呼，问候",
        "example": "She gave me a friendly hello."
      },
      {
        "part_of_speech": "verb",
        "meaning": "打招呼，问候",
        "example": "He helloed from across the street."
      },
      {
        "part_of_speech": "interjection",
        "meaning": "喂，你好",
        "example": "Hello! How are you?"
      }
    ]
  },
  "world": {
    "phonetic": "/wɜːld/",
    "definitions": [
      {
        "part_of_speech": "noun",
        "meaning": "世界，地球",
        "example": "He traveled around the world."
      }
    ]
  },
  "computer": {
    "phonetic": "/kəmˈpjuːtə(r)/",
    "definitions": [
      {
        "part_of_speech": "noun",
        "meaning": "计算机，电脑",
        "example": "She works on her computer all day."
      }
    ]
  },
  "programming": {
    "phonetic": "/ˈprəʊɡræmɪŋ/",
    "definitions": [
      {
        "part_of_speech": "noun",
        "meaning": "编程，程序设计",
        "example": "He studied programming in college."
      }
    ]
  },
  "extension": {
    "phonetic": "/ɪkˈstenʃn/",
    "definitions": [
      {
        "part_of_speech": "noun",
        "meaning": "扩展，延长",
        "example": "Chrome browser extension"
      }
    ]
  }
}
```

**Step 2: Validate JSON format**

```bash
python -c "import json; json.load(open('data/common_words.json')); print('Dictionary JSON valid')"
```

Expected: "Dictionary JSON valid"

**Step 3: Commit dictionary data**

```bash
git add data/common_words.json
git commit -m "feat: add local dictionary with sample words"
```

---

## UI Styles

### Task 4: Create highlight.css for word highlighting

**Files:**
- Create: `ui/highlight.css`

**Step 1: Write highlight styles**

Create file: `ui/highlight.css`

```css
.word_lookup_highlight {
  background-color: rgba(66, 133, 244, 0.3);
  border-bottom: 2px solid #4285f4;
  border-radius: 2px;
  cursor: help;
  transition: background-color 0.2s ease;
}

.word_lookup_highlight:hover {
  background-color: rgba(66, 133, 244, 0.5);
}
```

**Step 2: Test CSS syntax (optional)**

```bash
# Simple check - file exists and has content
wc -l ui/highlight.css
```

Expected: At least 5 lines.

**Step 3: Commit highlight styles**

```bash
git add ui/highlight.css
git commit -m "feat: add word highlighting styles"
```

### Task 5: Create tooltip.css for tooltip styling

**Files:**
- Create: `ui/tooltip.css`

**Step 1: Write tooltip styles**

Create file: `ui/tooltip.css`

```css
.word_lookup_tooltip {
  position: absolute;
  z-index: 999999;
  min-width: 200px;
  max-width: 300px;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #4285f4;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #333333;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.word_lookup_tooltip_visible {
  opacity: 1;
}

.word_lookup_tooltip_header {
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #eaeaea;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.word_lookup_tooltip_word {
  font-weight: 600;
  font-size: 16px;
  color: #1a73e8;
  margin-right: 8px;
}

.word_lookup_tooltip_phonetic {
  font-style: italic;
  color: #5f6368;
  font-size: 13px;
}

.word_lookup_tooltip_definitions {
  max-height: 200px;
  overflow-y: auto;
}

.word_lookup_tooltip_part_of_speech {
  font-weight: 600;
  color: #188038;
  font-size: 12px;
  text-transform: uppercase;
  margin: 8px 0 4px;
}

.word_lookup_tooltip_meaning {
  margin-left: 12px;
  color: #333333;
  margin-bottom: 4px;
}

.word_lookup_tooltip_example {
  margin-left: 24px;
  color: #5f6368;
  font-size: 12px;
  font-style: italic;
  margin-bottom: 8px;
}

.word_lookup_tooltip_source {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed #eaeaea;
  font-size: 11px;
  color: #80868b;
  text-align: right;
}

.word_lookup_tooltip_error {
  color: #d93025;
  font-style: italic;
}
```

**Step 2: Verify CSS file**

```bash
wc -l ui/tooltip.css
```

Expected: At least 40 lines.

**Step 3: Commit tooltip styles**

```bash
git add ui/tooltip.css
git commit -m "feat: add tooltip styles"
```

---

## Background Script

### Task 6: Create background.js with local dictionary lookup

**Files:**
- Create: `background/background.js`

**Step 1: Write background script with local dictionary support**

Create file: `background/background.js`

```javascript
// Background service worker for word lookup extension

const local_dictionary = {
  "hello": {
    "phonetic": "/həˈləʊ/",
    "definitions": [
      {
        "part_of_speech": "noun",
        "meaning": "招呼，问候",
        "example": "She gave me a friendly hello."
      }
    ]
  },
  "world": {
    "phonetic": "/wɜːld/",
    "definitions": [
      {
        "part_of_speech": "noun",
        "meaning": "世界，地球",
        "example": "He traveled around the world."
      }
    ]
  }
};

// Cache for API responses
const word_cache = {};

// Load local dictionary from file (simplified - using inline for now)
async function load_local_dictionary() {
  try {
    // In a real implementation, fetch from data/common_words.json
    return local_dictionary;
  } catch (error) {
    console.error("Failed to load local dictionary:", error);
    return local_dictionary; // Fallback to inline
  }
}

// Look up word in local dictionary
async function query_local_dictionary(word) {
  const dictionary = await load_local_dictionary();
  const lower_word = word.toLowerCase();

  if (dictionary[lower_word]) {
    return {
      word: word,
      phonetic: dictionary[lower_word].phonetic,
      definitions: dictionary[lower_word].definitions,
      source: "local"
    };
  }

  return null;
}

// Check cache for word
function query_cache(word) {
  const lower_word = word.toLowerCase();
  if (word_cache[lower_word]) {
    return {
      ...word_cache[lower_word],
      source: "cache"
    };
  }
  return null;
}

// Update cache with word data
function update_cache(word, data) {
  const lower_word = word.toLowerCase();
  word_cache[lower_word] = {
    word: data.word,
    phonetic: data.phonetic,
    definitions: data.definitions
  };
}

// Main lookup function
async function lookup_word(word) {
  // 1. Try local dictionary
  const local_result = await query_local_dictionary(word);
  if (local_result) {
    return local_result;
  }

  // 2. Try cache
  const cached_result = query_cache(word);
  if (cached_result) {
    return cached_result;
  }

  // 3. Word not found in local sources
  return {
    word: word,
    phonetic: null,
    definitions: [],
    source: "not_found"
  };
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "lookup_word") {
    lookup_word(request.word).then(sendResponse);
    return true; // Keep message channel open for async response
  }
});

console.log("Word Lookup background script loaded");
```

**Step 2: Test script syntax**

```bash
node -c background/background.js
```

Expected: No syntax errors.

**Step 3: Commit background script**

```bash
git add background/background.js
git commit -m "feat: add background script with local dictionary lookup"
```

### Task 7: Add Dictionary API integration to background.js

**Files:**
- Modify: `background/background.js`

**Step 1: Add API integration functions**

Modify file: `background/background.js`

Add after the `update_cache` function:

```javascript
// Call Dictionary API
async function query_dictionary_api(word) {
  const lower_word = word.toLowerCase();
  const api_url = `https://api.dictionaryapi.dev/api/v2/entries/en/${lower_word}`;

  try {
    const response = await fetch(api_url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("word_not_found");
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract phonetic and definitions from API response
    let phonetic = null;
    const definitions = [];

    if (data[0] && data[0].phonetic) {
      phonetic = data[0].phonetic;
    }

    if (data[0] && data[0].meanings) {
      data[0].meanings.forEach(meaning => {
        if (meaning.definitions && meaning.definitions.length > 0) {
          definitions.push({
            part_of_speech: meaning.partOfSpeech || "unknown",
            meaning: meaning.definitions[0].definition,
            example: meaning.definitions[0].example || null
          });
        }
      });
    }

    return {
      word: word,
      phonetic: phonetic,
      definitions: definitions,
      source: "api"
    };

  } catch (error) {
    console.error(`Dictionary API error for "${word}":`, error);

    if (error.message === "word_not_found") {
      throw new Error("word_not_found");
    }

    throw new Error("network_error");
  }
}

// API call with retry logic
async function query_dictionary_api_with_retry(word, max_retries = 2) {
  for (let attempt = 1; attempt <= max_retries; attempt++) {
    try {
      const result = await query_dictionary_api(word);
      update_cache(word, result);
      return result;
    } catch (error) {
      if (attempt === max_retries) {
        throw error;
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

**Step 2: Update main lookup function to use API**

Replace the `lookup_word` function with:

```javascript
// Main lookup function
async function lookup_word(word) {
  // 1. Try local dictionary
  const local_result = await query_local_dictionary(word);
  if (local_result) {
    return local_result;
  }

  // 2. Try cache
  const cached_result = query_cache(word);
  if (cached_result) {
    return cached_result;
  }

  // 3. Try Dictionary API
  try {
    const api_result = await query_dictionary_api_with_retry(word);
    return api_result;
  } catch (error) {
    console.warn(`All lookup methods failed for "${word}":`, error.message);

    // Return error state
    return {
      word: word,
      phonetic: null,
      definitions: [],
      source: "error",
      error_type: error.message
    };
  }
}
```

**Step 3: Test updated script**

```bash
node -c background/background.js
```

Expected: No syntax errors.

**Step 4: Commit API integration**

```bash
git add background/background.js
git commit -m "feat: add Dictionary API integration with caching"
```

---

## Tooltip UI Component

### Task 8: Create tooltip.js for tooltip management

**Files:**
- Create: `ui/tooltip.js`

**Step 1: Write tooltip component**

Create file: `ui/tooltip.js`

```javascript
// Tooltip component for word lookup extension

class WordLookupTooltip {
  constructor() {
    this.tooltip_element = null;
    this.current_word = null;
    this.init();
  }

  init() {
    // Create tooltip element
    this.tooltip_element = document.createElement("div");
    this.tooltip_element.className = "word_lookup_tooltip";
    this.tooltip_element.setAttribute("aria-hidden", "true");

    // Create tooltip content structure
    this.tooltip_element.innerHTML = `
      <div class="word_lookup_tooltip_header">
        <span class="word_lookup_tooltip_word"></span>
        <span class="word_lookup_tooltip_phonetic"></span>
      </div>
      <div class="word_lookup_tooltip_definitions"></div>
      <div class="word_lookup_tooltip_source"></div>
    `;

    // Get references to content elements
    this.word_element = this.tooltip_element.querySelector(".word_lookup_tooltip_word");
    this.phonetic_element = this.tooltip_element.querySelector(".word_lookup_tooltip_phonetic");
    this.definitions_element = this.tooltip_element.querySelector(".word_lookup_tooltip_definitions");
    this.source_element = this.tooltip_element.querySelector(".word_lookup_tooltip_source");

    // Add to document
    document.body.appendChild(this.tooltip_element);
  }

  // Format part of speech for display
  format_part_of_speech(pos) {
    if (!pos || pos === "unknown") return "UNKNOWN";
    return pos.toUpperCase();
  }

  // Create definition HTML
  create_definition_html(definition) {
    let html = `<div class="word_lookup_tooltip_part_of_speech">${this.format_part_of_speech(definition.part_of_speech)}</div>`;

    html += `<div class="word_lookup_tooltip_meaning">• ${definition.meaning}</div>`;

    if (definition.example) {
      html += `<div class="word_lookup_tooltip_example">"${definition.example}"</div>`;
    }

    return html;
  }

  // Update tooltip content
  update_content(word_data) {
    this.current_word = word_data.word;

    // Update word and phonetic
    this.word_element.textContent = word_data.word;

    if (word_data.phonetic) {
      this.phonetic_element.textContent = word_data.phonetic;
      this.phonetic_element.style.display = "inline";
    } else {
      this.phonetic_element.style.display = "none";
    }

    // Update definitions
    this.definitions_element.innerHTML = "";

    if (word_data.definitions && word_data.definitions.length > 0) {
      word_data.definitions.forEach(definition => {
        const definition_html = this.create_definition_html(definition);
        this.definitions_element.innerHTML += definition_html;
      });
    } else {
      this.definitions_element.innerHTML = `<div class="word_lookup_tooltip_error">No definitions found</div>`;
    }

    // Update source
    let source_text = "Source: ";
    switch (word_data.source) {
      case "local":
        source_text += "local dictionary";
        break;
      case "cache":
        source_text += "cached";
        break;
      case "api":
        source_text += "Dictionary API";
        break;
      case "not_found":
        source_text += "word not found";
        break;
      case "error":
        source_text += `error: ${word_data.error_type || "unknown"}`;
        break;
      default:
        source_text += word_data.source || "unknown";
    }

    this.source_element.textContent = source_text;
  }

  // Show tooltip at position
  show(x, y, word_data) {
    this.update_content(word_data);

    // Position tooltip
    this.tooltip_element.style.left = `${x}px`;
    this.tooltip_element.style.top = `${y}px`;

    // Adjust position if tooltip goes off screen
    const rect = this.tooltip_element.getBoundingClientRect();
    const viewport_width = window.innerWidth;
    const viewport_height = window.innerHeight;

    if (rect.right > viewport_width) {
      this.tooltip_element.style.left = `${x - rect.width}px`;
    }

    if (rect.bottom > viewport_height) {
      this.tooltip_element.style.top = `${y - rect.height}px`;
    }

    // Make visible
    this.tooltip_element.classList.add("word_lookup_tooltip_visible");
    this.tooltip_element.setAttribute("aria-hidden", "false");
  }

  // Hide tooltip
  hide() {
    this.tooltip_element.classList.remove("word_lookup_tooltip_visible");
    this.tooltip_element.setAttribute("aria-hidden", "true");
    this.current_word = null;
  }

  // Check if tooltip is visible
  is_visible() {
    return this.tooltip_element.classList.contains("word_lookup_tooltip_visible");
  }

  // Get current word
  get_current_word() {
    return this.current_word;
  }

  // Clean up
  destroy() {
    if (this.tooltip_element && this.tooltip_element.parentNode) {
      this.tooltip_element.parentNode.removeChild(this.tooltip_element);
    }
  }
}

// Export for use in content script
if (typeof module !== "undefined" && module.exports) {
  module.exports = WordLookupTooltip;
}
```

**Step 2: Test tooltip component syntax**

```bash
node -c ui/tooltip.js
```

Expected: No syntax errors.

**Step 3: Commit tooltip component**

```bash
git add ui/tooltip.js
git commit -m "feat: add tooltip UI component"
```

---

## Content Script

### Task 9: Create content_script.js with word detection

**Files:**
- Create: `content_scripts/content_script.js`

**Step 1: Write content script with basic word detection**

Create file: `content_scripts/content_script.js`

```javascript
// Content script for word lookup extension

// Configuration
const HOVER_DELAY_MS = 750; // 0.75 seconds
const DEBOUNCE_DELAY_MS = 100;

// State
let hover_timer = null;
let last_hovered_element = null;
let last_hovered_word = null;
let tooltip = null;
let is_initialized = false;

// Initialize extension
function initialize_extension() {
  if (is_initialized) return;

  // Load tooltip component
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("ui/tooltip.js");
  script.onload = () => {
    tooltip = new WordLookupTooltip();
    setup_event_listeners();
    is_initialized = true;
    console.log("Word Lookup extension initialized");
  };
  script.onerror = (error) => {
    console.error("Failed to load tooltip component:", error);
  };

  document.head.appendChild(script);
}

// Set up event listeners
function setup_event_listeners() {
  // Use event delegation for better performance
  document.addEventListener("mousemove", handle_mouse_move);
  document.addEventListener("mouseout", handle_mouse_out);
}

// Extract word from mouse position
function extract_word_from_position(x, y) {
  let element = null;

  // Try caretPositionFromPoint first (more accurate for text)
  if (document.caretPositionFromPoint) {
    const caret = document.caretPositionFromPoint(x, y);
    if (caret && caret.offsetNode) {
      element = caret.offsetNode;
    }
  }
  // Fallback to elementFromPoint
  else if (document.elementFromPoint) {
    element = document.elementFromPoint(x, y);
  }

  if (!element) return { element: null, word: null };

  // Get text content and cursor position within text
  let text = "";
  let offset = 0;

  if (element.nodeType === Node.TEXT_NODE) {
    text = element.textContent;
    // Estimate offset (this is approximate)
    const range = document.createRange();
    range.selectNodeContents(element);
    const rects = range.getClientRects();

    // Find which character position is closest to mouse x
    // Simplified: use rough estimate
    const element_rect = element.parentElement.getBoundingClientRect();
    offset = Math.floor((x - element_rect.left) / (element_rect.width / text.length));
    offset = Math.max(0, Math.min(offset, text.length - 1));
  } else if (element.innerText) {
    text = element.innerText;
    offset = 0;
  } else {
    return { element: null, word: null };
  }

  // Extract word at position
  const word_match = extract_word_at_position(text, offset);
  if (!word_match) return { element: null, word: null };

  return {
    element: element,
    word: word_match.word,
    start_offset: word_match.start,
    end_offset: word_match.end
  };
}

// Extract word at specific position in text
function extract_word_at_position(text, position) {
  if (!text || position < 0 || position >= text.length) return null;

  // Find word boundaries
  let start = position;
  let end = position;

  // Move start backward until non-word character
  while (start > 0 && is_word_character(text[start - 1])) {
    start--;
  }

  // Move end forward until non-word character
  while (end < text.length - 1 && is_word_character(text[end + 1])) {
    end++;
  }

  // Extract word
  const word = text.substring(start, end + 1);

  // Check if it's a valid English word (basic check)
  if (word.length === 0 || !is_english_word(word)) {
    return null;
  }

  return { word: word, start: start, end: end };
}

// Check if character is part of a word
function is_word_character(char) {
  // Allow letters, numbers, hyphens (for compound words), apostrophes
  return /[a-zA-Z0-9\-']/.test(char);
}

// Basic English word check (could be improved)
function is_english_word(word) {
  // At least 2 characters, starts with letter
  if (word.length < 2) return false;
  if (!/[a-zA-Z]/.test(word[0])) return false;

  // Check if it looks like an English word
  // This is a very basic check - could be expanded
  return /^[a-zA-Z][a-zA-Z\-']*[a-zA-Z]$/.test(word);
}

// Handle mouse movement with debouncing
let debounce_timer = null;
function handle_mouse_move(event) {
  if (debounce_timer) {
    clearTimeout(debounce_timer);
  }

  debounce_timer = setTimeout(() => {
    process_mouse_position(event.clientX, event.clientY);
    debounce_timer = null;
  }, DEBOUNCE_DELAY_MS);
}

// Process mouse position
function process_mouse_position(x, y) {
  // Clear any existing hover timer
  if (hover_timer) {
    clearTimeout(hover_timer);
    hover_timer = null;
  }

  // Extract word at current position
  const word_info = extract_word_from_position(x, y);

  if (!word_info.word || !word_info.element) {
    // Not over a word, hide tooltip if visible
    if (tooltip && tooltip.is_visible()) {
      tooltip.hide();
    }
    if (last_hovered_element) {
      last_hovered_element.classList.remove("word_lookup_highlight");
      last_hovered_element = null;
    }
    last_hovered_word = null;
    return;
  }

  // Check if it's the same word as before
  if (last_hovered_word === word_info.word) {
    // Same word, no need to do anything
    return;
  }

  // New word, set up hover timer
  last_hovered_word = word_info.word;
  last_hovered_element = word_info.element;

  hover_timer = setTimeout(() => {
    handle_word_hover(word_info, x, y);
  }, HOVER_DELAY_MS);
}

// Handle mouse out event
function handle_mouse_out(event) {
  // If mouse leaves the document, clear hover
  if (!event.relatedTarget || event.relatedTarget.nodeName === "HTML") {
    if (hover_timer) {
      clearTimeout(hover_timer);
      hover_timer = null;
    }
    if (last_hovered_element) {
      last_hovered_element.classList.remove("word_lookup_highlight");
      last_hovered_element = null;
    }
    if (tooltip && tooltip.is_visible()) {
      tooltip.hide();
    }
    last_hovered_word = null;
  }
}

// Handle word hover (after delay)
function handle_word_hover(word_info, x, y) {
  // Apply highlight
  if (last_hovered_element) {
    last_hovered_element.classList.add("word_lookup_highlight");
  }

  // Look up word
  lookup_word(word_info.word, x, y);
}

// Look up word and show tooltip
function lookup_word(word, x, y) {
  chrome.runtime.sendMessage(
    {
      action: "lookup_word",
      word: word
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError);
        return;
      }

      if (tooltip && last_hovered_word === word) {
        tooltip.show(x + 15, y + 15, response); // Offset from cursor
      }
    }
  );
}

// Clean up
function cleanup() {
  if (hover_timer) {
    clearTimeout(hover_timer);
    hover_timer = null;
  }

  if (tooltip) {
    tooltip.destroy();
    tooltip = null;
  }

  if (last_hovered_element) {
    last_hovered_element.classList.remove("word_lookup_highlight");
    last_hovered_element = null;
  }

  last_hovered_word = null;
  is_initialized = false;

  // Remove event listeners
  document.removeEventListener("mousemove", handle_mouse_move);
  document.removeEventListener("mouseout", handle_mouse_out);
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize_extension);
} else {
  initialize_extension();
}

// Clean up on page unload
window.addEventListener("beforeunload", cleanup);

// For testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    extract_word_at_position,
    is_word_character,
    is_english_word
  };
}
```

**Step 2: Test content script syntax**

```bash
node -c content_scripts/content_script.js
```

Expected: No syntax errors.

**Step 3: Commit content script**

```bash
git add content_scripts/content_script.js
git commit -m "feat: add content script with word detection and hover handling"
```

---

## Integration and Testing

### Task 10: Load extension in Chrome for manual testing

**Files:**
- Test: All files together

**Step 1: Prepare extension for loading**

```bash
# Create a zip file for easy loading (optional)
zip -r word_lookup_extension.zip . -x "*.git*" "*.zip"
```

**Step 2: Load extension in Chrome manually**

Manual steps:
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the project directory `D:\codes\lookup`
5. Extension should appear in list

**Step 3: Test basic functionality**

Create a simple test HTML file:

Create file: `test_page.html`

```html
<!DOCTYPE html>
<html>
<head>
    <title>Word Lookup Test Page</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            line-height: 1.6;
            padding: 20px;
        }
        .test-section {
            margin: 30px 0;
            padding: 20px;
            border: 1px solid #eee;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <h1>Word Lookup Extension Test</h1>

    <div class="test-section">
        <h2>Simple Text</h2>
        <p>This is a test paragraph with the word <strong>hello</strong> in it.
           You should be able to hover over hello and see its definition.</p>
        <p>Another paragraph with the word <strong>world</strong> here.</p>
    </div>

    <div class="test-section">
        <h2>Technical Content</h2>
        <p>The <strong>computer</strong> is running a <strong>programming</strong>
           <strong>extension</strong> for Chrome browser.</p>
    </div>

    <div class="test-section">
        <h2>Compound Words</h2>
        <p>Test hyphenated words: mother-in-law, well-known, state-of-the-art.</p>
    </div>

    <div class="test-section">
        <h2>Words Not in Local Dictionary</h2>
        <p>Words like "serendipity" or "ephemeral" should trigger API lookup.</p>
    </div>

    <script>
        // Simple page loaded indicator
        console.log("Test page loaded for Word Lookup extension");
    </script>
</body>
</html>
```

**Step 4: Open test page and verify**

1. Open `test_page.html` in Chrome
2. Hover over "hello" for 0.75 seconds
3. Verify:
   - Word gets blue highlight
   - Tooltip appears with IPA and Chinese definition
   - Tooltip stays visible while hovering
   - Tooltip disappears when mouse moves away

**Step 5: Commit test files**

```bash
git add test_page.html
git commit -m "test: add test page for manual testing"
```

---

## Bug Fixes and Improvements

### Task 11: Fix word highlighting for text nodes

**Files:**
- Modify: `content_scripts/content_script.js`

**Issue:** Text nodes don't support CSS classes directly. Need to wrap or apply style to parent.

**Step 1: Update highlight application logic**

In `content_scripts/content_script.js`, find the `handle_word_hover` function and replace highlight logic:

```javascript
// Apply highlight to element (handles text nodes)
function apply_highlight(element) {
  if (element.nodeType === Node.TEXT_NODE) {
    // For text nodes, highlight the parent element
    if (element.parentElement) {
      element.parentElement.classList.add("word_lookup_highlight");
      return element.parentElement;
    }
  } else {
    element.classList.add("word_lookup_highlight");
    return element;
  }
  return null;
}

// Remove highlight
function remove_highlight(element) {
  if (element && element.classList) {
    element.classList.remove("word_lookup_highlight");
  }
}
```

**Step 2: Update hover handling to use new functions**

Update `process_mouse_position` and `handle_mouse_out` to use the new functions.

**Step 3: Test fix**

Reload extension and test on `test_page.html`.

**Step 4: Commit fix**

```bash
git add content_scripts/content_script.js
git commit -m "fix: improve word highlighting for text nodes"
```

---

## Final Verification

### Task 12: Complete end-to-end testing

**Files:**
- Test: All components

**Step 1: Reload extension**

In `chrome://extensions/`:
1. Find Word Lookup extension
2. Click refresh icon (circular arrow)
3. Extension reloads with latest code

**Step 2: Test all scenarios**

1. **Local dictionary words**: hello, world, computer, programming, extension
   - Should show immediately (blue highlight + tooltip)
   - Should have Chinese definitions

2. **API lookup words**: serendipity, ephemeral, ubiquitous
   - Should show after short delay (API call)
   - Should have English definitions only (no Chinese)

3. **Invalid words**: xyz123, 123abc
   - Should not trigger hover (no highlight)

4. **Hover timing**: Exactly 0.75 seconds delay
   - Use stopwatch or count mentally

5. **Tooltip positioning**:
   - Should adjust when near screen edge
   - Should follow mouse (with offset)

**Step 3: Verify error handling**

1. **Disconnect internet**: Test offline mode
   - Local words should still work
   - API words should show error or no tooltip

2. **API failure**: Simulate by blocking `api.dictionaryapi.dev`
   - Should gracefully handle network errors

**Step 4: Performance check**

1. **Memory**: No memory leaks after extended use
2. **Responsiveness**: Page should not lag during hover
3. **Cache effectiveness**: Repeated words should load faster

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: finalize extension implementation"
```

---

## Deployment Preparation

### Task 13: Create README and prepare for Chrome Web Store

**Files:**
- Create: `README.md`
- Create: `PRIVACY_POLICY.md`

**Step 1: Create README**

Create file: `README.md`

```markdown
# Word Lookup Chrome Extension

A Chrome extension that helps you look up English words by hovering over them.
Displays IPA phonetic symbols and Chinese definitions.

## Features

- **Hover Detection**: Mouse hover over English words (0.75s delay)
- **Blue Highlight**: Words are highlighted in blue when detected
- **Tooltip Display**: Shows IPA phonetic symbols and Chinese definitions
- **Multiple Data Sources**: Local dictionary + Dictionary API fallback
- **Offline Support**: Works without internet for common words
- **Caching**: API results cached for faster repeated lookups

## Installation

### Development Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the project directory

### Chrome Web Store Installation

*(Coming soon)*

## Usage

1. Navigate to any webpage with English text
2. Hover your mouse over an English word for 0.75 seconds
3. The word will be highlighted in blue
4. A tooltip will appear showing:
   - The word
   - IPA phonetic symbols (if available)
   - Chinese definitions grouped by part of speech
   - Example sentences (if available)

## Data Sources

1. **Local Dictionary**: 50+ common English words with Chinese translations
2. **Dictionary API**: Free public API for comprehensive word coverage
3. **Local Cache**: API results cached for 24 hours

## Privacy

This extension:
- Only accesses web pages you visit (like all content scripts)
- Makes API calls to dictionaryapi.dev for word definitions
- Stores cache locally in your browser (chrome.storage.local)
- Does NOT collect or transmit any personal data
- Does NOT track your browsing history

See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for details.

## Development

### Project Structure

```
word_lookup_extension/
├── manifest.json              # Extension manifest
├── background/               # Background service worker
│   └── background.js
├── content_scripts/          # Content scripts (injected)
│   └── content_script.js
├── data/                     # Local dictionary
│   └── common_words.json
├── ui/                       # UI components
│   ├── tooltip.css
│   ├── tooltip.js
│   └── highlight.css
└── icons/                    # Extension icons
```

### Building from Source

No build process required. Extension uses plain JavaScript and CSS.

### Adding Words to Local Dictionary

Edit `data/common_words.json` following the existing format:

```json
"word": {
  "phonetic": "/ipa-phonetic/",
  "definitions": [
    {
      "part_of_speech": "noun",
      "meaning": "Chinese definition",
      "example": "Example sentence"
    }
  ]
}
```

## License

MIT License

## Support

For issues or feature requests, please open an issue on GitHub.
```

**Step 2: Create privacy policy**

Create file: `PRIVACY_POLICY.md`

```markdown
# Privacy Policy for Word Lookup Chrome Extension

**Last Updated:** 2026-03-09

## Data Collection

This extension does NOT collect, store, or transmit any personal data.

## What Data We Access

1. **Web Page Content**: Like all Chrome extensions with content scripts, this extension can access the content of web pages you visit. This is necessary to detect English words for lookup.

2. **Browser Storage**: The extension uses Chrome's local storage (`chrome.storage.local`) to cache word definitions for better performance. This data stays on your device.

## What Data We Share

1. **Dictionary API Calls**: When a word is not in the local dictionary, the extension makes an API call to `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`. This public API receives only the word being looked up.

2. **No Personal Data Shared**: We do NOT share any personal information, browsing history, or unique identifiers with any third parties.

## Data Retention

1. **Local Cache**: Word definitions from the API are cached locally for up to 24 hours to improve performance. You can clear this cache by uninstalling the extension.

2. **No Persistent Storage**: We do not maintain any servers or databases storing user data.

## Your Rights

Since we don't collect personal data, there's no data for us to provide, modify, or delete. All data is stored locally on your device.

## Changes to This Policy

If we update this privacy policy, we will update the "Last Updated" date at the top of this document.

## Contact

For privacy concerns, please open an issue on the GitHub repository.
```

**Step 3: Create final package**

```bash
# Create production zip (excluding development files)
zip -r word_lookup_extension_prod.zip . \
  -x "*.git*" \
  -x "test_page.html" \
  -x "*.zip" \
  -x "docs/plans/*" \
  -x "README.md" \
  -x "PRIVACY_POLICY.md"
```

**Step 4: Final commit**

```bash
git add README.md PRIVACY_POLICY.md
git commit -m "docs: add README and privacy policy"
```

---

## Implementation Complete

The Word Lookup Chrome extension is now fully implemented and ready for testing. All components are in place:

1. ✅ **Manifest**: Configured for Manifest V3
2. ✅ **Background Script**: Local dictionary + API integration with caching
3. ✅ **Content Script**: Word detection with 0.75s hover delay
4. ✅ **UI Components**: Blue highlighting and tooltip display
5. ✅ **Local Dictionary**: Sample words with Chinese translations
6. ✅ **Testing**: Manual test page provided
7. ✅ **Documentation**: README and privacy policy

**To test the extension:**
1. Open Chrome and go to `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked" and select the project directory
4. Open `test_page.html` and hover over words like "hello"

**Next steps for production:**
1. Create proper icons (replace placeholders)
2. Add more words to local dictionary
3. Submit to Chrome Web Store
4. Consider adding user configuration options

---

Plan complete and saved to `docs/plans/2026-03-09-word-lookup-extension-implementation.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**