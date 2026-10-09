// Minimal self-check for the dict.cn parser. Run: node test/parser.test.mjs
import assert from "node:assert/strict";
import { parseDictCn } from "../background/dict_parser.js";

const HTML = `<!doctype html><html><body>
<h1 class="keyword" tip="音节划分：re&#183;con&#183;sid&#183;er">reconsider</h1>
<div class="phonetic">
  <span>英 <bdo lang="EN-US">[ˌriːkən'sɪdə(r)]</bdo> <i class="sound fsound"> </i></span>
  <span>美 <bdo lang="EN-US">[ˌriːkən'sɪdər]</bdo> <i class="sound"> </i></span>
</div>
<ul class="dict-basic-ul">
  <li><span>v.</span><strong>重新考虑；再斟酌</strong></li>
  <li style="padding-top: 25px;"><script>ads()</script></li>
</ul>
</body></html>`;

const data = parseDictCn(HTML);
assert.equal(data.headword, "reconsider");
assert.deepEqual(data.pronunciations, [
  { label: "英", ipa: "[ˌriːkən'sɪdə(r)]" },
  { label: "美", ipa: "[ˌriːkən'sɪdər]" },
]);
assert.deepEqual(data.basicTranslations, [{ pos: "v.", meanings: "重新考虑；再斟酌" }]);

// Multiple parts of speech + a not-found page.
assert.deepEqual(
  parseDictCn('<h1 class="keyword">go</h1><ul class="dict-basic-ul"><li><span>v.</span><strong>去</strong></li><li><span>n.</span><strong>尝试</strong></li></ul>')
    .basicTranslations,
  [{ pos: "v.", meanings: "去" }, { pos: "n.", meanings: "尝试" }],
);
assert.equal(parseDictCn("<html><body>no entry</body></html>"), null);

console.log("dict_parser: OK");
