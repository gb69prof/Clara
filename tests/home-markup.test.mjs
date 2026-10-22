import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const shell = fs.readFileSync('public/index.html', 'utf8');
const generated = fs.readFileSync('lib/clara-ui.ts', 'utf8');
const widget = JSON.parse(generated.match(/export const widgetHtml=(.*);\n/)[1]);
for (const [name, html] of [['website', shell], ['widget', widget]]) {
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  const elements = [...markup.matchAll(/<([\w-]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)];
  const ids = elements.map(m => m[2]);
  assert.equal(ids.length, new Set(ids).size, `${name}: duplicate DOM IDs break getElementById`);
  assert.equal(elements.find(m => m[2] === 'send')?.[1], 'button');
  for (const use of markup.matchAll(/<use\b[^>]*href="#([^"]+)"/g)) {
    assert.equal(elements.find(m => m[2] === use[1])?.[1], 'symbol');
  }
}
assert(!widget.includes('./data:image'), 'Embedded portrait must be a valid data URL');
const scripts = [...widget.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 3);
for (const [i, match] of scripts.entries()) new vm.Script(match[1], {filename: `embedded-${i}.js`});
console.log('PASS: real website/widget IDs, send button, SVG references, portrait URL and embedded script syntax.');
