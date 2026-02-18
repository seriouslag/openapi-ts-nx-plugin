import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseVersionFromRange } from './openapi-version.mjs';

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

function toVersionString(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function isAligned(current, openapi) {
  return (
    current.major === openapi.major &&
    current.minor === openapi.minor &&
    current.patch >= openapi.patch
  );
}

function getSyncedVersion(openapi) {
  return {
    major: openapi.major,
    minor: openapi.minor,
    patch: openapi.patch,
  };
}

function getPatchedVersion(current, openapi) {
  if (current.major !== openapi.major || current.minor !== openapi.minor) {
    throw new Error(
      [
        'Cannot apply plugin patch bump while major/minor is out of sync.',
        `- plugin version: ${toVersionString(current)}`,
        `- openapi version: ${toVersionString(openapi)}`,
        'Run with --sync first.',
      ].join('\n'),
    );
  }

  return {
    major: current.major,
    minor: current.minor,
    patch: Math.max(current.patch, openapi.patch) + 1,
  };
}

function writeVersion(packageJson, fromVersion, toVersion) {
  packageJson.version = toVersionString(toVersion);
  writeFileSync(pluginPackageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  console.log(
    `Updated packages/nx-plugin/package.json version: ${toVersionString(fromVersion)} -> ${toVersionString(toVersion)}`,
  );
}

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const sync = args.has('--sync') || args.has('--write');
const bumpPatch = args.has('--bump-patch');

const packageJson = JSON.parse(readFileSync(pluginPackageJsonPath, 'utf8'));
const currentVersion = parseVersion(packageJson.version);
const openapiRange = packageJson.dependencies?.['@hey-api/openapi-ts'];

if (!openapiRange) {
  throw new Error(
    'Missing dependency @hey-api/openapi-ts in packages/nx-plugin/package.json',
  );
}

const openapiVersion = parseVersion(parseVersionFromRange(openapiRange));
const aligned = isAligned(currentVersion, openapiVersion);
const patchedRecommendation =
  currentVersion.major === openapiVersion.major &&
  currentVersion.minor === openapiVersion.minor
    ? toVersionString(getPatchedVersion(currentVersion, openapiVersion))
    : 'not available (run --sync first)';

if (checkOnly) {
  if (!aligned) {
    console.error(
      [
        'Version policy check failed.',
        `- plugin version: ${toVersionString(currentVersion)}`,
        `- openapi version: ${toVersionString(openapiVersion)} (from ${openapiRange})`,
        `- recommended synced plugin version: ${toVersionString(getSyncedVersion(openapiVersion))}`,
      ].join('\n'),
    );
    process.exit(1);
  }

  console.log(
    `Version policy check passed: plugin=${toVersionString(currentVersion)}, openapi=${toVersionString(openapiVersion)}`,
  );
  process.exit(0);
}

if (sync) {
  const syncedVersion = getSyncedVersion(openapiVersion);
  writeVersion(packageJson, currentVersion, syncedVersion);
  process.exit(0);
}

if (bumpPatch) {
  const patchedVersion = getPatchedVersion(currentVersion, openapiVersion);
  writeVersion(packageJson, currentVersion, patchedVersion);
  process.exit(0);
}

console.log(
  [
    `plugin version: ${toVersionString(currentVersion)}`,
    `openapi version: ${toVersionString(openapiVersion)} (from ${openapiRange})`,
    `aligned: ${aligned ? 'yes' : 'no'}`,
    `recommended synced plugin version: ${toVersionString(getSyncedVersion(openapiVersion))}`,
    `recommended patched plugin version: ${patchedRecommendation}`,
    '',
    'Use --check to enforce policy, --sync to match openapi, or --bump-patch for plugin-only releases.',
  ].join('\n'),
);
