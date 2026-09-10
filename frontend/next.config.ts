/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];

    const backendOrigin = (process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:3001/api").replace(/\/api\/?$/, "");

    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
