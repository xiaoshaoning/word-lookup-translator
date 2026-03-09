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

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "lookup_word") {
    lookup_word(request.word).then(sendResponse);
    return true; // Keep message channel open for async response
  }
});

console.log("Word Lookup background script loaded");