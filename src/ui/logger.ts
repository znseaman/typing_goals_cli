export const logger = {
  info: (msg: string) => console.log(`\nℹ️  ${msg}\n`),
  success: (msg: string) => console.log(`\n✅ ${msg}\n`),
  warn: (msg: string) => console.warn(`\n⚠️  ${msg}\n`),
  error: (msg: string) => console.error(`\n❌ ${msg}\n`),
};