import { prisma } from '../lib/prisma';

async function main() {
  await prisma.category.update({
    where: { slug: 'phones-tablets' },
    data: {
      attributeSchema: [
        { key: 'brand',        label: 'Brand',            primary: true },
        { key: 'model',        label: 'Model',            primary: true },
        { key: 'storage',      label: 'Internal storage', primary: true },
        { key: 'ram',          label: 'RAM',              primary: true },
        { key: 'os',           label: 'Operating system', primary: true },
        { key: 'screen',       label: 'Screen size',      format: '{v} inches' },
        { key: 'battery',      label: 'Battery',          format: '{v} mAh' },
        { key: 'mainCamera',   label: 'Main camera' },
        { key: 'selfieCamera', label: 'Selfie camera' },
        { key: 'exchange',     label: 'Exchange possible' },
      ],
    },
  });
  console.log('Done');
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
