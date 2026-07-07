import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import prettier from 'prettier';

const pluginRoot = join(process.cwd(), 'packages/nx-plugin');
const readmePath = join(pluginRoot, 'README.md');

const tables = [
  {
    id: 'openapi-client',
    schemaPath: join(
      pluginRoot,
      'src/generators/openapi-client/openapiClient.schema.json',
    ),
  },
  {
    id: 'openapi-config',
    schemaPath: join(
      pluginRoot,
      'src/generators/openapi-config/openapiConfig.schema.json',
    ),
  },
  {
    id: 'update-api',
    schemaPath: join(
      pluginRoot,
      'src/executors/update-api/updateApi.schema.json',
    ),
  },
  {
    id: 'plugin',
    schemaPath: join(pluginRoot, 'src/plugin/plugin.schema.json'),
  },
];

function renderType(property) {
  if (property.type === 'array') {
    return property.items?.type ? `${property.items.type}[]` : 'array';
  }
  return property.type ?? 'any';
}

function renderDefault(property, isRequired) {
  if (isRequired) {
    return '_required_';
  }
  if (property.default === undefined) {
    return '—';
  }
  if (Array.isArray(property.default)) {
    return property.default.length === 0
      ? '`[]`'
      : `\`${property.default.join(',')}\``;
  }
  return `\`${property.default}\``;
}

function renderDescription(property) {
  let description = property.description ?? '';
  if (description && !description.endsWith('.')) {
    description += '.';
  }
  if (property.enum) {
    const values = property.enum.map((value) => `\`${value}\``).join(', ');
    description += ` One of: ${values}.`;
  }
  return description.replaceAll('|', '\\|').trim();
}

function renderTable(schema) {
  const required = new Set(schema.required ?? []);
  const entries = Object.entries(schema.properties ?? {});
  const ordered = [
    ...entries.filter(([name]) => required.has(name)),
    ...entries.filter(([name]) => !required.has(name)),
  ];

  const rows = ordered.map(([name, property]) =>
    [
      `\`${name}\``,
      `\`${renderType(property)}\``,
      renderDefault(property, required.has(name)),
      renderDescription(property),
    ].join(' | '),
  );

  return [
    '| Option | Type | Default | Description |',
    '| ------ | ---- | ------- | ----------- |',
    ...rows.map((row) => `| ${row} |`),
  ].join('\n');
}

function injectTable(readme, id, table) {
  const startMarker = `<!-- options:${id}:start -->`;
  const endMarker = `<!-- options:${id}:end -->`;
  const start = readme.indexOf(startMarker);
  const end = readme.indexOf(endMarker);
  if (start === -1 || end === -1) {
    throw new Error(
      `Missing ${startMarker} / ${endMarker} markers in ${readmePath}`,
    );
  }

  return (
    readme.slice(0, start + startMarker.length) +
    `\n\n${table}\n\n` +
    readme.slice(end)
  );
}

async function generateReadme() {
  let readme = readFileSync(readmePath, 'utf8');
  for (const { id, schemaPath } of tables) {
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
    readme = injectTable(readme, id, renderTable(schema));
  }

  const prettierConfig = await prettier.resolveConfig(readmePath);
  return prettier.format(readme, {
    ...prettierConfig,
    filepath: readmePath,
  });
}

const mode = process.argv[2];
const current = readFileSync(readmePath, 'utf8');
const generated = await generateReadme();

if (mode === '--check') {
  if (current !== generated) {
    console.error(
      [
        'README option tables are out of sync with the schema files.',
        'Run `pnpm run docs:sync:nx-plugin` and commit the result.',
      ].join('\n'),
    );
    process.exit(1);
  }
  console.log('README option tables are in sync with the schema files.');
} else if (mode === '--sync') {
  if (current === generated) {
    console.log('README option tables already in sync.');
  } else {
    writeFileSync(readmePath, generated);
    console.log('README option tables updated from schema files.');
  }
} else {
  console.error('Usage: node docs-options.mjs --check | --sync');
  process.exit(1);
}
