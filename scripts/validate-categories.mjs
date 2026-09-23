await import('../public/data/categories.js');

const nodes = globalThis.SUPPORT_CATEGORIES;
const products = ['yingao', 'tieao'];
const keyPattern = /^[a-z0-9.-]+$/;
const errors = [];
const categories = nodes.filter((node) => node.node_type === 'category');
const parents = nodes.filter((node) => node.node_type === 'parent');

for (const product of products) {
  const productParents = parents.filter((node) => node.product_key === product);
  const productCategories = categories.filter((node) => node.product_key === product);
  if (productParents.length !== 6) errors.push(`${product}: expected 6 parents, got ${productParents.length}`);
  if (productCategories.length !== 29) errors.push(`${product}: expected 29 categories, got ${productCategories.length}`);
}
if (categories.length !== 58) errors.push(`expected 58 categories, got ${categories.length}`);
if (new Set(categories.map((node) => node.category_key)).size !== 58) errors.push('category_key values are not unique');
if (parents.some((node) => node.category_key !== null)) errors.push('a parent node has category_key');
if (categories.some((node) => !keyPattern.test(node.category_key))) errors.push('a category_key has invalid characters');
if (nodes.some((node) => !node.product_key || !node.parent_key || !node.name_zh || !node.name_en || !Number.isInteger(node.sort_order) || !node.node_type)) errors.push('a node is missing required fields');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`PASS: ${parents.length} parent nodes, ${categories.length} unique category keys`);
console.log('PASS: yingao=29, tieao=29, bilingual names share the same nodes');
