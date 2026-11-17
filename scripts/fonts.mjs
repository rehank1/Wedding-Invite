// Subsets self-hosted WOFF2 fonts from @fontsource into site/assets/fonts.
import { readFile, writeFile } from 'node:fs/promises';
import subsetFont from 'subset-font';

const LATIN = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~' +
  ' ·éèêàâîïôûçÉ‘’“”–—…•©®™×';
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i)).join('');
const ARABIC = range(0x0600, 0x06ff) + range(0xfd3e, 0xfd3f) + ' ‌‍';

const jobs = [
  ['bodoni-moda', 'bodoni-moda-latin-400-normal', 'bodoni-400', LATIN],
  ['bodoni-moda', 'bodoni-moda-latin-400-italic', 'bodoni-400i', LATIN],
  ['bodoni-moda', 'bodoni-moda-latin-500-normal', 'bodoni-500', LATIN],
  ['cormorant-garamond', 'cormorant-garamond-latin-500-italic', 'cormorant-500i', LATIN],
  ['cormorant-garamond', 'cormorant-garamond-latin-500-normal', 'cormorant-500', LATIN],
  ['jost', 'jost-latin-400-normal', 'jost-400', LATIN],
  ['jost', 'jost-latin-500-normal', 'jost-500', LATIN],
  ['great-vibes', 'great-vibes-latin-400-normal', 'greatvibes-400', LATIN],
  ['amiri', 'amiri-arabic-400-normal', 'amiri-400', ARABIC],
];
for (const [pkg, file, out, chars] of jobs) {
  const src = await readFile(`node_modules/@fontsource/${pkg}/files/${file}.woff2`);
  const buf = await subsetFont(src, chars, { targetFormat: 'woff2' });
  await writeFile(`site/assets/fonts/${out}.woff2`, buf);
  console.log(out, src.length, '->', buf.length);
}
