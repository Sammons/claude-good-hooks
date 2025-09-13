export function printJson(data: unknown, indent = 2): void {
  console.log(JSON.stringify(data, null, indent));
}
