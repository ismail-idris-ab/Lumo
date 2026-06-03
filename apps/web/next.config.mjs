import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@lumo/shared'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
  // Monorepo: trace files from the workspace root (silences multi-lockfile warning).
  outputFileTracingRoot: path.join(dirname, '../../'),
  // Linting/typechecking run at the workspace root (pnpm lint / typecheck).
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
