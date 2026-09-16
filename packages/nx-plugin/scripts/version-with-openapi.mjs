import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
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

/**
 * Enough semver to answer "would this range and this version dedupe to one
 * install?" for the two range shapes we write: a caret range, or an exact pin.
 * Anything else throws rather than being guessed at.
 */
function rangeAdmits(range, version) {
  if (!/^\^?\d+\.\d+\.\d+$/.test(range)) {
    throw new Error(
      `Unsupported version range: ${range}. Expected an exact version or a caret range.`,
    );
  }

  const target = parseVersion(version);

  if (!range.startsWith('^')) {
    const pinned = parseVersion(range);
    return (
      pinned.major === target.major &&
      pinned.minor === target.minor &&
      pinned.patch === target.patch
    );
  }

  const floor = parseVersion(range.slice(1));
  if (floor.major !== target.major) {
    return false;
  }

  // For 0.x releases the minor segment is the breaking-change segment, so
  // ^0.9.1 admits 0.9.x but not 0.10.0.
  if (floor.major === 0) {
    return floor.minor === target.minor && target.patch >= floor.patch;
  }

  return (
    target.minor > floor.minor ||
    (target.minor === floor.minor && target.patch >= floor.patch)
  );
}

/**
 * The version of `@hey-api/codegen-core` that the installed `@hey-api/openapi-ts`
 * resolves to — i.e. the loader the generator itself uses.
 *
 * We depend on `@hey-api/codegen-core` directly (`readConfigFilePlugins` in
 * src/utils.ts calls its `loadConfigFile` to read a project's declared plugins),
 * and openapi-ts pins it to an exact version. Both have to end up as one install:
 * if our range does not admit openapi-ts's version, pnpm happily installs two
 * copies and we read the config file with a different loader than the generator
 * uses. Nothing throws — plugin options simply go missing again, which is the
 * bug that dependency was added to fix.
 *
 * `sync-openapi.yml` bumps `@hey-api/openapi-ts` unattended and pushes straight
 * to main without touching our range, so nothing else would notice the drift.
 *
 * Returns `null` when `@hey-api/openapi-ts` is not installed: this reads the
 * install rather than a declared string, so it is only answerable after
 * `pnpm install`. `release.yml` runs no install (it is a git-and-node job), so
 * the lockstep half of `--check` is skipped there and enforced in `ci.yml` and
 * `publish.yml`, both of which install first — the latter being the gate that
 * actually ships the package.
 */
function getOpenapiCodegenCoreVersion() {
  const requireFromPlugin = createRequire(pluginPackageJsonPath);

  let openapiPackageJsonPath;
  try {
    openapiPackageJsonPath = requireFromPlugin.resolve(
      '@hey-api/openapi-ts/package.json',
    );
  } catch {
    return null;
  }

  try {
    return createRequire(openapiPackageJsonPath)(
      '@hey-api/codegen-core/package.json',
    ).version;
  } catch {
    throw new Error(
      [
        '@hey-api/openapi-ts no longer resolves @hey-api/codegen-core.',
        'loadConfigFile may have moved or been dropped — check readConfigFilePlugins in packages/nx-plugin/src/utils.ts.',
      ].join('\n'),
    );
  }
}

function writeVersion(packageJson, fromVersion, toVersion) {
  packageJson.version = toVersionString(toVersion);
  writeFileSync(
    pluginPackageJsonPath,
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );
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

const codegenCoreRange = packageJson.dependencies?.['@hey-api/codegen-core'];

if (!codegenCoreRange) {
  throw new Error(
    'Missing dependency @hey-api/codegen-core in packages/nx-plugin/package.json',
  );
}

if (checkOnly) {
  const failures = [];

  if (!aligned) {
    failures.push(
      [
        'Plugin version is not aligned with @hey-api/openapi-ts.',
        `- plugin version: ${toVersionString(currentVersion)}`,
        `- openapi version: ${toVersionString(openapiVersion)} (from ${openapiRange})`,
        `- recommended synced plugin version: ${toVersionString(getSyncedVersion(openapiVersion))}`,
      ].join('\n'),
    );
  }

  const codegenCoreVersion = getOpenapiCodegenCoreVersion();

  if (
    codegenCoreVersion &&
    !rangeAdmits(codegenCoreRange, codegenCoreVersion)
  ) {
    failures.push(
      [
        '@hey-api/codegen-core is out of lockstep with @hey-api/openapi-ts.',
        `- our range: ${codegenCoreRange}`,
        `- version @hey-api/openapi-ts resolves: ${codegenCoreVersion}`,
        `- fix: set dependencies["@hey-api/codegen-core"] to ^${codegenCoreVersion} in packages/nx-plugin/package.json, then run pnpm install`,
        'Left unfixed, consumers install two copies of the config loader and plugin options declared in openapi-ts.config.* are silently dropped.',
      ].join('\n'),
    );
  }

  if (failures.length > 0) {
    console.error(['Version policy check failed.', '', ...failures].join('\n'));
    process.exit(1);
  }

  if (!codegenCoreVersion) {
    console.warn(
      'Skipped the @hey-api/codegen-core lockstep check: @hey-api/openapi-ts is not installed. Run pnpm install to include it.',
    );
  }

  console.log(
    [
      'Version policy check passed:',
      `plugin=${toVersionString(currentVersion)}`,
      `openapi=${toVersionString(openapiVersion)}`,
      codegenCoreVersion
        ? `codegen-core=${codegenCoreVersion} (${codegenCoreRange})`
        : 'codegen-core=not checked',
    ].join(' '),
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

const codegenCoreVersion = getOpenapiCodegenCoreVersion();
const codegenCoreStatus = codegenCoreVersion
  ? `${codegenCoreVersion} vs our ${codegenCoreRange} (lockstep: ${
      rangeAdmits(codegenCoreRange, codegenCoreVersion) ? 'yes' : 'no'
    })`
  : 'unknown (@hey-api/openapi-ts is not installed)';

console.log(
  [
    `plugin version: ${toVersionString(currentVersion)}`,
    `openapi version: ${toVersionString(openapiVersion)} (from ${openapiRange})`,
    `aligned: ${aligned ? 'yes' : 'no'}`,
    `codegen-core resolved by openapi-ts: ${codegenCoreStatus}`,
    `recommended synced plugin version: ${toVersionString(getSyncedVersion(openapiVersion))}`,
    `recommended patched plugin version: ${patchedRecommendation}`,
    '',
    'Use --check to enforce policy, --sync to match openapi, or --bump-patch for plugin-only releases.',
  ].join('\n'),
);
