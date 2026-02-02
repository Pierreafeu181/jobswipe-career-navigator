# SEO Components

Reusable components for managing page-specific SEO meta tags.

## SEOHead Component

The `SEOHead` component provides a simple way to manage SEO meta tags on each page.

### Basic Usage

```tsx
import { SEOHead } from '@/components/seo';

const MyPage = () => {
  return (
    <>
      <SEOHead
        title="Page Title"
        description="Page description for search engines (150-160 chars recommended)"
      />
      {/* Your page content */}
    </>
  );
};
```

### Advanced Usage

```tsx
import { SEOHead } from '@/components/seo';

const JobDetailPage = () => {
  const job = useJob(); // Your job data

  return (
    <>
      <SEOHead
        title={`${job.title} chez ${job.company}`}
        description={`Postulez à ${job.title} chez ${job.company} à ${job.location}.`}
        canonical={`https://yourdomain.com/offres/${job.id}`}
        ogImage={job.companyLogo || '/og-image.jpg'}
      />
      {/* Your page content */}
    </>
  );
};
```

### Private Pages (No Indexing)

For authenticated pages that should not appear in search results:

```tsx
import { SEOHead } from '@/components/seo';

const ProfilePage = () => {
  return (
    <>
      <SEOHead
        title="Mon Profil"
        description="Gérez votre profil professionnel"
        noindex={true}  // Prevents search engine indexing
      />
      {/* Your page content */}
    </>
  );
};
```

### With Structured Data (JSON-LD)

For rich results in search engines:

```tsx
import { SEOHead } from '@/components/seo';

const JobDetailPage = () => {
  const job = useJob();

  const jobSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": job.title,
    "description": job.description,
    "datePosted": job.createdAt,
    "hiringOrganization": {
      "@type": "Organization",
      "name": job.company
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": job.location,
        "addressCountry": "FR"
      }
    }
  };

  return (
    <>
      <SEOHead
        title={`${job.title} chez ${job.company}`}
        description={job.shortDescription}
        jsonLd={jobSchema}
      />
      {/* Your page content */}
    </>
  );
};
```

## Props Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | string | ✅ Yes | - | Page title (will be suffixed with " \| JobSwipe") |
| `description` | string | ✅ Yes | - | Meta description (150-160 characters recommended) |
| `canonical` | string | No | `window.location.href` | Canonical URL for the page |
| `ogImage` | string | No | `/og-image.jpg` | OpenGraph image URL |
| `noindex` | boolean | No | `false` | Set to true to prevent search engine indexing |
| `jsonLd` | object \| object[] | No | - | Structured data (JSON-LD) for rich results |

## Notes

### HashRouter Limitation

Since this app uses HashRouter, canonical URLs will include hash fragments (e.g., `https://domain.com/#/page`).
This is a known limitation. For optimal SEO, the app should eventually migrate to BrowserRouter.

### OpenGraph Images

- Default OG image: `/og-image.jpg` (should be 1200x630px)
- Custom images can be provided per page
- Images should be absolute URLs for social platforms

### Structured Data

The `jsonLd` prop accepts:
- Single schema object: `jsonLd={schema}`
- Multiple schemas: `jsonLd={[schema1, schema2]}`

Validate structured data with [Google Rich Results Test](https://search.google.com/test/rich-results).

## Example Pages to Update

### High Priority
- ✅ HomePage
- ✅ Offres (job listings)
- ✅ OffreDetail (individual jobs) - MOST IMPORTANT
- ✅ ProfilePage (noindex)
- ✅ ApplicationDashboard (noindex)

### Medium Priority
- Dashboard (noindex)
- Calendrier (noindex)
- CV page
- OffreScore

### Low Priority (Auth Pages)
- AuthPage (noindex)
- AuthCallback (noindex)
- ForgotPassword (noindex)
- ResetPassword (noindex)

## Testing

After adding SEOHead to a page:

1. **Inspect Page Source**: Right-click → View Page Source → Check `<head>` section
2. **DevTools**: Open Elements → Check `<head>` for meta tags
3. **Build Test**: Run `npm run build` to ensure no errors
4. **Social Sharing**: Test with [Facebook Debugger](https://developers.facebook.com/tools/debug/)

## Future Enhancements

When routing is refactored:
- Update canonical URLs to use clean URLs (no hash)
- Consider implementing dynamic sitemap generation
- Add pagination meta tags for listing pages
- Implement hreflang for multi-language support
