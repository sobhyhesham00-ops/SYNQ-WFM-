const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  "import { GoogleGenAI } from '@google/genai';",
  "import { GoogleGenAI, Type } from '@google/genai';"
);
fs.writeFileSync('server.ts', content);
