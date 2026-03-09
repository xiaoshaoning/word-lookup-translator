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