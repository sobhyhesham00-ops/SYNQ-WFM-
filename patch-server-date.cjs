const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "else if (dateVal instanceof Date) {",
  "else if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {"
);

fs.writeFileSync('server.ts', content);
