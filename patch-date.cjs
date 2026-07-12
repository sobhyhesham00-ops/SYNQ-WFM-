const fs = require('fs');
let content = fs.readFileSync('src/components/ScheduleGrid.tsx', 'utf8');

if (!content.includes('isValid')) {
  content = content.replace("import { format, parseISO } from 'date-fns';", "import { format, parseISO, isValid } from 'date-fns';");
}
content = content.replace(
  "{format(parseISO(date), 'EEE d')}",
  "{isValid(parseISO(date)) ? format(parseISO(date), 'EEE d') : date}"
);

fs.writeFileSync('src/components/ScheduleGrid.tsx', content);
