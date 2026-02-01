import { Helmet } from 'react-helmet-async';

/**
 * SEOHead Component
 *
 * Reusable component for managing page-specific SEO meta tags.
 *
 * Usage:
 * ```tsx
 * <SEOHead
 *   title="Page Title"
 *   description="Page description for search engines"
 *   canonical="https://yourdomain.com/page"
 *   noindex={false}
 * />
 * ```
 *
 * Features:
 * - Dynamic title and description
 * - Canonical URL management
 * - OpenGraph tags for social sharing
 * - Twitter Card tags
 * - Optional noindex for private pages
 * - JSON-LD structured data support
 *
 * Note: Works with HashRouter - canonical URLs will include hash fragments.
 * This is a known limitation until routing is refactored.
 */

interface SEOHeadProps {
  /** Page title (will be suffixed with " | JobSwipe") */
  title: string;

  /** Meta description for search engines (150-160 characters recommended) */
  description: string;

  /** Canonical URL (optional - defaults to current URL) */
  canonical?: string;

  /** OpenGraph image URL (optional - defaults to /og-image.jpg) */
  ogImage?: string;

  /** Set to true to prevent search engine indexing (for private pages) */
  noindex?: boolean;

  /** Optional JSON-LD structured data (pass as object) */
  jsonLd?: object | object[];
}

export const SEOHead = ({
  title,
  description,
  canonical,
  ogImage = '/og-image.jpg',
  noindex = false,
  jsonLd
}: SEOHeadProps) => {
  // Build full title with site name
  const fullTitle = `${title} | JobSwipe`;

  // Use provided canonical or fall back to current URL
  // Note: With HashRouter, this will include the hash fragment
  const canonicalUrl = canonical || window.location.href;

  // Build full OG image URL (ensure absolute URL for social platforms)
  const fullOgImageUrl = ogImage.startsWith('http')
    ? ogImage
    : `${window.location.origin}${ogImage}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Robots Meta Tag (conditionally prevent indexing) */}
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* OpenGraph Meta Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={fullOgImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${title} - JobSwipe`} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="fr_FR" />
      <meta property="og:site_name" content="JobSwipe" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImageUrl} />
      <meta name="twitter:image:alt" content={`${title} - JobSwipe`} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd])}
        </script>
      )}
    </Helmet>
  );
};
