// Parse a server-rendered dict.cn word page into the fields the card shows.
// Behavior ported from delve_cn's src/fetch/parser.ts (cheerio selectors ->
// the equivalent regexes). Verified against dict.cn markup (2026):
//   <h1 class="keyword">headword</h1>
//   <div class="phonetic"><span>英 <bdo>[ipa]</bdo>...</span><span>美 ...</span></div>
//   <ul class="dict-basic-ul"><li><span>v.</span><strong>释义</strong></li>...</ul>

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(value) {
  return value.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    const named = ENTITIES[entity.toLowerCase()];
    return named === undefined ? match : named;
  });
}

/** Strip tags / attributes and collapse whitespace. */
function text(html) {
  return decodeEntities(String(html).replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} html - raw HTML from https://dict.cn/<word>
 * @returns {{headword:string, pronunciations:{label:string,ipa:string}[], basicTranslations:{pos:string,meanings:string}[]}|null}
 *   null when the page has no dictionary entry.
 */
export function parseDictCn(html) {
  const head = html.match(/<h1[^>]*class="keyword"[^>]*>([\s\S]*?)<\/h1>/i);
  if (!head) return null;
  const headword = text(head[1]);
  if (!headword) return null;

  const pronunciations = [];
  const phonetic = html.match(/<div class="phonetic">([\s\S]*?)<\/div>/i);
  if (phonetic) {
    for (const span of phonetic[1].matchAll(/<span>([\s\S]*?)<\/span>/gi)) {
      const label = (span[1].match(/^\s*(英|美)/) || [])[1];
      const ipa = span[1].match(/<bdo[^>]*>([\s\S]*?)<\/bdo>/i);
      if (label && ipa) pronunciations.push({ label, ipa: text(ipa[1]) });
    }
  }

  const basicTranslations = [];
  const list = html.match(/<ul class="dict-basic-ul">([\s\S]*?)<\/ul>/i);
  if (list) {
    for (const item of list[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
      const pos = item[1].match(/<span[^>]*>([\s\S]*?)<\/span>/i);
      const meanings = item[1].match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);
      if (!pos || !meanings) continue; // ad / promo <li>
      const posText = text(pos[1]);
      const meaningText = text(meanings[1]);
      if (posText && meaningText) basicTranslations.push({ pos: posText, meanings: meaningText });
    }
  }

  return { headword, pronunciations, basicTranslations };
}
