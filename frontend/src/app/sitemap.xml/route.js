// frontend/src/app/sitemap.xml/route.js
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { localVehicles } from '@/data/localInventory';

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.autoprorepairs.com';

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

  // Vehicle detail pages straight from the database + local listings
  let vehiclePages = [];
  try {
    const { data } = await supabaseServer()
      .from('vehicles')
      .select('id, updated_at')
      .eq('status', 'available');
    vehiclePages = [
      ...localVehicles.filter(v => v.status === 'available').map(v => ({ id: v.id, updated_at: v.created_at })),
      ...(data || []),
    ].map(vehicle => ({
      url: `/inventory/${vehicle.id}`,
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: vehicle.updated_at ? new Date(vehicle.updated_at).toISOString() : undefined,
    }));
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