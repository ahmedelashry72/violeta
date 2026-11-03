# VIOLETA Interiors — website

Public site: https://violetaksa.com/
GitHub repository: `ahmedelashry72/violeta`

## Architecture

- Static bilingual Arabic/English website in `index.html`, `styles.css`, `script.js`, and `assets/`.
- Production website: Netlify project `violeta-ksa` from GitHub branch `main`; domain and DNS remain unchanged.
- Cloudflare Worker `violeta`: `worker.js` and `wrangler.jsonc`; endpoints `/api/leads`, `/api/analytics`; D1 database `violeta-leads`.
- Resend email notifications use Cloudflare production bindings/secrets; no credentials in this repository.
- Google Analytics measurement ID `G-H8D81FKVLE`; preserve existing city SEO pages, `robots.txt` and `sitemap.xml`.

## Safe release workflow

1. Develop on `violeta-upgrade` and verify Netlify preview on mobile and desktop without modifying production.
2. Preview form success is simulated; non-production hostnames do **not** write leads or analytics to production.
3. Real lead form on live `violetaksa.com` was tested by the owner on 4 Nov 2026: submission succeeded, Resend email arrived. The Worker writes the D1 record before sending email; the record itself has not been independently inspected.
4. Capture current `main` SHA, successful Netlify production deploy, Cloudflare Worker configuration and bindings as rollback references.
5. Check the latest PR head status. The historical Cloudflare preview failure was API error 10429 (rate limiting), not a proven application-code defect. Cloudflare Preview Builds were disabled on 4 Nov 2026; production build settings remain unchanged.
6. Merge `violeta-upgrade` into `main` **only with owner approval**, and monitor both Netlify and Cloudflare production pipelines. Never change DNS to perform this update.
7. Post-release verify homepage, intro, Arabic/English, map directions, SEO city pages, production lead form, D1, Resend and analytics. Roll back if a critical path fails.

## Local preview

Run `python -m http.server 8000` from the repository root and open `http://localhost:8000`. The local form intentionally does not submit live leads.
