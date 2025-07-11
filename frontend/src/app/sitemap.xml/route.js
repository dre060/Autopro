// frontend/src/app/sitemap.xml/route.js
import { NextResponse } from 'next/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://autoprorepairs.com';

export async function GET() {
  const staticPages = [
    { url: '/', changefreq: 'daily', priority: 1.0 },
    { url: '/about', changefreq: 'weekly', priority: 0.8 },
    { url: '/services', changefreq: 'weekly', priority: 0.9 },
    { url: '/inventory', changefreq: 'daily', priority: 0.9 },
    { url: '/specials', changefreq: 'weekly', priority: 0.8 },
    { url: '/contact', changefreq: 'monthly', priority: 0.7 },
    { url: '/appointment', changefreq: 'weekly', priority: 0.9 },
  ];

  // Try to fetch dynamic vehicle pages
  let vehiclePages = [];
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/vehicles?status=available`);
    if (response.ok) {
      const data = await response.json();
      vehiclePages = (data.vehicles || []).map(vehicle => ({
        url: `/inventory/${vehicle._id}`,
        changefreq: 'weekly',
        priority: 0.7,
        lastmod: vehicle.updatedAt || new Date().toISOString()
      }));
    }
  } catch (error) {
    console.error('Error fetching vehicles for sitemap:', error);
  }

  const allPages = [...staticPages, ...vehiclePages];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    ${page.lastmod ? `<lastmod>${page.lastmod}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;

  return new NextResponse(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}