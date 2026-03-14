import type {NextConfig} from 'next';

function resolveSupabaseHostname() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (configuredUrl) {
    try {
      return new URL(configuredUrl).hostname;
    } catch {
      return null;
    }
  }

  const directUrl = process.env.DIRECT_URL;
  if (directUrl) {
    try {
      const parsed = new URL(directUrl);
      const match = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
      if (match?.[1]) {
        return `${match[1]}.supabase.co`;
      }
    } catch {
      return null;
    }
  }

  return null;
}

const supabaseHostname = resolveSupabaseHostname();

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      ...(supabaseHostname
        ? [
            {
              protocol: 'https' as const,
              hostname: supabaseHostname,
              port: '',
              pathname: '/storage/v1/object/**',
            },
          ]
        : []),
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
