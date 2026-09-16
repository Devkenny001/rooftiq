# Rooftiq — Roofing Company Website

A 24-section, single-page roofing website built with plain HTML, CSS and JavaScript. No frameworks, no build tools required.

## Open it

Double-click `index.html`. It is fully self-contained (CSS and JS are embedded), so it works from any folder, USB stick or web host.

Photos (Unsplash), the hero video (Pexels) and the Google Fonts load from the internet. Offline you still get the full layout with placeholder greys.

## Edit it

The editable source lives in `src/`:

- `src/index.html` — content and structure (sections are numbered in comments 00–23). The preloader and the hero are self-contained blocks with their own `<style>` and `<script>`, so they can be dropped into a page builder as-is.
- `src/css/style.css` — design tokens at the top, then one block per section
- `src/js/main.js` — all interactions, one block per feature

After editing, rebuild the self-contained root file:

    node build.js

Or just deploy the `src/` folder as-is; it works on its own too.

## Sections

00 Preloader · 01 Header (inside the hero) · 02 Hero (video, rotating Anton headline, nav) · 03 Trust marquee · 04 VSL (video sales letter) · 05 Services · 06 Why choose us + stats · 07 About · 08 Process · 09 Flythrough (scroll-scrubbed video) · 10 Insurance claims · 11 Before/After slider · 12 Cost estimator · 13 Financing calculator · 14 Pricing · 15 Comparison table · 16 Projects gallery + lightbox · 17 Testimonials carousel · 18 Service-area map · 19 Team · 20 Guarantee · 21 FAQ · 22 Blog · 23 Contact / quote form · 24 Footer

## How the scroll-scrub section works

Section 09 pins a video and advances it with the scroll bar. Three parts:

1. A tall section (`--runway`, 420vh) that exists purely as scroll distance.
2. A `position: sticky` stage inside it that parks on screen while the runway passes.
3. JS that maps scroll progress to `video.currentTime`.

Both the HTML block and the "Scroll-scrub flythrough" block in `main.js` are commented line by line. To retime it, change `--runway` in `style.css` — taller means slower. To use your own footage, swap the `<source src>`; anything under about 30 seconds and well keyframed scrubs smoothly.

## Things to replace before launch

- **Hero background video**: the `<source src>` inside the hero block near the top of `src/index.html`. The poster image next to it shows until the video paints; delete the `<video>` block to go photo-only.
- **Hero headline words**: the `.rq-word` spans in the hero block (SERVICES, REPAIRS, INSTALLS, INSPECTIONS).
- **VSL video**: change `VSL_ID` in `src/js/main.js` (search for "VSL player") to your YouTube video id.
- **Photos**: every `<img src="https://images.unsplash.com/...">` is a free Unsplash stock photo chosen for the slot. Swap for your own job-site photos. Gallery items also carry a `data-full` attribute for the lightbox image.
- **Avatars**: `https://i.pravatar.cc/...` placeholders in the VSL proof strip and testimonials.
- **Contact details**: phone, address, email and license number appear in the contact section and footer.
- **Forms**: the quote form and newsletter currently show a success toast only. Point them at your CRM, Formspree, Netlify Forms or an email endpoint in the "Quote form validation" and "Newsletter" blocks of `main.js`.
- **Pricing and estimator rates**: edit the `data-project` / `data-sqft` attributes on the pricing cards and the `<option value>` rates in the estimator select.
- **Colors and fonts**: the `:root` block at the top of `style.css`, and the `--rq-*` tokens in the hero block.

## Deploy

The repo is connected to Netlify/Vercel through GitHub: pushing to `main` deploys automatically. `netlify.toml` publishes the repo root with no build step.
