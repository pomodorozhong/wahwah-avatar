// Rebuild the local style variants from the unmodified sample. Only material
// parameters and metadata change. The embedded images and rig bytes are copied.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const source = resolve(process.argv[2] ?? 'app/public/models/vrm/VRM1_Constraint_Twist_Sample.vrm');
const destination = resolve(process.argv[3] ?? 'app/public/models/vrm');
const thumbnails = process.argv[4] && resolve(process.argv[4]);
const bytes = readFileSync(source);
if (bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2) {
  throw new Error('Expected a binary glTF 2.0 VRM.');
}
const jsonLength = bytes.readUInt32LE(12);
const original = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
if (!original.extensions?.VRMC_vrm) throw new Error('Expected a VRM 1.0 source.');
const binaryChunk = bytes.subarray(20 + jsonLength);
mkdirSync(destination, { recursive: true });

function linear(hex) {
  return [0, 2, 4].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
}

const styles = [
  { name: 'Painted-Toon', id: 'painted-toon', hair: 'ac804d', hairShade: '405a56', cloth: '68a5a0', skinShade: 'b28b83', line: '44483e', toony: 0.92 },
  { name: 'Ink-Dither', id: 'ink-dither', hair: '6d6d6d', hairShade: '181818', cloth: 'ababab', skinShade: '666666', line: '151b20', toony: 0.25 },
  { name: 'Comic-Print', id: 'comic-print', hair: '694e86', hairShade: '20203e', cloth: '40bac8', skinShade: 'ab637e', line: '25172f', toony: 0.92 },
];

for (const style of styles) {
  const json = structuredClone(original);
  json.asset.extras = { ...json.asset.extras, wahwahRenderStyle: style.id };
  json.extensions.VRMC_vrm.meta.name = 'Wahwah-' + style.name;
  for (const material of json.materials) {
    const toon = material.extensions?.VRMC_materials_mtoon;
    if (!toon) continue;
    const pbr = material.pbrMetallicRoughness;
    // Identity features use the source artwork. Large surfaces use flat pigments.
    const hair = /HAIR/.test(material.name);
    const cloth = /Tops.*CLOTH/.test(material.name);
    const body = /Body.*SKIN/.test(material.name);
    if (hair || cloth || body) {
      delete pbr.baseColorTexture;
      delete toon.shadeMultiplyTexture;
      const pigment = hair ? style.hair : cloth ? style.cloth : 'f3d4bd';
      pbr.baseColorFactor = [...linear(pigment), 1];
    }
    if (/Face_.*SKIN/.test(material.name)) pbr.baseColorFactor = [...linear('fff1df'), 1];
    pbr.metallicFactor = 0;
    material.emissiveFactor = [0, 0, 0];
    delete material.emissiveTexture;
    toon.shadingToonyFactor = style.toony;
    toon.shadingShiftFactor = -0.15;
    toon.giEqualizationFactor = 0.85;
    toon.shadeColorFactor = linear(hair ? style.hairShade : /SKIN|FACE/.test(material.name) ? style.skinShade : '4a6374');
    toon.parametricRimColorFactor = linear(style.id === 'comic-print' ? '287e88' : '686245');
    toon.parametricRimFresnelPowerFactor = 4;
    toon.rimLightingMixFactor = 0.6;
    if (toon.outlineWidthFactor) {
      toon.outlineColorFactor = linear(style.line);
      toon.outlineLightingMixFactor = 0;
      toon.outlineWidthFactor = style.id === 'comic-print' ? 0.0011 : 0.00055;
    }
  }
  let outputBinary = binaryChunk;
  if (thumbnails) {
    // Append a rendered thumbnail without rewriting any source texture or rig data.
    const thumbnail = readFileSync(join(thumbnails, 'Wahwah-' + style.name + '-Preview.png'));
    const data = binaryChunk.subarray(8, 8 + binaryChunk.readUInt32LE(0));
    const padding = Buffer.alloc((4 - thumbnail.length % 4) % 4);
    const chunkHeader = Buffer.from(binaryChunk.subarray(0, 8));
    chunkHeader.writeUInt32LE(data.length + thumbnail.length + padding.length);
    json.extensions.VRMC_vrm.meta.thumbnailImage = json.images.length;
    json.images.push({ name: 'Wahwah preview', mimeType: 'image/png', bufferView: json.bufferViews.length });
    json.bufferViews.push({ buffer: 0, byteOffset: data.length, byteLength: thumbnail.length });
    json.buffers[0].byteLength = data.length + thumbnail.length + padding.length;
    outputBinary = Buffer.concat([chunkHeader, data, thumbnail, padding]);
  }
  const text = Buffer.from(JSON.stringify(json));
  const length = Math.ceil(text.length / 4) * 4;
  const header = Buffer.from(bytes.subarray(0, 20));
  header.writeUInt32LE(20 + length + outputBinary.length, 8);
  header.writeUInt32LE(length, 12);
  const output = join(destination, 'Wahwah-' + style.name + '.vrm');
  writeFileSync(output, Buffer.concat([header, text, Buffer.alloc(length - text.length, 0x20), outputBinary]));
  console.log(output);
}
