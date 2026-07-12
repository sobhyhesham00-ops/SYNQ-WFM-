const { format, addDays, startOfWeek, parseISO } = require('date-fns');
const today = new Date();
const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
const dates = Array.from({ length: 7 }).map((_, i) => format(addDays(startOfCurrentWeek, i), 'yyyy-MM-dd'));
console.log(dates);
dates.forEach(d => {
  console.log(d, '->', format(parseISO(d), 'EEE d'));
});
