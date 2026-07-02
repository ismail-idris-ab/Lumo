import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';

// Per-subcategory attribute schemas for Electronics.
// Format matches seed-phone-schema.ts: { key, label, type, primary?, options?, unit?, placeholder? }
// type: 'select' | 'text' | 'number' | 'boolean'. `primary` = headline specs (shown first / used as filters).
// Run AFTER the electronics subcategories are seeded (they must exist first).

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

export const schemas: Record<string, unknown[]> = {
  'laptops-computers': [
    { key: 'brand', label: 'Brand', type: 'select', primary: true, options: ['Apple', 'HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'MSI', 'Microsoft', 'Samsung', 'HUAWEI', 'Toshiba', 'Other'] },
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Laptop', 'Desktop', 'All-in-One', 'Gaming Laptop', 'MacBook', 'Mini PC'] },
    { key: 'processor', label: 'Processor', type: 'select', primary: true, options: ['Intel Celeron', 'Intel Pentium', 'Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9', 'Apple M1', 'Apple M2', 'Apple M3', 'Other'] },
    { key: 'ram', label: 'RAM', type: 'select', primary: true, options: ['2GB', '4GB', '6GB', '8GB', '12GB', '16GB', '32GB', '64GB'] },
    { key: 'storage', label: 'Storage', type: 'select', primary: true, options: ['128GB', '256GB', '512GB', '1TB', '2TB'] },
    { key: 'storageType', label: 'Storage type', type: 'select', options: ['SSD', 'HDD', 'SSD + HDD', 'eMMC'] },
    { key: 'graphics', label: 'Graphics', type: 'select', options: ['Integrated', 'Dedicated (NVIDIA)', 'Dedicated (AMD)'] },
    { key: 'screen', label: 'Display size', type: 'number', unit: 'inches' },
    { key: 'os', label: 'Operating system', type: 'select', options: ['Windows 11', 'Windows 10', 'macOS', 'ChromeOS', 'Linux', 'No OS'] },
  ],
  'audio-music-equipment': [
    { key: 'brand', label: 'Brand', type: 'select', primary: true, options: ['JBL', 'Sony', 'Bose', 'Oraimo', 'LG', 'Samsung', 'Harman Kardon', 'Other'] },
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Bluetooth Speaker', 'Home Theatre', 'Soundbar', 'Amplifier', 'Mixer', 'Microphone', 'PA System', 'DJ Controller', 'Other'] },
    { key: 'connectivity', label: 'Connectivity', type: 'select', primary: true, options: ['Bluetooth', 'Wired', 'Wi-Fi', 'Multiple'] },
    { key: 'power', label: 'Power output', type: 'number', unit: 'W' },
    { key: 'rechargeable', label: 'Rechargeable', type: 'boolean' },
  ],
  'tv-video-equipment': [
    { key: 'brand', label: 'Brand', type: 'select', primary: true, options: ['LG', 'Samsung', 'Sony', 'Hisense', 'TCL', 'Panasonic', 'Nexus', 'Other'] },
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['LED', 'OLED', 'QLED', 'Smart TV', 'Projector', 'Decoder', 'DVD Player', 'Other'] },
    { key: 'screenSize', label: 'Screen size', type: 'select', primary: true, options: ['24"', '32"', '40"', '43"', '50"', '55"', '65"', '75"'] },
    { key: 'resolution', label: 'Resolution', type: 'select', primary: true, options: ['HD', 'Full HD', '4K UHD', '8K'] },
    { key: 'smartTv', label: 'Smart TV', type: 'boolean' },
  ],
  'headphones-earphones': [
    { key: 'brand', label: 'Brand', type: 'select', primary: true, options: ['Apple', 'Samsung', 'Sony', 'JBL', 'Oraimo', 'Bose', 'Beats', 'Anker', 'Other'] },
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Over-Ear', 'On-Ear', 'In-Ear', 'Earbuds (TWS)', 'Neckband'] },
    { key: 'connectivity', label: 'Connectivity', type: 'select', primary: true, options: ['Wireless (Bluetooth)', 'Wired'] },
    { key: 'noiseCancelling', label: 'Noise cancelling', type: 'boolean' },
    { key: 'microphone', label: 'Built-in microphone', type: 'boolean' },
  ],
  'computer-accessories': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Keyboard', 'Mouse', 'Keyboard & Mouse Set', 'Webcam', 'Docking Station', 'Cooling Pad', 'USB Hub', 'Laptop Stand', 'Other'] },
    { key: 'brand', label: 'Brand', type: 'select', options: ['Logitech', 'HP', 'Dell', 'Microsoft', 'Redragon', 'Other'] },
    { key: 'connectivity', label: 'Connectivity', type: 'select', primary: true, options: ['Wired', 'Wireless', 'Bluetooth'] },
  ],
  'computer-hardware': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Processor (CPU)', 'Motherboard', 'RAM', 'Graphics Card (GPU)', 'SSD', 'HDD', 'Power Supply (PSU)', 'Cooling Fan', 'Other'] },
    { key: 'brand', label: 'Brand', type: 'select', options: ['Intel', 'AMD', 'NVIDIA', 'Kingston', 'Corsair', 'Seagate', 'Western Digital', 'Other'] },
    { key: 'spec', label: 'Capacity / spec', type: 'text', primary: true, placeholder: 'e.g. 16GB DDR4 / 512GB / RTX 3060' },
  ],
  'computer-monitors': [
    { key: 'brand', label: 'Brand', type: 'select', primary: true, options: ['Dell', 'HP', 'LG', 'Samsung', 'Asus', 'AOC', 'Other'] },
    { key: 'screenSize', label: 'Screen size', type: 'select', primary: true, options: ['19"', '22"', '24"', '27"', '32"', '34"'] },
    { key: 'resolution', label: 'Resolution', type: 'select', primary: true, options: ['HD', 'Full HD', '2K (QHD)', '4K UHD'] },
    { key: 'panel', label: 'Panel type', type: 'select', options: ['IPS', 'VA', 'TN', 'OLED'] },
    { key: 'refreshRate', label: 'Refresh rate', type: 'select', options: ['60Hz', '75Hz', '120Hz', '144Hz', '165Hz', '240Hz'] },
  ],
  'printers-scanners': [
    { key: 'brand', label: 'Brand', type: 'select', primary: true, options: ['HP', 'Canon', 'Epson', 'Brother', 'Kyocera', 'Other'] },
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Inkjet', 'LaserJet', 'All-in-One', 'Scanner', 'Photocopier', '3D Printer'] },
    { key: 'functions', label: 'Functions', type: 'select', options: ['Print only', 'Print / Scan / Copy', 'Print / Scan / Copy / Fax'] },
    { key: 'color', label: 'Output', type: 'select', options: ['Colour', 'Black & White'] },
    { key: 'connectivity', label: 'Connectivity', type: 'select', options: ['USB', 'Wi-Fi', 'Ethernet', 'Multiple'] },
  ],
  'cameras': [
    { key: 'brand', label: 'Brand', type: 'select', primary: true, options: ['Canon', 'Nikon', 'Sony', 'Fujifilm', 'Panasonic', 'GoPro', 'DJI', 'Other'] },
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['DSLR', 'Mirrorless', 'Point & Shoot', 'Camcorder', 'Action Camera', 'Drone'] },
    { key: 'resolution', label: 'Resolution', type: 'number', unit: 'MP' },
    { key: 'lensIncluded', label: 'Lens included', type: 'boolean' },
  ],
  'game-consoles': [
    { key: 'brand', label: 'Brand', type: 'select', primary: true, options: ['Sony PlayStation', 'Microsoft Xbox', 'Nintendo', 'Other'] },
    { key: 'model', label: 'Model', type: 'select', primary: true, options: ['PS5', 'PS4 Pro', 'PS4', 'PS3', 'Xbox Series X', 'Xbox Series S', 'Xbox One', 'Nintendo Switch', 'Nintendo Switch Lite', 'Other'] },
    { key: 'storage', label: 'Storage', type: 'select', options: ['500GB', '825GB', '1TB', '2TB'] },
    { key: 'controllers', label: 'Controllers included', type: 'number' },
  ],
  'video-games': [
    { key: 'platform', label: 'Platform', type: 'select', primary: true, options: ['PS5', 'PS4', 'Xbox Series', 'Xbox One', 'Nintendo Switch', 'PC', 'Other'] },
    { key: 'genre', label: 'Genre', type: 'select', options: ['Action', 'Sports', 'Racing', 'Adventure', 'Shooter', 'RPG', 'Fighting', 'Other'] },
    { key: 'format', label: 'Format', type: 'select', primary: true, options: ['Disc', 'Digital Code'] },
  ],
  'security-surveillance': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['CCTV Camera', 'DVR', 'NVR', 'Alarm System', 'Intercom', 'Access Control', 'Smart Doorbell', 'Other'] },
    { key: 'brand', label: 'Brand', type: 'select', options: ['Hikvision', 'Dahua', 'Ezviz', 'TP-Link', 'Other'] },
    { key: 'resolution', label: 'Resolution', type: 'select', options: ['720p', '1080p', '2K', '4K'] },
    { key: 'connectivity', label: 'Connectivity', type: 'select', primary: true, options: ['Wired', 'Wireless (Wi-Fi)'] },
    { key: 'nightVision', label: 'Night vision', type: 'boolean' },
  ],
  'networking-products': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Router', 'Modem', 'MiFi', 'Switch', 'Access Point', 'Range Extender', 'Other'] },
    { key: 'brand', label: 'Brand', type: 'select', options: ['TP-Link', 'Tenda', 'Huawei', 'MTN', 'Glo', 'Airtel', 'Other'] },
    { key: 'wifiStandard', label: 'Wi-Fi standard', type: 'select', options: ['Wi-Fi 4', 'Wi-Fi 5', 'Wi-Fi 6', 'Wi-Fi 6E'] },
    { key: 'connectivity', label: 'Connectivity', type: 'select', options: ['Wired', 'Wireless', 'Both'] },
  ],
  'power-accessories': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Charger', 'Cable', 'Power Bank', 'Battery', 'Adapter', 'UPS', 'Surge Protector', 'Other'] },
    { key: 'brand', label: 'Brand', type: 'select', options: ['Oraimo', 'Anker', 'New Age', 'Romoss', 'Other'] },
    { key: 'capacity', label: 'Capacity', type: 'number', unit: 'mAh' },
  ],
  'smart-home-wearables': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Smartwatch', 'Fitness Band', 'Smart Speaker', 'Smart Bulb', 'Smart Plug', 'Smart Camera', 'Other'] },
    { key: 'brand', label: 'Brand', type: 'select', primary: true, options: ['Apple', 'Samsung', 'Xiaomi', 'Oraimo', 'Amazon', 'Huawei', 'Other'] },
    { key: 'compatibility', label: 'Compatibility', type: 'select', options: ['Android', 'iOS', 'Both'] },
    { key: 'connectivity', label: 'Connectivity', type: 'select', options: ['Bluetooth', 'Wi-Fi', 'Both'] },
  ],
  'software': [
    { key: 'type', label: 'Type', type: 'select', primary: true, options: ['Operating System', 'Antivirus', 'Office Suite', 'Design Software', 'Game', 'Other'] },
    { key: 'platform', label: 'Platform', type: 'select', primary: true, options: ['Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Cross-platform'] },
    { key: 'license', label: 'License', type: 'select', options: ['Original / Genuine', 'Subscription', 'Lifetime', 'Other'] },
  ],
};

async function main() {
  for (const [slug, attributeSchema] of Object.entries(schemas)) {
    const res = await prisma.category.updateMany({ where: { slug }, data: { attributeSchema: attributeSchema as Prisma.InputJsonValue } });
    console.log(`${slug}: ${res.count ? 'schema set' : 'NOT FOUND — seed electronics subcategories first'}`);
  }
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
