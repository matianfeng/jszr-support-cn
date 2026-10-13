await import('../public/data/categories.js');

const nodes = globalThis.SUPPORT_CATEGORIES;
const products = ['yingao', 'tieao'];
const keyPattern = /^[a-z0-9.-]+$/;
const errors = [];
const categories = nodes.filter((node) => node.node_type === 'category');
const parents = nodes.filter((node) => node.node_type === 'parent');
const expectedSuffixes = [
  'documents.product-usage', 'documents.specifications',
  'sdk.download', 'sdk.quick-start', 'firmware.stable', 'faq.general',
];

for (const product of products) {
  const productParents = parents.filter((node) => node.product_key === product);
  const productCategories = categories.filter((node) => node.product_key === product);
  if (productParents.length !== 4) errors.push(`${product}: expected 4 parents, got ${productParents.length}`);
  if (productCategories.length !== 6) errors.push(`${product}: expected 6 categories, got ${productCategories.length}`);
  const actualKeys = productCategories.map((node) => node.category_key).sort();
  const expectedKeys = expectedSuffixes.map((suffix) => `${product}.${suffix}`).sort();
  if (actualKeys.join('|') !== expectedKeys.join('|')) errors.push(`${product}: category keys do not match the required structure`);
}
if (categories.length !== 12) errors.push(`expected 12 categories, got ${categories.length}`);
if (new Set(categories.map((node) => node.category_key)).size !== 12) errors.push('category_key values are not unique');
if (parents.some((node) => node.category_key !== null)) errors.push('a parent node has category_key');
if (categories.some((node) => !keyPattern.test(node.category_key))) errors.push('a category_key has invalid characters');
if (nodes.some((node) => !node.product_key || !node.parent_key || !node.name_zh || !node.name_en || !Number.isInteger(node.sort_order) || !node.node_type)) errors.push('a node is missing required fields');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`PASS: ${parents.length} parent nodes, ${categories.length} unique category keys`);
console.log('PASS: yingao=6, tieao=6, bilingual names share the same nodes');
