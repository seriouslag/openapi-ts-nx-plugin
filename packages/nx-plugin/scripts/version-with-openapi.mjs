import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const pluginPackageJsonPath = join(
  process.cwd(),
  'packages/nx-plugin/package.json',
);

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid semver version: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function parseVersionFromRange(versionRange) {
  const match = versionRange.match(/(\d+\.\d+\.\d+)/);
  if (!match) {
    throw new Error(`Could not extract version from range: ${versionRange}`);
  }

  return parseVersion(match[1]);
}

function toVersionString(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function getRecommendedVersion(current, openapi) {
  if (current.major !== openapi.major || current.minor !== openapi.minor) {
    // Realign when major/minor diverges.
    return openapi;
  }

  // Keep patch monotonic and always at/above openapi patch.
  return {
    major: openapi.major,
    minor: openapi.minor,
    patch: Math.max(current.patch, openapi.patch) + 1,
  };
}

function isAligned(current, openapi) {
  return (
    current.major === openapi.major &&
    current.minor === openapi.minor &&
    current.patch >= openapi.patch
  );
}

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const write = args.has('--write');

const packageJson = JSON.parse(readFileSync(pluginPackageJsonPath, 'utf8'));
const currentVersion = parseVersion(packageJson.version);
const openapiRange = packageJson.dependencies?.['@hey-api/openapi-ts'];

if (!openapiRange) {
  throw new Error(
    'Missing dependency @hey-api/openapi-ts in packages/nx-plugin/package.json',
  );
}

const openapiVersion = parseVersionFromRange(openapiRange);
const recommendedVersion = getRecommendedVersion(currentVersion, openapiVersion);
const aligned = isAligned(currentVersion, openapiVersion);

if (checkOnly) {
  if (!aligned) {
    console.error(
      [
        'Version policy check failed.',
        `- plugin version: ${toVersionString(currentVersion)}`,
        `- openapi version: ${toVersionString(openapiVersion)} (from ${openapiRange})`,
        `- recommended plugin version: ${toVersionString(recommendedVersion)}`,
      ].join('\n'),
    );
    process.exit(1);
  }

  console.log(
    `Version policy check passed: plugin=${toVersionString(currentVersion)}, openapi=${toVersionString(openapiVersion)}`,
  );
  process.exit(0);
}

if (write) {
  packageJson.version = toVersionString(recommendedVersion);
  writeFileSync(pluginPackageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  console.log(
    `Updated packages/nx-plugin/package.json version: ${toVersionString(currentVersion)} -> ${toVersionString(recommendedVersion)}`,
  );
  process.exit(0);
}

console.log(
  [
    `plugin version: ${toVersionString(currentVersion)}`,
    `openapi version: ${toVersionString(openapiVersion)} (from ${openapiRange})`,
    `aligned: ${aligned ? 'yes' : 'no'}`,
    `recommended next plugin version: ${toVersionString(recommendedVersion)}`,
    '',
    'Use --check to enforce policy or --write to update package.json.',
  ].join('\n'),
);
