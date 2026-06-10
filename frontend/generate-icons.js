// Gera logo192.png e logo512.png a partir do logo.svg via canvas (precisa de pacote opcional).
// Como alternativa, escrevemos SVGs em ambos os tamanhos como fallback PWA-friendly.
const fs = require('fs');
const path = require('path');

const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <rect width="512" height="512" fill="#060606"/>
  <rect x="56" y="56" width="400" height="400" fill="#C9A84C" rx="60"/>
  <text x="256" y="345" text-anchor="middle" font-size="280" fill="#060606" font-family="Georgia, serif" font-weight="bold" font-style="italic">D</text>
  <line x1="156" y1="396" x2="356" y2="396" stroke="#060606" stroke-width="6" stroke-linecap="round"/>
</svg>`;

// SVG inline (PWA moderno aceita SVG no manifest, mas Play Store exige PNG)
fs.writeFileSync(path.join(__dirname, 'public', 'logo.svg'), svg(512));
console.log('✅ logo.svg gerado');

// Tenta gerar PNG via sharp (se disponível); senão instrui o usuário
try {
  const sharp = require('sharp');
  Promise.all([
    sharp(Buffer.from(svg(512))).resize(192, 192).png().toFile(path.join(__dirname, 'public', 'logo192.png')),
    sharp(Buffer.from(svg(512))).resize(512, 512).png().toFile(path.join(__dirname, 'public', 'logo512.png')),
  ]).then(() => console.log('✅ logo192.png e logo512.png gerados via sharp'));
} catch {
  console.log('⚠️  Pacote sharp não instalado. Para gerar os PNG:');
  console.log('   npm install --save-dev sharp && node generate-icons.js');
  console.log('   OU use o site https://realfavicongenerator.net/ com o logo.svg');
}
