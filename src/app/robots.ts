import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/attendance/',
          '/jobs/',
          '/profile/',
          '/bookings/',
        ],
      },
    ],
    sitemap: 'https://zentroservice.in/sitemap.xml',
  }
}