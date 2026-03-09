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
  console.log("Word Lookup: initialize_extension called");
  if (is_initialized) {
    console.log("Word Lookup: already initialized");
    return;
  }

  // Load tooltip component
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("ui/tooltip.js");
  console.log("Word Lookup: Loading tooltip from:", script.src);

  script.onload = () => {
    console.log("Word Lookup: tooltip.js loaded successfully");
    console.log("Word Lookup: Checking if WordLookupTooltip is defined:", typeof WordLookupTooltip);

    if (typeof WordLookupTooltip === "undefined") {
      console.error("Word Lookup: WordLookupTooltip class is undefined!");
      console.error("Word Lookup: This may be due to CSP restrictions or script loading issues");
      console.error("Word Lookup: Check the Network tab for ui/tooltip.js loading");
      return;
    }

    try {
      tooltip = new WordLookupTooltip();
      console.log("Word Lookup: WordLookupTooltip instance created");
      setup_event_listeners();
      is_initialized = true;
      console.log("Word Lookup extension initialized");
    } catch (error) {
      console.error("Word Lookup: Error creating tooltip:", error);
      console.error("Word Lookup: Error stack:", error.stack);
    }
  };

  script.onerror = (error) => {
    console.error("Word Lookup: Failed to load tooltip component:", error);
    console.error("Word Lookup: Script loading error details:", script.src, error);
  };

  document.head.appendChild(script);
  console.log("Word Lookup: Script element appended to head");
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

// Apply highlight to element (handles text nodes)
function apply_highlight(element) {
  if (!element) return null;

  if (element.nodeType === Node.TEXT_NODE) {
    // For text nodes, highlight the parent element
    if (element.parentElement) {
      element.parentElement.classList.add("word_lookup_highlight");
      return element.parentElement;
    }
    return null;
  } else if (element.classList) {
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
      remove_highlight(last_hovered_element);
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

  // New word, remove previous highlight if exists
  if (last_hovered_element) {
    remove_highlight(last_hovered_element);
  }

  // Set up hover timer
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
      remove_highlight(last_hovered_element);
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
    const highlighted_element = apply_highlight(last_hovered_element);
    if (highlighted_element) {
      last_hovered_element = highlighted_element;
    } else {
      console.warn("Failed to apply highlight to element");
    }
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
    remove_highlight(last_hovered_element);
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