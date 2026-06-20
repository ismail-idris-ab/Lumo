import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

async function main() {
  await prisma.category.update({
    where: { slug: 'phones-tablets' },
    data: {
      attributeSchema: [
        {
          key: 'brand', label: 'Brand', type: 'select', primary: true,
          options: ['Samsung', 'Apple', 'Tecno', 'Infinix', 'itel', 'Xiaomi', 'Realme', 'Nokia', 'Other'],
        },
        {
          key: 'model', label: 'Model', type: 'text', primary: true,
          placeholder: 'e.g. Galaxy A54',
        },
        {
          key: 'storage', label: 'Internal storage', type: 'select', primary: true,
          options: ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB'],
        },
        {
          key: 'ram', label: 'RAM', type: 'select', primary: true,
          options: ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB'],
        },
        {
          key: 'os', label: 'Operating system', type: 'select', primary: true,
          options: ['Android', 'iOS', 'HarmonyOS', 'Windows', 'Other'],
        },
        { key: 'screen', label: 'Screen size', type: 'number', unit: 'inches' },
        { key: 'battery', label: 'Battery', type: 'number', unit: 'mAh' },
        { key: 'mainCamera', label: 'Main camera', type: 'text', placeholder: 'e.g. 50MP' },
        { key: 'selfieCamera', label: 'Selfie camera', type: 'text', placeholder: 'e.g. 12MP' },
        { key: 'exchange', label: 'Exchange possible', type: 'boolean' },
      ],
    },
  });
  console.log('phones-tablets schema updated');
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
