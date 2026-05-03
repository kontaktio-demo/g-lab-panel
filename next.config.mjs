/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Wycisza ostrzeżenie o wielu lockfile'ach gdy panel żyje obok strony G-Lab.
  outputFileTracingRoot: import.meta.dirname,
  images: {
    remotePatterns: [
      // Pozwól na obrazy hostowane w Supabase Storage (dowolny projekt)
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
};

export default nextConfig;
