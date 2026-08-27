import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow importing images as static assets with standard <img> tags
  images: {
    unoptimized: true,
  },
  // Stray package-lock.json files up the directory tree (outside this
  // project) make Next.js infer the wrong workspace root, which corrupts
  // relative paths in generated route type stubs. Pin it to this folder.
  outputFileTracingRoot: path.join(import.meta.dirname),
};

export default nextConfig;
