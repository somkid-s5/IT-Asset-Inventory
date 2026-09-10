/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];

    const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
    const backendOrigin = /^https?:\/\//i.test(configuredApiUrl ?? "")
      ? configuredApiUrl!.replace(/\/api\/?$/, "")
      : (process.env.BACKEND_URL ?? "http://localhost:3001").replace(/\/$/, "");

    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
