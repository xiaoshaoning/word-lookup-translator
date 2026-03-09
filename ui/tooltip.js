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
