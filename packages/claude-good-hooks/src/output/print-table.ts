export function printTable(data: Array<Record<string, string | number | boolean>>): void {
  if (data.length === 0) {
    console.log('No data to display');
    return;
  }

  const keys = Object.keys(data[0]);
  const maxLengths = keys.map(key =>
    Math.max(key.length, ...data.map(row => String(row[key] || '').length))
  );

  // Header
  const header = keys.map((key, i) => key.padEnd(maxLengths[i])).join(' | ');
  console.log(header);
  console.log(keys.map((_, i) => '-'.repeat(maxLengths[i])).join('-|-'));

  // Rows
  data.forEach(row => {
    const line = keys.map((key, i) => String(row[key] || '').padEnd(maxLengths[i])).join(' | ');
    console.log(line);
  });
}
