const omit = (process.env.npm_config_omit || '')
  .split(',')
  .map((value) => value.trim());

if (
  process.env.HUSKY === '0' ||
  process.env.CI === 'true' ||
  process.env.NODE_ENV === 'production' ||
  process.env.npm_config_production === 'true' ||
  omit.includes('dev')
) {
  process.exit(0);
}

const husky = (await import('husky')).default;

console.log(husky());
