import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const schemas: Array<{ slug: string; schema: object[] }> = [
  {
    slug: 'vehicles',
    schema: [
      {
        key: 'make', label: 'Make', type: 'select', primary: true,
        options: ['Toyota', 'Honda', 'Lexus', 'Mercedes-Benz', 'BMW', 'Ford', 'Hyundai', 'Kia', 'Volkswagen', 'Nissan', 'Peugeot', 'Mitsubishi', 'Other'],
      },
      { key: 'model', label: 'Model', type: 'text', primary: true, placeholder: 'e.g. Camry' },
      { key: 'year', label: 'Year', type: 'number', primary: true, placeholder: 'e.g. 2019' },
      { key: 'mileage', label: 'Mileage', type: 'number', unit: 'km' },
      {
        key: 'fuelType', label: 'Fuel type', type: 'select',
        options: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'LPG'],
      },
      {
        key: 'transmission', label: 'Transmission', type: 'select',
        options: ['Automatic', 'Manual'],
      },
      { key: 'color', label: 'Color', type: 'text', placeholder: 'e.g. Silver' },
      { key: 'registered', label: 'Registered', type: 'boolean' },
    ],
  },
  {
    slug: 'electronics',
    schema: [
      { key: 'brand', label: 'Brand', type: 'text', primary: true },
      { key: 'model', label: 'Model', type: 'text', primary: true },
      {
        key: 'type', label: 'Type', type: 'select', primary: true,
        options: ['TV', 'Laptop', 'Tablet', 'Camera', 'Printer', 'Speaker', 'Headphones', 'Gaming Console', 'AC', 'Refrigerator', 'Microwave', 'Washing Machine', 'Other'],
      },
      { key: 'warrantyMonths', label: 'Warranty (months)', type: 'number' },
      { key: 'exchange', label: 'Exchange possible', type: 'boolean' },
    ],
  },
  {
    slug: 'property',
    schema: [
      {
        key: 'propertyType', label: 'Type', type: 'select', primary: true,
        options: ['Flat', 'Duplex', 'Studio', 'Bungalow', 'Terrace', 'Detached House', 'Land', 'Commercial'],
      },
      {
        key: 'listingType', label: 'For sale or rent', type: 'select', primary: true,
        options: ['For Sale', 'For Rent', 'Short Let'],
      },
      {
        key: 'bedrooms', label: 'Bedrooms', type: 'select',
        options: ['Studio', '1', '2', '3', '4', '5+'],
      },
      {
        key: 'bathrooms', label: 'Bathrooms', type: 'select',
        options: ['1', '2', '3', '4+'],
      },
      {
        key: 'furnished', label: 'Furnished', type: 'select',
        options: ['Furnished', 'Semi-furnished', 'Unfurnished'],
      },
      { key: 'parking', label: 'Parking spaces', type: 'number' },
      {
        key: 'features', label: 'Features', type: 'multiselect',
        options: ['Swimming pool', 'Generator', 'Security', 'CCTV', 'Water supply', 'Solar power', 'Gym', 'Boys quarters'],
      },
    ],
  },
  {
    slug: 'services',
    schema: [
      {
        key: 'serviceType', label: 'Service type', type: 'select', primary: true,
        options: ['Repair', 'Delivery', 'Cleaning', 'Tutoring', 'Graphic Design', 'Tailoring', 'Photography', 'Catering', 'IT Support', 'Legal', 'Accounting', 'Other'],
      },
      {
        key: 'availability', label: 'Availability', type: 'select',
        options: ['Full-time', 'Part-time', 'Weekends only', 'On-demand'],
      },
      { key: 'experience', label: 'Years of experience', type: 'number' },
    ],
  },
];

async function main() {
  for (const { slug, schema } of schemas) {
    const cat = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
    if (!cat) {
      console.warn(`Category not found: ${slug}`);
      continue;
    }
    await prisma.category.update({ where: { slug }, data: { attributeSchema: schema } });
    console.log(`Updated: ${slug}`);
  }
  console.log('Done');
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
