import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({ datasources: { db: { url: 'file:./prisma/dev.db' } } });
(async () => {
  const top = await prisma.taxonomy.findMany({ where: { parentId: null }, orderBy: { sort: 'asc' } });
  console.log('=== Taxonomy top-level (' + top.length + ') ===');
  top.forEach(t => console.log(' -', t.name, '(' + t.slug + ')'));
  const allTax = await prisma.taxonomy.findMany();
  console.log('=== Taxonomy total rows:', allTax.length, '===');
  const qp = await prisma.quotaPlan.findMany();
  console.log('=== QuotaPlans (' + qp.length + ') ===');
  qp.forEach(q => console.log(' -', q.code, '/', q.name, '/ price=' + q.monthlyPrice, '/ credits=' + q.creditQuota));
  const cp = await prisma.creditPackage.findMany({ orderBy: { sortOrder: 'asc' } });
  console.log('=== CreditPackages (' + cp.length + ') ===');
  cp.forEach(c => console.log(' -', c.code, '/', c.label, '/ credits=' + c.credits, '/ $' + c.priceUsd));
  await prisma.$disconnect();
})();
