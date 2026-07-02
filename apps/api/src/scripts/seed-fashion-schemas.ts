import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';

// Per-subcategory attribute schemas for Fashion.
// Format matches seed-phone-schema.ts: { key, label, type, primary?, options?, unit?, placeholder? }
// type: 'select' | 'text' | 'number' | 'boolean'. `primary` = headline specs (shown first / used as filters).
// Run AFTER the fashion subcategories are seeded (they must exist first).
// Note: `condition` (new/used) is a Listing field — not repeated here.

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

// Reusable option lists (kept consistent across subcategories).
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Made-to-Measure'];
const SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', 'Other'];
const COLORS = ['Black', 'White', 'Blue', 'Red', 'Pink', 'Green', 'Yellow', 'Brown', 'Grey', 'Purple', 'Gold', 'Multicolour', 'Other'];
const GENDER = ['Men', 'Women', 'Unisex'];
const EMBROIDERY = ['None', 'Machine Embroidery', 'Hand Embroidery'];

export const schemas: Record<string, unknown[]> = {
  'womens-clothing': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Dress', 'Gown', 'Top / Blouse', 'Skirt', 'Trousers', 'Jeans', 'Jumpsuit', 'Two-Piece Set', 'Nightwear', 'Other'] },
    { key: 'size', label: 'Size', type: 'select', primary: true, options: SIZES },
    { key: 'material', label: 'Material', type: 'select', options: ['Cotton', 'Polyester', 'Lace', 'Ankara', 'Chiffon', 'Denim', 'Silk', 'Satin', 'Other'] },
    { key: 'color', label: 'Colour', type: 'select', options: COLORS },
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Zara, Shein, local' },
  ],
  'mens-clothing': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Shirt', 'T-Shirt', 'Polo', 'Trousers', 'Jeans', 'Suit', 'Shorts', 'Sweater', 'Jacket', 'Other'] },
    { key: 'size', label: 'Size', type: 'select', primary: true, options: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] },
    { key: 'material', label: 'Material', type: 'select', options: ['Cotton', 'Polyester', 'Denim', 'Linen', 'Wool', 'Other'] },
    { key: 'color', label: 'Colour', type: 'select', options: COLORS },
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Polo, local' },
  ],
  'shoes-footwear': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Sneakers', 'Sandals', 'Slippers', 'Heels', 'Flats', 'Boots', 'Loafers', 'Palm Slippers', 'Leather Sandals (Takalmi)', 'Other'] },
    { key: 'gender', label: 'For', type: 'select', primary: true, options: ['Men', 'Women', 'Unisex', 'Kids'] },
    { key: 'size', label: 'Size (EU)', type: 'select', primary: true, options: SHOE_SIZES },
    { key: 'material', label: 'Material', type: 'select', options: ['Leather', 'Suede', 'Canvas', 'Rubber', 'Synthetic', 'Other'] },
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Nike, Clarks, local' },
  ],
  'bags-luggage': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Handbag', 'Backpack', 'Shoulder Bag', 'Clutch / Purse', 'Wallet', 'Travel Bag / Suitcase', 'Laptop Bag', 'Other'] },
    { key: 'gender', label: 'For', type: 'select', options: GENDER },
    { key: 'material', label: 'Material', type: 'select', options: ['Leather', 'Synthetic Leather', 'Canvas', 'Nylon', 'Other'] },
    { key: 'color', label: 'Colour', type: 'select', options: COLORS },
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. local, designer' },
  ],
  'mens-traditional-wear': [
    { key: 'style', label: 'Style', type: 'select', primary: true, options: ['Agbada', 'Kaftan', 'Senator', 'Isiagu', 'Dashiki', 'Native Two-Piece', 'Other'] },
    { key: 'size', label: 'Size', type: 'select', primary: true, options: SIZES },
    { key: 'fabric', label: 'Fabric', type: 'select', primary: true, options: ['Shadda (Guinea Brocade)', 'Cashmere', 'Cotton', 'Lace', 'Atamfa', 'Senator Material', 'Other'] },
    { key: 'embroidery', label: 'Embroidery', type: 'select', options: EMBROIDERY },
    { key: 'color', label: 'Colour', type: 'select', options: COLORS },
  ],
  'womens-traditional-wear': [
    { key: 'style', label: 'Style', type: 'select', primary: true, options: ['Iro & Buba', 'Kaba Gown', 'Boubou', 'Lace Gown', 'Ankara Gown', 'Two-Piece', 'Other'] },
    { key: 'size', label: 'Size', type: 'select', primary: true, options: SIZES },
    { key: 'fabric', label: 'Fabric', type: 'select', primary: true, options: ['Lace', 'Ankara', 'Shadda (Guinea Brocade)', 'Silk', 'George', 'Aso-Oke', 'Other'] },
    { key: 'color', label: 'Colour', type: 'select', options: COLORS },
  ],
  'northern-hausa-wear': [
    { key: 'style', label: 'Style', type: 'select', primary: true, options: ['Babban Riga (Grand Robe)', 'Kaftan', 'Jalabiya', 'Senator', 'Zannuwa', 'Other'] },
    { key: 'gender', label: 'For', type: 'select', primary: true, options: GENDER },
    { key: 'size', label: 'Size', type: 'select', primary: true, options: SIZES },
    { key: 'fabric', label: 'Fabric', type: 'select', primary: true, options: ['Shadda (Guinea Brocade)', 'Atamfa (Ankara)', 'Cashmere', 'Cotton', 'Lace', 'Turkish', 'Aba Made', 'Other'] },
    { key: 'embroidery', label: 'Embroidery', type: 'select', options: ['None', 'Machine Embroidery', 'Hand Embroidery (Aza)'] },
    { key: 'color', label: 'Colour', type: 'select', options: COLORS },
  ],
  'caps-turbans-headwear': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Hausa Cap (Hula)', 'Fila', 'Zanna Bukar Cap', 'Dara Cap', 'Turban (Rawani)', 'Head Tie (Kallabi)', 'Veil (Gyale)', 'Other'] },
    { key: 'gender', label: 'For', type: 'select', options: GENDER },
    { key: 'material', label: 'Material', type: 'select', options: ['Cotton', 'Aso-Oke', 'Damask', 'Beaded', 'Other'] },
    { key: 'color', label: 'Colour', type: 'select', options: COLORS },
  ],
  'modest-islamic-wear': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Abaya', 'Hijab', 'Khimar', 'Jilbab', 'Jalabiya', 'Niqab', 'Prayer Set', 'Other'] },
    { key: 'size', label: 'Size', type: 'select', primary: true, options: ['S', 'M', 'L', 'XL', 'XXL', 'Free Size'] },
    { key: 'material', label: 'Material', type: 'select', options: ['Chiffon', 'Nidha', 'Crepe', 'Cotton', 'Jersey', 'Other'] },
    { key: 'color', label: 'Colour', type: 'select', options: COLORS },
  ],
  'fabrics-textiles': [
    { key: 'type', label: 'Fabric type', type: 'select', primary: true, options: ['Ankara', 'Lace', 'Atamfa', 'Shadda (Guinea Brocade)', 'Aso-Oke', 'George', 'Chiffon', 'Senator Material', 'Cotton', 'Other'] },
    { key: 'length', label: 'Length', type: 'number', primary: true, unit: 'yards' },
    { key: 'origin', label: 'Origin', type: 'select', options: ['Nigerian', 'Turkish', 'Dutch (Hollandais)', 'Chinese', 'Other'] },
    { key: 'color', label: 'Colour', type: 'select', options: COLORS },
  ],
  'jewelry-beads': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Necklace', 'Earrings', 'Ring', 'Bracelet / Bangle', 'Waist Beads', 'Bead Set', 'Anklet', 'Other'] },
    { key: 'material', label: 'Material', type: 'select', primary: true, options: ['Gold-Plated', 'Silver', 'Stainless Steel', 'Beads', 'Coral', 'Costume', 'Other'] },
    { key: 'gender', label: 'For', type: 'select', options: GENDER },
    { key: 'color', label: 'Colour', type: 'select', options: COLORS },
  ],
  'perfumes-turare': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Perfume Oil (Attar)', 'Oud', 'Spray Perfume', 'Body Spray', 'Incense (Turare)', 'Air Freshener', 'Other'] },
    { key: 'gender', label: 'For', type: 'select', primary: true, options: GENDER },
    { key: 'size', label: 'Size', type: 'number', unit: 'ml' },
    { key: 'origin', label: 'Origin', type: 'select', options: ['Arabian', 'French', 'Local', 'Other'] },
  ],
  'fashion-accessories': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Belt', 'Sunglasses', 'Scarf', 'Gloves', 'Hair Accessory', 'Tie', 'Hat', 'Handkerchief', 'Other'] },
    { key: 'gender', label: 'For', type: 'select', options: GENDER },
    { key: 'color', label: 'Colour', type: 'select', options: COLORS },
  ],
  'watches': [
    { key: 'brand', label: 'Brand', type: 'select', primary: true, options: ['Rolex', 'Casio', 'Fossil', 'Curren', 'Naviforce', 'Apple', 'Samsung', 'Other'] },
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Analog', 'Digital', 'Analog-Digital', 'Smartwatch'] },
    { key: 'gender', label: 'For', type: 'select', primary: true, options: GENDER },
    { key: 'material', label: 'Strap material', type: 'select', options: ['Stainless Steel', 'Leather', 'Rubber', 'Gold-Plated', 'Other'] },
    { key: 'color', label: 'Colour', type: 'select', options: COLORS },
  ],
  'bridal-wedding': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Wedding Gown', 'Aso-Ebi Set', 'Bridal Accessories', "Groom's Outfit", 'Kayan Lefe (Bridal Trousseau)', 'Engagement Outfit', 'Other'] },
    { key: 'availability', label: 'Availability', type: 'select', primary: true, options: ['For Sale', 'For Rent'] },
    { key: 'size', label: 'Size', type: 'select', options: SIZES },
    { key: 'color', label: 'Colour', type: 'select', options: COLORS },
  ],
  'kids-fashion': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Clothing', 'Shoes', 'Native Wear', 'School Wear', 'Party Wear', 'Other'] },
    { key: 'ageGroup', label: 'Age group', type: 'select', primary: true, options: ['0-6 Months', '6-12 Months', '1-2 Years', '3-4 Years', '5-6 Years', '7-8 Years', '9-10 Years', '11-12 Years'] },
    { key: 'gender', label: 'For', type: 'select', options: ['Boy', 'Girl', 'Unisex'] },
    { key: 'color', label: 'Colour', type: 'select', options: COLORS },
  ],
  'thrift-okrika': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Tops', 'Dresses', 'Trousers / Jeans', 'Shoes', 'Bags', 'Jackets', 'Bale (Bundle)', 'Mixed', 'Other'] },
    { key: 'gender', label: 'For', type: 'select', primary: true, options: ['Men', 'Women', 'Unisex', 'Kids'] },
    { key: 'grade', label: 'Grade', type: 'select', primary: true, options: ['Grade A (First Selection)', 'Grade B', 'Bale / Bundle'] },
    { key: 'size', label: 'Size', type: 'select', options: ['S', 'M', 'L', 'XL', 'XXL', 'Assorted'] },
  ],
  'sportswear-activewear': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Jersey', 'Tracksuit', 'Gym Wear', 'Leggings', 'Shorts', 'Sports Bra', 'Sneakers', 'Other'] },
    { key: 'gender', label: 'For', type: 'select', primary: true, options: GENDER },
    { key: 'size', label: 'Size', type: 'select', options: ['S', 'M', 'L', 'XL', 'XXL'] },
    { key: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Nike, Adidas' },
    { key: 'color', label: 'Colour', type: 'select', options: COLORS },
  ],
};

async function main() {
  for (const [slug, attributeSchema] of Object.entries(schemas)) {
    const res = await prisma.category.updateMany({ where: { slug }, data: { attributeSchema: attributeSchema as Prisma.InputJsonValue } });
    console.log(`${slug}: ${res.count ? 'schema set' : 'NOT FOUND — seed fashion subcategories first'}`);
  }
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
