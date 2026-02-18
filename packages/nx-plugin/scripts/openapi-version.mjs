import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const pluginPackageJsonPath = join(
  process.cwd(),
  'packages/nx-plugin/package.json',
);

export function parseVersionFromRange(versionRange) {
  const match = versionRange.match(/(\d+\.\d+\.\d+)/);
  if (!match) {
    throw new Error(`Could not extract version from range: ${versionRange}`);
  }

  return match[1];
}

function parseArgs(argv) {
  let ref = null;
  let setVersion = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--ref') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --ref');
      }
      ref = value;
      i += 1;
      continue;
    }

    if (arg === '--set') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --set');
      }
      setVersion = value;
      i += 1;
      continue;
    }
  }

  return { ref, setVersion };
}

function getDependencyRangeFromPackageJson(packageJson, context) {
  const dep = packageJson.dependencies?.['@hey-api/openapi-ts'];
  if (!dep) {
    throw new Error(
      `Missing dependency @hey-api/openapi-ts in ${context}`,
    );
  }

  return dep;
}

function readCurrentPackageJson() {
  return JSON.parse(readFileSync(pluginPackageJsonPath, 'utf8'));
}

function readPackageJsonAtRef(ref) {
  const json = execFileSync(
    'git',
    ['show', `${ref}:packages/nx-plugin/package.json`],
    { encoding: 'utf8' },
  );
  return JSON.parse(json);
}

export function getOpenapiVersion(ref) {
  const packageJson = ref ? readPackageJsonAtRef(ref) : readCurrentPackageJson();
  const context = ref
    ? `packages/nx-plugin/package.json at ref ${ref}`
    : 'packages/nx-plugin/package.json';
  return parseVersionFromRange(getDependencyRangeFromPackageJson(packageJson, context));
}

function setOpenapiDependency(version) {
  const packageJson = readCurrentPackageJson();
  const currentRange = getDependencyRangeFromPackageJson(
    packageJson,
    'packages/nx-plugin/package.json',
  );
  const nextRange = `^${version}`;

  packageJson.dependencies['@hey-api/openapi-ts'] = nextRange;
  writeFileSync(pluginPackageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  console.log(
    `Updated @hey-api/openapi-ts dependency: ${currentRange} -> ${nextRange}`,
  );
}

function main() {
  const { ref, setVersion } = parseArgs(process.argv.slice(2));

  if (setVersion) {
    setOpenapiDependency(setVersion);
    return;
  }

  process.stdout.write(getOpenapiVersion(ref));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
