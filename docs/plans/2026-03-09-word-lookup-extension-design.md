# Word Lookup Chrome Extension Design
**Date**: 2026-03-09
**Version**: 1.0
**Status**: Approved

## Overview
A Chrome extension that enables users to look up English words by hovering over them with the mouse. The extension highlights words in blue and displays a tooltip with IPA phonetic symbols and Chinese definitions.

### Core Requirements
1. **Hover Detection**: Detect mouse hover over English words with 0.75 second delay
2. **Word Highlighting**: Apply blue highlight to detected words
3. **Tooltip Display**: Show tooltip with IPA phonetic symbols and Chinese definitions
4. **Data Sources**: Hybrid approach - local dictionary first, Dictionary API fallback
5. **Code Standards**: snake_case naming, no Chinese comments

## Architecture

### Recommended Approach: Separated Architecture
We selected the separated architecture (Method 2) for its advantages in cache sharing, performance isolation, and extensibility.

#### Architecture Diagram
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Content Script │    │   Background    │    │   Local Storage │
│   (Word Detection│◄──►│   Script        │◄──►│   (Cache/Dict)  │
│    & UI)         │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │  Mouse Events          │  API Calls             │   Local Dictionary
         ▼                        ▼                        ▼
    ┌─────────┐            ┌─────────────┐          ┌─────────────┐
    │ Web Page │            │ Dictionary │          │ common_words│
    │   DOM    │            │    API     │          │   .json     │
    └─────────┘            └─────────────┘          └─────────────┘
```

### File Structure
```
word_lookup_extension/
├── manifest.json              # Extension manifest
├── background/
│   └── background.js          # Background service worker
├── content_scripts/
│   └── content_script.js      # Content script (injected into web pages)
├── data/
│   └── common_words.json      # Local dictionary file
├── ui/
│   ├── tooltip.css           # Tooltip styles
│   ├── tooltip.js            # Tooltip UI component
│   └── highlight.css         # Word highlighting styles
├── icons/
│   ├── icon16.png            # Extension icons
│   ├── icon48.png
│   └── icon128.png
└── popup/                    # Optional: configuration popup
    ├── popup.html
    └── popup.js
```

## Component Responsibilities

### 1. Content Script (`content_script.js`)
**Primary Role**: Word detection, UI interaction, event handling

**Key Functions**:
- `initialize_word_detection()`: Set up mouse event listeners
- `extract_word_from_position(x, y)`: Extract word text from mouse position
- `show_highlight(word_element)`: Apply highlight to word element
- `show_tooltip(word_data, position)`: Display tooltip with word information
- `handle_mouse_hover(event)`: Process hover events with 0.75s delay

**Hover Interaction Flow**:
1. Mouse hovers over word → Start 0.75s timer
2. Timer triggers → Extract word text
3. Send query to background script
4. Receive response → Highlight word + show tooltip
5. Mouse moves out → Remove highlight + hide tooltip

### 2. Background Script (`background.js`)
**Primary Role**: Data retrieval, cache management, API communication

**Key Functions**:
- `lookup_word(word)`: Main query function (local → cache → API)
- `query_local_dictionary(word)`: Query local JSON dictionary
- `query_dictionary_api(word)`: Call external Dictionary API
- `format_word_data(api_response)`: Standardize data format
- `update_cache(word, data)`: Update local cache

**Query Priority**:
1. Local dictionary (`common_words.json`)
2. Local cache (`chrome.storage.local`)
3. Dictionary API (with caching)

### 3. Tooltip UI (`tooltip.css` + `tooltip.js`)
**Primary Role**: Display word information in floating window

**Tooltip Content**:
- Word title (bold)
- IPA phonetic symbols (italic)
- Chinese definitions grouped by part of speech
- Data source indicator (local/API)

## Data Structures

### Local Dictionary Format (`common_words.json`)
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
      }
    ]
  }
}
```

### Standardized Internal Format
```json
{
  "word": "hello",
  "phonetic": "/həˈləʊ/",
  "definitions": [
    {
      "part_of_speech": "noun",
      "meaning": "a greeting",
      "chinese_meaning": "招呼，问候"
    }
  ],
  "source": "local"  // or "api" or "cache"
}
```

## Communication Protocol

### Message Passing
```javascript
// Content script sends request
chrome.runtime.sendMessage({
  action: "lookup_word",
  word: "hello"
}, response => {
  // Handle response
});

// Background script listens
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "lookup_word") {
    lookup_word(request.word).then(sendResponse);
    return true; // Keep message channel open
  }
});
```

## Error Handling Strategy

### Error Types
```javascript
const error_types = {
  LOCAL_DICTIONARY_NOT_FOUND: "local_dictionary_not_found",
  NETWORK_ERROR: "network_error",
  API_RATE_LIMIT: "api_rate_limit",
  WORD_NOT_FOUND: "word_not_found",
  INVALID_RESPONSE: "invalid_response",
  CACHE_ERROR: "cache_error"
};
```

### Graceful Degradation
1. **Local dictionary missing**: Log warning, proceed to cache/API
2. **Network error**: Return error state, show limited information
3. **API rate limit**: Implement exponential backoff retry
4. **Word not found**: Return "not found" state, show empty tooltip
5. **Cache error**: Bypass cache, query API directly

## UI/UX Design

### Highlight Styles
```css
.word-lookup-highlight {
  background-color: rgba(66, 133, 244, 0.3); /* Blue semi-transparent */
  border-bottom: 2px solid #4285f4;
  border-radius: 2px;
  cursor: help;
  transition: background-color 0.2s ease;
}

.word-lookup-highlight:hover {
  background-color: rgba(66, 133, 244, 0.5);
}
```

### Tooltip Design
- **Position**: Follows mouse, adjusts for viewport boundaries
- **Size**: 200-300px width, auto height with max limit
- **Colors**: Blue theme matching highlight
- **Typography**: Clean, readable font stack
- **Accessibility**: ARIA labels, keyboard navigation ready

### Tooltip Layout Example
```
┌─────────────────────────────────────┐
│ hello      /həˈləʊ/                 │ ← Word + Phonetic
├─────────────────────────────────────┤
│ NOUN                               │ ← Part of speech
│ • 招呼，问候                       │ ← Chinese definition
│   She gave me a friendly hello.    │ ← Example sentence
│                                     │
│ VERB                                │
│ • 打招呼，问候                     │
│   He helloed from across the street│
├─────────────────────────────────────┤
│ Source: local                       │ ← Data source indicator
└─────────────────────────────────────┘
```

## Performance Optimizations

1. **Debouncing & Throttling**:
   - Mouse events: Debounced to reduce unnecessary word extraction
   - API calls: Throttled to avoid rapid consecutive queries

2. **Caching Strategy**:
   - Local dictionary: Pre-loaded in memory
   - API results: Cached for 24 hours with LRU eviction
   - Cache size: Limited to prevent storage bloat

3. **Lazy Loading**:
   - Tooltip DOM: Created on first use
   - Dictionary data: Loaded asynchronously

4. **Memory Management**:
   - Clean up unused tooltip elements
   - Regular cache cleanup
   - WeakMap for DOM references to prevent leaks

## Testing Strategy

### Unit Tests
- Word extraction logic
- Data query prioritization
- Error handling scenarios
- Cache management functions

### Integration Tests
- Cross-component message passing
- Tooltip creation/destruction lifecycle
- Cache synchronization
- Browser environment simulation

### End-to-End Tests (Puppeteer)
- Complete hover-to-tooltip workflow
- Different webpage structures
- Performance and memory usage
- Network failure scenarios

### Manual Test Scenarios
1. **Basic functionality**: Static HTML pages with common words
2. **Edge cases**: Page boundaries, long words, special characters
3. **Web compatibility**: Complex SPAs, Google Docs, PDF viewers
4. **Performance**: Rapid sequential hovers, long-term usage

## Security Considerations

1. **API Security**:
   - HTTPS communication with Dictionary API
   - No API keys required (public API)
   - Response validation to prevent XSS

2. **Content Security Policy**:
   - Appropriate CSP rules in manifest.json
   - Restricted external resource loading

3. **User Privacy**:
   - No query history logging (unless future vocabulary feature)
   - Cache data stored locally, not uploaded
   - Secure deletion of sensitive data

## Configuration

### Manifest.json Key Settings
```json
{
  "manifest_version": 3,
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["https://api.dictionaryapi.dev/*"],
  "background": {
    "service_worker": "background/background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content_scripts/content_script.js"],
    "css": ["ui/tooltip.css", "ui/highlight.css"],
    "run_at": "document_idle"
  }]
}
```

## Future Extension Points

1. **User Configuration**:
   - Adjustable hover delay (0.5-2.0 seconds)
   - Highlight color themes
   - Site-specific enable/disable settings

2. **Data Management**:
   - Vocabulary notebook: Save looked-up words
   - Export functionality: CSV/Anki format
   - Custom dictionary: User-added words

3. **Advanced Features**:
   - Text-to-speech: Word pronunciation
   - History: Recently looked-up words
   - Multi-language: Additional target languages

## Success Metrics

1. **Functional**:
   - Word detection accuracy > 95%
   - Tooltip display latency < 100ms after hover
   - Successful API fallback rate > 90%

2. **Performance**:
   - Memory usage < 50MB for typical usage
   - No observable UI blocking
   - Cache hit rate > 60% for repeated words

3. **User Experience**:
   - Intuitive hover interaction
   - Clear visual feedback
   - Minimal disruption to browsing

## Implementation Priorities

### Phase 1: Core Functionality
1. Basic word detection and highlighting
2. Local dictionary integration
3. Simple tooltip display
4. Manifest and extension structure

### Phase 2: Enhanced Features
1. Dictionary API integration
2. Caching system
3. Error handling
4. Performance optimizations

### Phase 3: Polish & Extensions
1. UI refinements
2. Additional configuration
3. Testing and bug fixes
4. Documentation

---

## Design Decisions Summary

| Decision | Rationale | Alternatives Considered |
|----------|-----------|-------------------------|
| Separated architecture | Better cache sharing, performance isolation, extensibility | Monolithic content script |
| Hybrid data source | Offline capability + comprehensive coverage | Local-only or API-only |
| 0.75s hover delay | Balances responsiveness with avoidance of accidental triggers | 0.5s (too sensitive) or 1.0s (too slow) |
| IPA phonetic system | International standard, widely recognized | KK音标 (Taiwanese preference) |
| All definitions display | Comprehensive information for language learners | First definition only (simpler) |
| Blue highlight color | Clear visual feedback, matches Chrome theme | Other colors (green, yellow, etc.) |

## Open Questions & Risks

1. **Dictionary API reliability**: Public API may have rate limits or downtime
2. **Complex webpage compatibility**: May need adjustments for SPAs and dynamic content
3. **Performance on large documents**: Word detection may need optimization for very long pages
4. **Chinese translation quality**: Local dictionary may have limited coverage

## Next Steps

1. ✅ **Design approval**: Complete
2. **Implementation plan**: Create detailed task breakdown
3. **Development**: Phase 1 implementation
4. **Testing**: Unit, integration, and manual testing
5. **Polish**: UI refinements and performance tuning
6. **Deployment**: Chrome Web Store submission

---

**Approval Signature**: ___________________________
**Date**: ___________________________