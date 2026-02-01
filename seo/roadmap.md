# SEO Implementation Roadmap
**Project:** JobSwipe Career Navigator
**Timeline:** 8 weeks to full implementation
**Priority:** CRITICAL
**Last Updated:** 2026-02-01 Evening

---

## ✅ Phase 0: Infrastructure (COMPLETED - 2026-02-01)
**Goal:** Set up SEO infrastructure without touching routing
**Time Spent:** 4 hours
**Status:** ✅ **COMPLETE**

### Completed Tasks

- [x] **Fix language attribute** (5 min)
  - Changed `<html lang="en">` → `<html lang="fr">`
  - File: `index.html:2`
  - Commit: `seo: fix language attribute and enhance social meta tags`

- [x] **Enhance OpenGraph and Twitter meta tags** (20 min)
  - Added og:url, og:image dimensions, og:locale, og:site_name
  - Added twitter:title, twitter:description explicitly
  - Changed image from lovable.dev → local /og-image.jpg
  - Removed incorrect @Lovable Twitter handle
  - File: `index.html:10-30`
  - Commit: `seo: fix language attribute and enhance social meta tags`

- [x] **Install react-helmet-async** (10 min)
  - Installed package (4 dependencies)
  - File: `package.json`, `package-lock.json`
  - Commit: `seo: install and configure react-helmet-async`

- [x] **Configure HelmetProvider** (5 min)
  - Imported and wrapped App with HelmetProvider
  - File: `src/main.tsx:2,78`
  - Commit: `seo: install and configure react-helmet-async`

- [x] **Create SEOHead component** (1.5 hours)
  - Full TypeScript implementation with JSDoc
  - Props: title, description, canonical, ogImage, noindex, jsonLd
  - Auto-generates OpenGraph and Twitter Card tags
  - JSON-LD structured data support
  - Created index.ts for clean imports
  - Created comprehensive README with examples
  - Files: `src/components/seo/SEOHead.tsx`, `src/components/seo/index.ts`, `src/components/seo/README.md`
  - Commit: `seo: create reusable SEOHead component`

- [x] **Verify build succeeds** (5 min)
  - Ran `npm run build` → Success
  - Ran `npm run dev` → Success
  - No breaking changes
  - All existing functionality preserved

### Phase 0 Summary

**Score Improvement:** 15/100 → 25/100 (+10 infrastructure points)
**Files Changed:** 4
**Lines Added:** ~220
**Breaking Changes:** 0
**SEO Infrastructure:** 100% complete ✅

**What This Unlocks:**
- Dynamic meta tags per page
- Proper social sharing configuration
- Structured data support
- Foundation for all future SEO work

---

## 🎯 Phase 1: Implementation (NEXT - High ROI Actions)
**Goal:** Deploy SEO infrastructure to key pages
**Estimated Time:** 2-3 hours
**Expected Score:** 25/100 → 65/100 (+40 points)
**Priority:** 🔴 **URGENT - Infrastructure exists but unused**

### Next Actions (Ordered by ROI)

#### 1.1 Create OG Image ⚠️ **DO FIRST**
**Priority:** 🔴 **CRITICAL**
**Time:** 5-10 minutes
**Difficulty:** Trivial

**Tasks:**
- [ ] Create 1200x630px image
  - Use brand colors (#0f172a background)
  - "JobSwipe" text centered
  - "Trouvez votre emploi d'ingénieur" subtitle
  - Save as `public/og-image.jpg`
  - Keep under 300KB

**Why Critical:**
- index.html already references it (currently 404)
- Breaks social sharing without it
- Visual first impression

**Deliverable:**
- `public/og-image.jpg` (1200x630px, <300KB)

**Testing:**
- [ ] File exists at `/og-image.jpg`
- [ ] Opens in browser
- [ ] Under 300KB

**Commit:** `seo: add placeholder og-image for social sharing`

---

#### 1.2 Add SEOHead to OffreDetail (Job Pages)
**Priority:** 🔴 **CRITICAL - HIGHEST TRAFFIC POTENTIAL**
**Time:** 30-45 minutes
**Difficulty:** Medium

**Tasks:**
- [ ] Import SEOHead in `src/pages/OffreDetail.tsx`
  ```tsx
  import { SEOHead } from '@/components/seo';
  ```

- [ ] Add SEOHead after job is loaded
  ```tsx
  {job && (
    <SEOHead
      title={`${job.title} chez ${job.company}`}
      description={`Postulez à ${job.title} chez ${job.company} à ${job.location}. ${job.contract_type}. Découvrez les détails de l'offre.`}
      canonical={`${window.location.origin}${window.location.pathname}${window.location.hash}`}
    />
  )}
  ```

- [ ] Test with dev server
  - Inspect `<head>` → unique title per job
  - Check OG tags → correct per job
  - Verify no errors

**Deliverable:**
- `src/pages/OffreDetail.tsx` - SEOHead integrated

**Testing:**
- [ ] Job page has unique title in browser tab
- [ ] Inspect source → sees meta tags
- [ ] Different jobs have different titles

**Commit:** `seo: add dynamic meta tags to job detail pages`

---

#### 1.3 Add SEOHead to Offres (Job Listings)
**Priority:** 🔴 **HIGH**
**Time:** 15-20 minutes
**Difficulty:** Easy

**Tasks:**
- [ ] Import SEOHead in `src/pages/Offres.tsx`

- [ ] Add at top of component return
  ```tsx
  <SEOHead
    title="Offres d'emploi pour ingénieurs"
    description="Découvrez des centaines d'offres d'emploi pour ingénieurs débutants et confirmés. Postulez en un clic à votre futur poste."
    canonical={`${window.location.origin}${window.location.pathname}${window.location.hash}`}
  />
  ```

- [ ] Test and verify

**Deliverable:**
- `src/pages/Offres.tsx` - SEOHead added

**Testing:**
- [ ] Page title shows "Offres d'emploi pour ingénieurs | JobSwipe"
- [ ] Meta description present

**Commit:** `seo: add meta tags to job listings page`

---

#### 1.4 Add SEOHead to HomePage
**Priority:** 🔴 **HIGH**
**Time:** 15-20 minutes
**Difficulty:** Easy

**Tasks:**
- [ ] Import SEOHead in `src/pages/HomePage.tsx`

- [ ] Add at top of component return
  ```tsx
  <SEOHead
    title="Trouvez votre emploi d'ingénieur idéal"
    description="Plateforme de recherche d'emploi pour ingénieurs débutants et confirmés. Recommandations intelligentes, suivi simplifié, candidatures en un clic."
    canonical={`${window.location.origin}${window.location.pathname}${window.location.hash}`}
  />
  ```

**Deliverable:**
- `src/pages/HomePage.tsx` - SEOHead added

**Testing:**
- [ ] Homepage title correct
- [ ] Description shows in source

**Commit:** `seo: add optimized meta tags to homepage`

---

#### 1.5 Add noindex to Private Pages (BATCH)
**Priority:** 🔴 **PRIVACY & SEO**
**Time:** 30 minutes (all 4 pages)
**Difficulty:** Trivial

**Tasks:**
- [ ] **ProfilePage** - Add SEOHead with noindex
  ```tsx
  // src/pages/ProfilePage.tsx
  import { SEOHead } from '@/components/seo';

  <SEOHead
    title="Mon Profil"
    description="Gérez votre profil professionnel"
    noindex={true}
  />
  ```

- [ ] **ApplicationDashboard** - Add SEOHead with noindex
  ```tsx
  // src/pages/ApplicationDashboard.tsx
  <SEOHead
    title="Suivi des candidatures"
    description="Suivez vos candidatures en temps réel"
    noindex={true}
  />
  ```

- [ ] **Dashboard** - Add SEOHead with noindex
  ```tsx
  // src/pages/Dashboard.tsx
  <SEOHead
    title="Tableau de bord"
    description="Vue d'ensemble de votre recherche d'emploi"
    noindex={true}
  />
  ```

- [ ] **Calendrier** - Add SEOHead with noindex
  ```tsx
  // src/pages/Calendrier.tsx
  <SEOHead
    title="Calendrier des entretiens"
    description="Planifiez et suivez vos entretiens"
    noindex={true}
  />
  ```

**Deliverables:**
- 4 private pages with noindex

**Testing:**
- [ ] Inspect each page → sees `<meta name="robots" content="noindex,nofollow">`
- [ ] No console errors

**Commit:** `seo: add noindex to all private authenticated pages`

---

#### 1.6 Fix H1 on HomePage
**Priority:** 🟠 **QUICK WIN**
**Time:** 5 minutes
**Difficulty:** Trivial

**Tasks:**
- [ ] Change H2 to H1 in `src/pages/HomePage.tsx:33`
  ```tsx
  // Change from:
  <h2 className="text-4xl font-semibold text-slate-800 mb-3">Bienvenue</h2>

  // To:
  <h1 className="text-4xl font-semibold text-slate-800 mb-3">
    Trouvez votre emploi d'ingénieur idéal
  </h1>
  ```

**Deliverable:**
- HomePage with proper H1

**Testing:**
- [ ] Inspect page → only one H1
- [ ] No visual changes (same styles)

**Commit:** `seo: fix h1 on homepage with keyword-rich heading`

---

#### 1.7 Add Organization Schema to HomePage
**Priority:** 🟡 **STRUCTURED DATA**
**Time:** 20-30 minutes
**Difficulty:** Easy

**Tasks:**
- [ ] Create organization schema object in HomePage
  ```tsx
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "JobSwipe",
    "url": window.location.origin,
    "logo": `${window.location.origin}/icons/icon-512.png`,
    "description": "Plateforme de recherche d'emploi pour ingénieurs débutants et confirmés",
    "foundingDate": "2025"
  };
  ```

- [ ] Pass to SEOHead
  ```tsx
  <SEOHead
    title="Trouvez votre emploi d'ingénieur idéal"
    description="..."
    jsonLd={organizationSchema}
  />
  ```

**Deliverable:**
- HomePage with Organization schema

**Testing:**
- [ ] View source → sees `<script type="application/ld+json">`
- [ ] Validate at https://search.google.com/test/rich-results

**Commit:** `seo: add organization schema to homepage`

---

#### 1.8 Add Resource Hints to index.html
**Priority:** 🟡 **PERFORMANCE**
**Time:** 10 minutes
**Difficulty:** Trivial

**Tasks:**
- [ ] Add preconnect hints in `index.html`
  ```html
  <!-- Add after viewport, before title -->
  <link rel="preconnect" href="https://nzymwghailiihuizzpqp.supabase.co" />
  <link rel="dns-prefetch" href="https://nzymwghailiihuizzpqp.supabase.co" />
  ```

**Deliverable:**
- index.html with resource hints

**Testing:**
- [ ] Network tab shows preconnect working
- [ ] Faster API connections

**Commit:** `seo: add preconnect hints for faster api connections`

---

### Phase 1 Completion Checklist

**When all actions complete:**
- [ ] 1.1 OG image created
- [ ] 1.2 OffreDetail has SEOHead
- [ ] 1.3 Offres has SEOHead
- [ ] 1.4 HomePage has SEOHead
- [ ] 1.5 All 4 private pages have noindex
- [ ] 1.6 HomePage H1 fixed
- [ ] 1.7 Organization schema on homepage
- [ ] 1.8 Resource hints added

**Verification:**
- [ ] Run `npm run build` → Success
- [ ] No console errors
- [ ] Inspect each page → correct meta tags
- [ ] Score improved: 25 → 65

**Expected Results:**
- 7/18 pages with proper SEO
- Private pages protected with noindex
- Basic structured data in place
- Foundation for future improvements

**Total Time:** 2-3 hours
**Impact:** +40 SEO score points
**Risk:** Zero (no routing changes)

---

## Phase 2: Remaining Pages (Week 2) - DEFERRED
**Goal:** Make site crawlable and indexable
**Estimated Time:** 24-32 hours

### 1.1 Replace HashRouter with BrowserRouter
**Priority:** 🔴 **CRITICAL** (DO THIS FIRST)
**Time:** 6-8 hours
**Difficulty:** Medium

**Tasks:**
- [ ] **Replace HashRouter in `src/App.tsx:71`**
  ```tsx
  // Change from:
  import { HashRouter } from "react-router-dom";
  <HashRouter>

  // Change to:
  import { BrowserRouter } from "react-router-dom";
  <BrowserRouter basename="/jobswipe-career-navigator">
  ```

- [ ] **Configure SPA fallback for GitHub Pages**
  - Option A: Add `404.html` redirect hack
    ```bash
    cp dist/index.html dist/404.html
    ```
  - Option B: Migrate to Vercel (recommended)
    - Better SEO support
    - Automatic SPA routing
    - No base path required

- [ ] **Update all internal links**
  - Remove `#` from hardcoded URLs
  - Update test suite if any
  - Test all route transitions

- [ ] **Test deployment**
  - Verify all routes work with direct navigation
  - Test browser back/forward buttons
  - Confirm URL structure: `/offres/123` not `/#/offres/123`

**Deliverables:**
- `src/App.tsx` - Updated router
- `vercel.json` or `404.html` - SPA routing config
- All routes accessible via clean URLs

**Testing Checklist:**
- [ ] Navigate to `/offres` directly → works
- [ ] Refresh on `/offres/123` → doesn't 404
- [ ] Browser back button → works
- [ ] External links to specific routes → work

---

### 1.2 Create sitemap.xml
**Priority:** 🔴 **CRITICAL**
**Time:** 8-10 hours
**Difficulty:** Medium

**Tasks:**
- [ ] **Create static sitemap: `public/sitemap.xml`**
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
          xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

    <!-- Homepage -->
    <url>
      <loc>https://yourdomain.com/</loc>
      <lastmod>2026-02-01</lastmod>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
    </url>

    <!-- Job Listings -->
    <url>
      <loc>https://yourdomain.com/jobswipe/offres</loc>
      <lastmod>2026-02-01</lastmod>
      <changefreq>hourly</changefreq>
      <priority>0.9</priority>
    </url>

    <!-- Add all static pages -->
  </urlset>
  ```

- [ ] **Create dynamic job sitemap endpoint: `backend/routers/sitemap.py`**
  ```python
  from fastapi import APIRouter
  from fastapi.responses import Response

  router = APIRouter()

  @router.get("/sitemap-jobs.xml")
  async def jobs_sitemap():
      # Fetch all active jobs from Supabase
      jobs = await fetch_all_jobs()

      xml = generate_jobs_sitemap(jobs)
      return Response(content=xml, media_type="application/xml")
  ```

- [ ] **Create sitemap index: `public/sitemap-index.xml`**
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
      <loc>https://yourdomain.com/sitemap.xml</loc>
      <lastmod>2026-02-01</lastmod>
    </sitemap>
    <sitemap>
      <loc>https://yourdomain.com/api/sitemap-jobs.xml</loc>
      <lastmod>2026-02-01</lastmod>
    </sitemap>
  </sitemapindex>
  ```

- [ ] **Update `public/robots.txt`**
  ```
  User-agent: *
  Allow: /
  Disallow: /profil
  Disallow: /dashboard
  Disallow: /application-dashboard
  Disallow: /calendrier
  Disallow: /auth/
  Crawl-delay: 1

  Sitemap: https://yourdomain.com/sitemap-index.xml
  Sitemap: https://yourdomain.com/sitemap.xml
  Sitemap: https://yourdomain.com/api/sitemap-jobs.xml
  ```

- [ ] **Add sitemap to build process**
  - Ensure static sitemap is copied to dist/
  - Generate fresh sitemap on each build

**Deliverables:**
- `public/sitemap.xml` - Static pages sitemap
- `backend/routers/sitemap.py` - Dynamic jobs sitemap
- `public/robots.txt` - Updated with sitemap references

**Testing:**
- [ ] Access https://yourdomain.com/sitemap.xml → valid XML
- [ ] Validate at https://www.xml-sitemaps.com/validate-xml-sitemap.html
- [ ] Submit to Google Search Console

---

### 1.3 Install & Configure react-helmet-async
**Priority:** 🔴 **CRITICAL**
**Time:** 4-6 hours
**Difficulty:** Easy

**Tasks:**
- [ ] **Install package**
  ```bash
  npm install react-helmet-async
  ```

- [ ] **Wrap app with HelmetProvider in `src/main.tsx:78`**
  ```tsx
  import { HelmetProvider } from 'react-helmet-async';

  createRoot(document.getElementById("root")!).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
  ```

- [ ] **Create SEO component: `src/components/seo/SEOHead.tsx`**
  ```tsx
  import { Helmet } from 'react-helmet-async';

  interface SEOHeadProps {
    title: string;
    description: string;
    canonical?: string;
    ogImage?: string;
    noindex?: boolean;
    jsonLd?: object;
  }

  export const SEOHead = ({
    title,
    description,
    canonical,
    ogImage = '/default-og-image.jpg',
    noindex = false,
    jsonLd
  }: SEOHeadProps) => {
    const fullTitle = `${title} | JobSwipe`;
    const url = canonical || window.location.href;

    return (
      <Helmet>
        <title>{fullTitle}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />

        {noindex && <meta name="robots" content="noindex,nofollow" />}

        {/* OpenGraph */}
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:type" content="website" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={fullTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />

        {/* JSON-LD Structured Data */}
        {jsonLd && (
          <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>
        )}
      </Helmet>
    );
  };
  ```

- [ ] **Test implementation**
  - Verify meta tags render in `<head>`
  - Check React DevTools for no errors
  - Confirm no duplicate tags

**Deliverables:**
- `package.json` - react-helmet-async installed
- `src/main.tsx` - HelmetProvider wrapper
- `src/components/seo/SEOHead.tsx` - Reusable component

**Testing:**
- [ ] Run app, inspect `<head>` → sees dynamic meta tags
- [ ] Navigate between pages → meta tags update
- [ ] No console errors

---

### 1.4 Add Canonical Tags to All Pages
**Priority:** 🔴 **CRITICAL**
**Time:** 6-8 hours
**Difficulty:** Medium

**Tasks:**
- [ ] **Update `src/pages/HomePage.tsx`**
  ```tsx
  import { SEOHead } from '@/components/seo/SEOHead';

  const HomePage = () => {
    return (
      <>
        <SEOHead
          title="Trouvez votre emploi d'ingénieur"
          description="JobSwipe aide les étudiants et jeunes diplômés ingénieurs à trouver leur emploi idéal avec des recommandations intelligentes."
          canonical="https://yourdomain.com/"
        />
        {/* Page content */}
      </>
    );
  };
  ```

- [ ] **Update `src/pages/Offres.tsx`**
  ```tsx
  <SEOHead
    title="Offres d'emploi pour ingénieurs"
    description="Découvrez des centaines d'offres d'emploi pour ingénieurs débutants et confirmés. Postulez en un clic."
    canonical="https://yourdomain.com/jobswipe/offres"
  />
  ```

- [ ] **Update `src/pages/OffreDetail.tsx`** (MOST CRITICAL)
  ```tsx
  const OffreDetail = () => {
    const { id } = useParams();
    const [job, setJob] = useState<Job | null>(null);

    // After job is fetched
    return (
      <>
        {job && (
          <SEOHead
            title={`${job.title} chez ${job.company}`}
            description={`Postulez à ${job.title} chez ${job.company} à ${job.location}. ${job.contract_type}. Voir les détails de l'offre.`}
            canonical={`https://yourdomain.com/offres/${id}`}
            ogImage={job.company_logo || '/default-job-image.jpg'}
          />
        )}
        {/* Page content */}
      </>
    );
  };
  ```

- [ ] **Add noindex to private pages:**

  **`src/pages/ProfilePage.tsx`:**
  ```tsx
  <SEOHead
    title="Mon Profil"
    description="Gérez votre profil professionnel"
    canonical="https://yourdomain.com/profil"
    noindex={true}
  />
  ```

  **`src/pages/ApplicationDashboard.tsx`:**
  ```tsx
  <SEOHead
    title="Suivi des candidatures"
    description="Suivez vos candidatures en temps réel"
    canonical="https://yourdomain.com/application-dashboard"
    noindex={true}
  />
  ```

  **`src/pages/Dashboard.tsx`, `src/pages/Calendrier.tsx`:**
  ```tsx
  noindex={true}
  ```

- [ ] **Update remaining page components:**
  - [ ] `src/pages/AuthPage.tsx` → noindex
  - [ ] `src/pages/AuthCallback.tsx` → noindex
  - [ ] `src/pages/ForgotPassword.tsx` → noindex
  - [ ] `src/pages/ResetPassword.tsx` → noindex
  - [ ] `src/pages/CV.tsx` → noindex (if private) or SEO optimize
  - [ ] `src/pages/OffreFiche.tsx` → SEO optimize
  - [ ] `src/pages/OffreScore.tsx` → SEO optimize or noindex
  - [ ] `src/pages/NotFound.tsx` → add meta but don't index

**Deliverables:**
- All 19 page components with SEOHead
- Private pages have noindex
- Public pages have unique, optimized meta

**Testing Checklist:**
- [ ] Visit each page, inspect `<head>` → correct canonical
- [ ] Private pages have `noindex,nofollow`
- [ ] Public pages have unique title/description
- [ ] No duplicate canonical tags

---

## Phase 2: Structured Data & OpenGraph (Week 2-3)
**Goal:** Rich results and proper social sharing
**Estimated Time:** 24-32 hours

### 2.1 Create JobPosting Schema Component
**Priority:** 🔴 **HIGH**
**Time:** 8-10 hours
**Difficulty:** Medium

**Tasks:**
- [ ] **Create `src/components/seo/JobSchema.tsx`**
  ```tsx
  interface JobSchemaProps {
    job: Job;
  }

  export const JobSchema = ({ job }: JobSchemaProps) => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      "title": job.title,
      "description": job.raw?.description || job.title,
      "datePosted": job.created_at,
      "validThrough": getExpiryDate(job.created_at), // +30 days
      "employmentType": mapContractType(job.contract_type),
      "hiringOrganization": {
        "@type": "Organization",
        "name": job.company,
        "sameAs": job.company_website || undefined
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

    // Add salary if available
    if (job.salary_min && job.salary_max) {
      schema.baseSalary = {
        "@type": "MonetaryAmount",
        "currency": "EUR",
        "value": {
          "@type": "QuantitativeValue",
          "minValue": job.salary_min,
          "maxValue": job.salary_max,
          "unitText": "YEAR"
        }
      };
    }

    return null; // Schema injected via SEOHead
  };
  ```

- [ ] **Integrate into `src/pages/OffreDetail.tsx`**
  ```tsx
  <SEOHead
    title={`${job.title} chez ${job.company}`}
    description={...}
    canonical={...}
    jsonLd={generateJobSchema(job)}
  />
  ```

- [ ] **Add helper functions:**
  ```tsx
  const mapContractType = (type: string): string => {
    const mapping = {
      'CDI': 'FULL_TIME',
      'CDD': 'CONTRACTOR',
      'Stage': 'INTERN',
      'Alternance': 'INTERN'
    };
    return mapping[type] || 'OTHER';
  };

  const getExpiryDate = (createdAt: string): string => {
    const date = new Date(createdAt);
    date.setDate(date.getDate() + 30);
    return date.toISOString();
  };
  ```

**Deliverables:**
- `src/components/seo/JobSchema.tsx`
- All job detail pages have JobPosting schema

**Testing:**
- [ ] Validate with [Google Rich Results Test](https://search.google.com/test/rich-results)
- [ ] Check for errors in schema
- [ ] Verify all required fields present

---

### 2.2 Add Organization & Website Schema
**Priority:** 🟠 **HIGH**
**Time:** 4-6 hours
**Difficulty:** Easy

**Tasks:**
- [ ] **Create `src/components/seo/OrganizationSchema.tsx`**
  ```tsx
  export const OrganizationSchema = () => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "JobSwipe",
      "url": "https://yourdomain.com",
      "logo": "https://yourdomain.com/logo.png",
      "description": "Plateforme de recherche d'emploi pour ingénieurs débutants et confirmés",
      "foundingDate": "2025",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "email": "contact@jobswipe.com"
      },
      "sameAs": [
        "https://twitter.com/jobswipe",
        "https://linkedin.com/company/jobswipe"
      ]
    };

    return (
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    );
  };
  ```

- [ ] **Add WebSite schema with SearchAction**
  ```tsx
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "JobSwipe",
    "url": "https://yourdomain.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://yourdomain.com/jobswipe/offres?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };
  ```

- [ ] **Add to `src/pages/HomePage.tsx`**
  ```tsx
  <SEOHead
    jsonLd={[organizationSchema, websiteSchema]}
  />
  ```

**Deliverables:**
- Organization schema on homepage
- WebSite schema with search box

**Testing:**
- [ ] Validate in Rich Results Test
- [ ] Verify no errors

---

### 2.3 Fix OpenGraph Tags
**Priority:** 🟠 **HIGH**
**Time:** 6-8 hours
**Difficulty:** Medium

**Tasks:**
- [ ] **Create proper OG images: `public/og-images/`**
  - Default: 1200x630px
  - Job-specific: Generate dynamically or use template

- [ ] **Update `index.html:10-17`**
  ```html
  <!-- Remove static OG tags, let helmet manage them -->
  <!-- Delete lines 10-17 -->
  ```

- [ ] **Ensure SEOHead includes all OG tags:**
  ```tsx
  <meta property="og:title" content={fullTitle} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={url} />
  <meta property="og:image" content={ogImage} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={`${title} - JobSwipe`} />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="fr_FR" />
  <meta property="og:site_name" content="JobSwipe" />
  ```

- [ ] **Add Twitter-specific tags:**
  ```tsx
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@YourTwitterHandle" />
  <meta name="twitter:creator" content="@YourTwitterHandle" />
  <meta name="twitter:title" content={fullTitle} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={ogImage} />
  <meta name="twitter:image:alt" content={`${title} - JobSwipe`} />
  ```

- [ ] **Test social sharing:**
  - Facebook: [Sharing Debugger](https://developers.facebook.com/tools/debug/)
  - Twitter: [Card Validator](https://cards-dev.twitter.com/validator)
  - LinkedIn: [Post Inspector](https://www.linkedin.com/post-inspector/)

**Deliverables:**
- Default OG image created
- All pages have proper OG tags
- Twitter cards configured

**Testing Checklist:**
- [ ] Share homepage on Facebook → correct preview
- [ ] Share job page on LinkedIn → shows job details
- [ ] Tweet job link → card displays correctly

---

### 2.4 Add BreadcrumbList Schema
**Priority:** 🟡 **MEDIUM**
**Time:** 4-6 hours
**Difficulty:** Easy

**Tasks:**
- [ ] **Create `src/components/seo/BreadcrumbSchema.tsx`**
  ```tsx
  interface BreadcrumbItem {
    name: string;
    url: string;
  }

  interface BreadcrumbSchemaProps {
    items: BreadcrumbItem[];
  }

  export const BreadcrumbSchema = ({ items }: BreadcrumbSchemaProps) => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": item.url
      }))
    };

    return null; // Injected via SEOHead
  };
  ```

- [ ] **Add breadcrumbs UI component**
  - Use `src/components/ui/breadcrumb.tsx` (if exists)
  - Or create new component

- [ ] **Integrate in job pages:**
  ```tsx
  const breadcrumbs = [
    { name: "Accueil", url: "https://yourdomain.com/" },
    { name: "Offres d'emploi", url: "https://yourdomain.com/jobswipe/offres" },
    { name: job.title, url: `https://yourdomain.com/offres/${job.id}` }
  ];

  <SEOHead
    jsonLd={[jobSchema, breadcrumbSchema(breadcrumbs)]}
  />
  ```

**Deliverables:**
- Breadcrumb schema on job pages
- Visual breadcrumb navigation

**Testing:**
- [ ] Validate in Rich Results Test
- [ ] Check breadcrumbs appear in search results (may take weeks)

---

## Phase 3: Performance Optimization (Week 4-5)
**Goal:** Improve Core Web Vitals
**Estimated Time:** 24-32 hours

### 3.1 Implement Code Splitting
**Priority:** 🔴 **HIGH**
**Time:** 8-12 hours
**Difficulty:** Medium

**Tasks:**
- [ ] **Add lazy loading to `src/App.tsx`**
  ```tsx
  import { lazy, Suspense } from 'react';
  import { BrowserRouter, Routes, Route } from 'react-router-dom';

  // Lazy load heavy pages
  const HomePage = lazy(() => import('./pages/HomePage'));
  const Offres = lazy(() => import('./pages/Offres'));
  const OffreDetail = lazy(() => import('./pages/OffreDetail'));
  const ApplicationDashboard = lazy(() => import('./pages/ApplicationDashboard'));
  const ProfilePage = lazy(() => import('./pages/ProfilePage'));
  const Dashboard = lazy(() => import('./pages/Dashboard'));
  const Calendrier = lazy(() => import('./pages/Calendrier'));
  const OffreFiche = lazy(() => import('./pages/OffreFiche'));
  const OffreScore = lazy(() => import('./pages/OffreScore'));

  // Keep auth pages in main bundle (small)
  import AuthPage from './pages/AuthPage';
  import AuthCallback from './pages/AuthCallback';
  import ForgotPassword from './pages/ForgotPassword';
  import ResetPassword from './pages/ResetPassword';
  import NotFound from './pages/NotFound';

  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Routes */}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
  ```

- [ ] **Create loading component: `src/components/Loading.tsx`**
  ```tsx
  export const Loading = () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );
  ```

- [ ] **Test lazy loading**
  - Check Network tab for code splitting
  - Verify routes load on-demand
  - Ensure no broken imports

**Deliverables:**
- Lazy-loaded page components
- Loading fallback component
- Reduced initial bundle size

**Target:**
- Initial bundle: < 300KB (currently 1.4MB)
- Route chunks: < 50KB each

---

### 3.2 Optimize Vite Build Configuration
**Priority:** 🔴 **HIGH**
**Time:** 6-8 hours
**Difficulty:** Medium

**Tasks:**
- [ ] **Update `vite.config.ts`**
  ```ts
  import { defineConfig } from "vite";
  import react from "@vitejs/plugin-react-swc";
  import path from "path";

  export default defineConfig(({ mode }) => ({
    base: "/jobswipe-career-navigator/",

    build: {
      // Chunk splitting
      rollupOptions: {
        output: {
          manualChunks: {
            // React ecosystem
            'react-vendor': [
              'react',
              'react-dom',
              'react-router-dom'
            ],
            // UI library
            'ui-vendor': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-toast',
              '@radix-ui/react-select',
              // Add other used Radix components
            ],
            // State management
            'query-vendor': [
              '@tanstack/react-query'
            ],
            // Supabase
            'supabase-vendor': [
              '@supabase/supabase-js'
            ],
            // Icons (heavy)
            'icons-vendor': [
              'lucide-react'
            ]
          }
        }
      },

      // Compression
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production'
        }
      },

      // CSS code splitting
      cssCodeSplit: true,

      // Source maps (disable in production)
      sourcemap: mode !== 'production'
    },

    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query'
      ]
    },

    plugins: [
      react(),
      mode === "development" && componentTagger()
    ].filter(Boolean),

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }));
  ```

- [ ] **Add compression plugin**
  ```bash
  npm install -D vite-plugin-compression
  ```

  ```ts
  import compression from 'vite-plugin-compression';

  plugins: [
    react(),
    compression({ algorithm: 'gzip' }),
    compression({ algorithm: 'brotliCompress', ext: '.br' })
  ]
  ```

- [ ] **Analyze bundle**
  ```bash
  npm install -D rollup-plugin-visualizer
  npm run build
  # Check stats.html
  ```

**Deliverables:**
- Optimized vite.config.ts
- Chunked vendor bundles
- Compressed assets

**Target:**
- Main bundle: < 200KB gzipped
- Total initial load: < 500KB

---

### 3.3 Image Optimization
**Priority:** 🟠 **HIGH**
**Time:** 6-8 hours
**Difficulty:** Medium

**Tasks:**
- [ ] **Install image optimization tools**
  ```bash
  npm install -D vite-plugin-image-optimizer sharp
  ```

- [ ] **Add to vite.config.ts:**
  ```ts
  import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

  plugins: [
    ViteImageOptimizer({
      test: /\.(jpe?g|png|gif|tiff|webp|svg|avif)$/i,
      include: undefined,
      exclude: undefined,
      includePublic: true,
      logStats: true,
      ansiColors: true,
      svg: {
        multipass: true,
        plugins: [
          {
            name: 'preset-default',
            params: {
              overrides: {
                cleanupNumericValues: false,
                removeViewBox: false,
              },
            },
          },
        ],
      },
      png: {
        quality: 80,
      },
      jpeg: {
        quality: 80,
      },
      jpg: {
        quality: 80,
      },
      webp: {
        quality: 80,
      },
    }),
  ]
  ```

- [ ] **Create image component: `src/components/OptimizedImage.tsx`**
  ```tsx
  interface OptimizedImageProps {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
    priority?: boolean;
  }

  export const OptimizedImage = ({
    src,
    alt,
    width,
    height,
    className,
    priority = false
  }: OptimizedImageProps) => {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
      />
    );
  };
  ```

- [ ] **Update image references:**
  - Company logos
  - Job images
  - Icons
  - OG images

- [ ] **Add WebP conversion**
  - Convert all PNG/JPG to WebP
  - Keep original as fallback

**Deliverables:**
- Image optimization plugin
- OptimizedImage component
- WebP images in public/

**Target:**
- Images < 100KB each
- WebP format where supported
- Lazy loading on all images

---

### 3.4 Add Resource Hints
**Priority:** 🟡 **MEDIUM**
**Time:** 2-4 hours
**Difficulty:** Easy

**Tasks:**
- [ ] **Update `index.html`**
  ```html
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Preconnect to external domains -->
    <link rel="preconnect" href="https://nzymwghailiihuizzpqp.supabase.co" />
    <link rel="dns-prefetch" href="https://nzymwghailiihuizzpqp.supabase.co" />

    <!-- Preconnect to API -->
    <link rel="preconnect" href="https://your-api-domain.com" />
    <link rel="dns-prefetch" href="https://your-api-domain.com" />

    <!-- Preload critical fonts (if any) -->
    <link rel="preload" href="/fonts/your-font.woff2" as="font" type="font/woff2" crossorigin />

    <!-- Existing meta tags -->
  </head>
  ```

- [ ] **Add module preload in vite.config.ts**
  ```ts
  build: {
    modulePreload: {
      polyfill: true,
      resolveDependencies: (url, deps) => {
        // Preload critical chunks
        return deps.filter(dep =>
          dep.includes('react') ||
          dep.includes('router')
        );
      }
    }
  }
  ```

**Deliverables:**
- Preconnect hints added
- DNS prefetch for external domains
- Module preload configured

**Target:**
- Faster API connection establishment
- Reduced DNS lookup time

---

## Phase 4: Content & Architecture (Week 6-8)
**Goal:** Make content indexable and improve structure
**Estimated Time:** 40-60 hours

### 4.1 Make Job Pages Public (Critical Decision)
**Priority:** 🔴 **ARCHITECTURAL**
**Time:** 20-40 hours
**Difficulty:** High

**Decision Point:**
Choose one of:
- [ ] **Option A: Public Job Pages** (Recommended for SEO)
- [ ] **Option B: Keep Auth-Only** (Zero SEO visibility)

**If Option A (Public Jobs):**

**Tasks:**
- [ ] **Create public job detail route**
  ```tsx
  // In App.tsx - OUTSIDE auth check
  <Routes>
    {/* Public routes */}
    <Route path="/jobs/:id" element={<PublicJobDetail />} />
    <Route path="/auth/callback" element={<AuthCallback />} />

    {authReady && session ? (
      // Authenticated routes
    ) : (
      // Login page
    )}
  </Routes>
  ```

- [ ] **Create `src/pages/PublicJobDetail.tsx`**
  ```tsx
  // Similar to OffreDetail but without auth requirements
  // Show job details publicly
  // Add "Sign up to apply" CTA for auth-only features
  ```

- [ ] **Update internal links**
  - Job listings link to `/jobs/:id`
  - Authenticated users can still use `/offres/:id`
  - Add canonical from `/offres/:id` → `/jobs/:id`

- [ ] **Add auth gate for actions**
  ```tsx
  const handleApply = () => {
    if (!session) {
      navigate('/auth?redirect=/jobs/' + jobId);
      return;
    }
    // Apply logic
  };
  ```

- [ ] **Test thoroughly**
  - Public access works
  - Auth features still protected
  - SEO tags correct on public pages

**Deliverables:**
- Public job detail page
- Auth gates on sensitive actions
- Updated routing logic

**Expected Impact:**
+1000% indexable content
+500-800% organic traffic potential

---

### 4.2 Fix H1/H2 Hierarchy
**Priority:** 🟠 **HIGH**
**Time:** 4-6 hours
**Difficulty:** Easy

**Tasks:**
- [ ] **Audit all pages for H1:**
  ```bash
  grep -r "<h1" src/pages/
  ```

- [ ] **Fix H1 issues:**

  **`src/pages/HomePage.tsx:34`:**
  ```tsx
  // Change from:
  <h2 className="text-4xl font-semibold text-slate-800 mb-3">Bienvenue</h2>

  // To:
  <h1 className="text-4xl font-semibold text-slate-800 mb-3">
    Trouvez votre emploi d'ingénieur idéal
  </h1>
  ```

  **`src/pages/Offres.tsx`:**
  ```tsx
  // Add H1:
  <h1 className="sr-only">Offres d'emploi pour ingénieurs</h1>
  // (Visually hidden but exists for SEO)
  ```

  **`src/pages/OffreDetail.tsx:742`:**
  ```tsx
  // Already has H2 "Poste", promote to H1:
  <h1 className="text-xl font-bold text-foreground pr-16">{job.title}</h1>
  ```

  **`src/pages/ApplicationDashboard.tsx:613`:**
  ```tsx
  // Already correct:
  <h1 className="text-3xl font-bold text-slate-800">Suivi des candidatures</h1>
  ```

- [ ] **Fix H2 hierarchy in lists:**
  - Job cards should be H3 if under H2 section
  - Ensure no H3 before H2

- [ ] **Validate with W3C checker**

**Deliverables:**
- All pages have single H1
- Logical heading hierarchy
- No skipped levels (H1 → H3)

**Testing:**
- [ ] Run HeadingsMap browser extension
- [ ] Check hierarchy is logical
- [ ] No duplicate H1s

---

### 4.3 Improve Internal Linking
**Priority:** 🟠 **HIGH**
**Time:** 8-12 hours
**Difficulty:** Medium

**Tasks:**
- [ ] **Add breadcrumb component to job pages:**
  ```tsx
  import { Breadcrumb } from '@/components/ui/breadcrumb';

  <Breadcrumb>
    <BreadcrumbItem><a href="/">Accueil</a></BreadcrumbItem>
    <BreadcrumbItem><a href="/jobswipe/offres">Offres</a></BreadcrumbItem>
    <BreadcrumbItem>{job.title}</BreadcrumbItem>
  </Breadcrumb>
  ```

- [ ] **Add related jobs section:**
  ```tsx
  // In OffreDetail.tsx
  <section>
    <h2>Offres similaires</h2>
    {relatedJobs.map(job => (
      <JobCard key={job.id} job={job} />
    ))}
  </section>
  ```

- [ ] **Add category links to homepage:**
  ```tsx
  <section>
    <h2>Rechercher par catégorie</h2>
    <ul>
      <li><Link to="/jobs?category=data-science">Data Science</Link></li>
      <li><Link to="/jobs?category=frontend">Frontend</Link></li>
      <li><Link to="/jobs?category=backend">Backend</Link></li>
      {/* More categories */}
    </ul>
  </section>
  ```

- [ ] **Add footer with internal links:**
  ```tsx
  // Create src/components/Footer.tsx
  <footer>
    <nav>
      <h3>Navigation</h3>
      <ul>
        <li><Link to="/">Accueil</Link></li>
        <li><Link to="/jobswipe/offres">Toutes les offres</Link></li>
        <li><Link to="/about">À propos</Link></li>
      </ul>
    </nav>

    <nav>
      <h3>Catégories populaires</h3>
      <ul>
        <li><Link to="/jobs?category=data-science">Data Science</Link></li>
        {/* More */}
      </ul>
    </nav>
  </footer>
  ```

- [ ] **Add pagination links if applicable:**
  ```tsx
  <Link rel="next" to="/jobs?page=2">Page suivante</Link>
  ```

**Deliverables:**
- Breadcrumbs on all job pages
- Related jobs section
- Category navigation
- Footer with links

**Target:**
- Every page has 5+ internal links
- Clear site hierarchy
- Better PageRank distribution

---

### 4.4 Add FAQ Schema
**Priority:** 🟡 **MEDIUM**
**Time:** 4-6 hours
**Difficulty:** Easy

**Tasks:**
- [ ] **Create FAQ data:**
  ```tsx
  // src/data/faq.ts
  export const faqItems = [
    {
      question: "Comment postuler à une offre d'emploi ?",
      answer: "Créez un compte gratuit, complétez votre profil, puis cliquez sur 'Postuler' sur l'offre de votre choix."
    },
    {
      question: "JobSwipe est-il gratuit ?",
      answer: "Oui, JobSwipe est entièrement gratuit pour les candidats."
    },
    // More FAQs
  ];
  ```

- [ ] **Create FAQ component:**
  ```tsx
  // src/components/FAQ.tsx
  import { Accordion } from '@/components/ui/accordion';
  import { faqItems } from '@/data/faq';

  export const FAQ = () => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqItems.map(item => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer
        }
      }))
    };

    return (
      <>
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>

        <Accordion>
          {faqItems.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </>
    );
  };
  ```

- [ ] **Add to homepage:**
  ```tsx
  <section>
    <h2>Questions fréquentes</h2>
    <FAQ />
  </section>
  ```

**Deliverables:**
- FAQ section with schema
- Accordion UI for FAQs
- Rich results potential

**Testing:**
- [ ] Validate FAQ schema in Rich Results Test

---

### 4.5 Fix Language Attribute
**Priority:** 🟡 **MEDIUM**
**Time:** 30 minutes
**Difficulty:** Easy

**Tasks:**
- [ ] **Update `index.html:2`**
  ```html
  <!-- Change from: -->
  <html lang="en">

  <!-- To: -->
  <html lang="fr">
  ```

- [ ] **Add hreflang if planning multi-language:**
  ```tsx
  // In SEOHead component
  <link rel="alternate" hreflang="fr" href={url} />
  <link rel="alternate" hreflang="x-default" href={url} />
  ```

**Deliverables:**
- Correct language attribute
- Hreflang tags (if needed)

---

## Phase 5: Monitoring & Iteration (Ongoing)
**Goal:** Track performance and iterate
**Timeline:** Ongoing after launch

### 5.1 Set Up Google Search Console
**Priority:** 🔴 **CRITICAL**
**Time:** 2-4 hours

**Tasks:**
- [ ] **Verify site ownership**
  - Add HTML meta tag verification
  - Or use DNS TXT record

- [ ] **Submit sitemaps**
  - Submit sitemap-index.xml
  - Monitor indexing status

- [ ] **Enable email notifications**
  - Critical issues alerts
  - Manual action notifications

- [ ] **Monitor key metrics:**
  - Impressions
  - Clicks
  - Average position
  - Coverage errors

**Deliverables:**
- GSC account configured
- Sitemaps submitted
- Alerts enabled

---

### 5.2 Set Up Performance Monitoring
**Priority:** 🟠 **HIGH**
**Time:** 4-6 hours

**Tasks:**
- [ ] **Add Lighthouse CI**
  ```bash
  npm install -D @lhci/cli
  ```

  ```json
  // lighthouserc.json
  {
    "ci": {
      "collect": {
        "numberOfRuns": 3,
        "url": ["http://localhost:8080"]
      },
      "assert": {
        "assertions": {
          "categories:performance": ["error", {"minScore": 0.9}],
          "categories:accessibility": ["error", {"minScore": 0.9}],
          "categories:seo": ["error", {"minScore": 0.9}]
        }
      }
    }
  }
  ```

- [ ] **Add to CI/CD pipeline:**
  ```yaml
  # .github/workflows/deploy.yml
  - name: Run Lighthouse CI
    run: |
      npm install -g @lhci/cli
      lhci autorun
  ```

- [ ] **Set up Core Web Vitals monitoring**
  - Use Google Analytics 4
  - Or Cloudflare Web Analytics

**Deliverables:**
- Lighthouse CI configured
- Performance tracked in CI/CD
- Core Web Vitals monitoring

---

### 5.3 Track Rankings
**Priority:** 🟡 **MEDIUM**
**Time:** 2-3 hours

**Tasks:**
- [ ] **Define target keywords:**
  - "emploi ingénieur débutant"
  - "offre emploi data scientist"
  - "job ingénieur Paris"
  - Company name searches
  - More specific job titles

- [ ] **Set up rank tracking:**
  - Use Google Search Console
  - Or use tool like SEMrush, Ahrefs, SE Ranking

- [ ] **Monitor weekly:**
  - Track position changes
  - Identify ranking opportunities
  - Find content gaps

**Deliverables:**
- Keyword list defined
- Rank tracking configured
- Weekly reports

---

## Completion Checklist

### Critical (Must Complete)
- [ ] Replace HashRouter with BrowserRouter
- [ ] Create sitemap.xml
- [ ] Install react-helmet-async
- [ ] Add canonical tags to all pages
- [ ] Add JobPosting schema to job pages
- [ ] Fix OpenGraph tags
- [ ] Implement code splitting
- [ ] Optimize Vite build config

### High Priority (Complete Within 3 Weeks)
- [ ] Add Organization schema
- [ ] Fix H1 hierarchy on all pages
- [ ] Add noindex to private pages
- [ ] Improve internal linking
- [ ] Add breadcrumbs
- [ ] Image optimization
- [ ] Make job pages public (if applicable)

### Medium Priority (Complete Within 2 Months)
- [ ] Add FAQ schema
- [ ] Fix language attribute
- [ ] Add resource hints
- [ ] Add related jobs sections
- [ ] Create footer with links
- [ ] Set up Google Search Console
- [ ] Set up performance monitoring

### Long Term (Ongoing)
- [ ] Content strategy implementation
- [ ] Link building
- [ ] Rank tracking
- [ ] Continuous optimization

---

## Success Metrics

**Week 1-2 (Post Critical Fixes):**
- [ ] Google Search Console shows 20+ indexed pages (was 1)
- [ ] All sitemaps submitted and processed
- [ ] Zero critical SEO errors in GSC

**Week 3-4 (Post Quick Wins):**
- [ ] Lighthouse SEO score > 90/100 (was ~30)
- [ ] First job pages appear in search results
- [ ] Rich results show in testing tools

**Week 6-8 (Post Full Implementation):**
- [ ] Lighthouse Performance score > 85/100
- [ ] 100+ pages indexed in Google
- [ ] First organic traffic from job searches
- [ ] Impressions > 1,000/week in GSC

**Month 3-6 (Growth Phase):**
- [ ] Organic traffic > 500 visits/month
- [ ] Average position < 20 for target keywords
- [ ] Rich results appearing in SERPs
- [ ] Click-through rate > 2%

---

## Emergency Contacts

**If Build Breaks:**
1. Check vite.config.ts syntax
2. Verify all imports after lazy loading changes
3. Check router basename configuration

**If Indexing Fails:**
1. Verify robots.txt allows crawling
2. Check sitemap is accessible
3. Ensure no noindex tags on public pages
4. Validate structured data

**If Performance Regresses:**
1. Check for unoptimized images
2. Verify code splitting is working
3. Check for large dependencies
4. Review network waterfall

---

## Final Notes

This roadmap is ordered by priority and dependencies. Do not skip Phase 1 (Emergency Fixes) - without proper routing and sitemaps, all other optimizations are pointless.

Each phase builds on the previous one. Follow the order strictly for maximum efficiency.

**Estimated Total Time: 120-160 hours (3-5 weeks full-time)**

The job market won't wait. Start immediately.
