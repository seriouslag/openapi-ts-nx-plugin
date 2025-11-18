import { getSpec } from '@hey-api/openapi-ts/internal';
import { resolve } from 'path';

const result = await getSpec({
  inputPath: resolve('./packages/nx-plugin/src/test-specs/base.json'),
  timeout: 10000,
  watch: { headers: new Headers() },
});

console.log('Result keys:', Object.keys(result));
console.log('Has error:', 'error' in result);
console.log('Has resolvedInput:', 'resolvedInput' in result);
if ('resolvedInput' in result) {
  console.log('resolvedInput type:', typeof result.resolvedInput);
  console.log('resolvedInput keys:', Object.keys(result.resolvedInput || {}));
  if (result.resolvedInput) {
    const str = JSON.stringify(result.resolvedInput, null, 2);
    console.log('resolvedInput sample (first 800 chars):', str.substring(0, 800));
  }
}
