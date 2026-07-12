const fs = require('fs');

const fixFile = (file) => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<img src=\{([a-zA-Z0-9_?.]+)\}/g, "{!$1 ? null : <img src={$1}");
  fs.writeFileSync(file, content);
};

// Actually, wait, it's easier to just do: src={user.avatarUrl || undefined}
const fixFile2 = (file) => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/src=\{([a-zA-Z0-9_?.]+)\}/g, "src={$1 || undefined}");
  fs.writeFileSync(file, content);
};

fixFile2('src/components/Header.tsx');
fixFile2('src/components/ScheduleGrid.tsx');
fixFile2('src/components/TeamLeaderView.tsx');
