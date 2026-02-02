# Landing Page Documentation

## Overview
Complete production-ready landing page for PeakPrep with mountain expedition theme, featuring hero section, features, pricing, testimonials, and FAQ.

## File Structure

```
src/
├── app/
│   ├── page.tsx                    # Main landing page component
│   └── layout.tsx                  # Updated with SEO metadata
├── components/
│   └── landing/
│       ├── Hero.tsx                # Hero section with variant A/B support
│       ├── FeatureCard.tsx         # Feature card component
│       ├── Pricing.tsx             # Pricing tiers with FAQ accordion
│       ├── Testimonial.tsx         # Testimonial card component
│       ├── Footer.tsx              # Footer component
│       └── ClimberLoaderPlaceholder.tsx  # CSS placeholder for climber animation
└── data/
    ├── landing-content.ts          # All landing page content (TypeScript)
    └── landing-content.json        # JSON version (for reference/CMS)
```

## Image Placeholders Required

Create these placeholder images in `public/images/`:

1. **`og-peakprep.png`** (1200x630px)
   - Open Graph image for social sharing
   - Should include PeakPrep branding and mountain theme

2. **`testimonial-sarah.jpg`** (200x200px, square)
   - Avatar for Sarah Chen testimonial
   - Can use placeholder service: `https://i.pravatar.cc/200?img=1`

3. **`testimonial-marcus.jpg`** (200x200px, square)
   - Avatar for Marcus Johnson testimonial
   - Can use placeholder service: `https://i.pravatar.cc/200?img=2`

4. **`testimonial-emma.jpg`** (200x200px, square)
   - Avatar for Emma Rodriguez testimonial
   - Can use placeholder service: `https://i.pravatar.cc/200?img=3`

## Hero Variants

The landing page supports two hero variants for A/B testing:

**Variant A:**
- Headline: "Climb to your best SAT score with PeakPrep"
- CTA: "Start Your Free Route" / "See a Sample Route"

**Variant B:**
- Headline: "Reach the Peak of your SAT"
- CTA: "Begin Your Ascent" / "Try a Checkpoint"

To switch variants, change `HERO_VARIANT` constant in `src/app/page.tsx`:
```typescript
const HERO_VARIANT: "A" | "B" = "A"; // Change to "B" for variant B
```

## Analytics Integration

The page includes analytics event tracking placeholders. To enable:

1. **Google Analytics:**
   ```html
   <!-- Add to src/app/layout.tsx in <head> -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
   <script
     dangerouslySetInnerHTML={{
       __html: `
         window.dataLayer = window.dataLayer || [];
         function gtag(){dataLayer.push(arguments);}
         gtag('js', new Date());
         gtag('config', 'GA_MEASUREMENT_ID');
       `,
     }}
   />
   ```

2. **Events Tracked:**
   - `cta_click` - Hero CTA button clicks
   - `signup_attempt` - Email signup form submissions
   - `pricing_click` - Pricing tier button clicks

## Climber Animation

The `ClimberLoaderPlaceholder` component uses CSS animations as a placeholder. To replace with Lottie:

1. Install lottie-react (already in dependencies)
2. Update `src/components/landing/ClimberLoaderPlaceholder.tsx`:
   ```typescript
   import dynamic from "next/dynamic";
   import { useState, useEffect } from "react";
   
   const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
   
   export default function ClimberLoader() {
     const [animationData, setAnimationData] = useState(null);
     
     useEffect(() => {
       fetch("/mountain-climber-animation.json")
         .then(res => res.json())
         .then(data => setAnimationData(data));
     }, []);
     
     if (!animationData) return <div>Loading...</div>;
     
     return <Lottie animationData={animationData} loop={true} />;
   }
   ```

## Accessibility Features

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus states on all interactive elements
- Reduced motion support (via Framer Motion)

## Performance Optimizations

- Lazy loading for images (`loading="lazy"`)
- Framer Motion `viewport={{ once: true }}` for scroll animations
- Dynamic imports for heavy components
- Optimized font loading (already configured in layout)

## SEO Checklist

✅ Title tag updated in `layout.tsx`
✅ Meta description added
✅ Open Graph tags configured
✅ Twitter Card tags configured
✅ Semantic HTML structure
✅ Proper heading hierarchy (h1, h2, h3)
✅ Alt text for images (add when images are added)
✅ Structured data (can add JSON-LD if needed)

## Deployment Notes

### Vercel Deployment

1. **Build Command:** `npm run build` (default)
2. **Output Directory:** `.next` (default)
3. **Install Command:** `npm install` (default)

### Environment Variables

No environment variables required for landing page functionality.

### Custom Domain

1. Add domain in Vercel dashboard
2. Update DNS records as instructed
3. SSL certificate auto-provisioned

## Content Management

All content is stored in `src/data/landing-content.ts`. To update:

1. Edit the TypeScript file directly
2. Or integrate with a CMS (Contentful, Sanity, etc.) and fetch on page load
3. For A/B testing, use a service like Vercel Edge Config or Optimizely

## Testing Checklist

- [ ] Hero section displays correctly on mobile/tablet/desktop
- [ ] Both hero variants work (A and B)
- [ ] All CTAs link to correct pages
- [ ] Pricing FAQ accordion opens/closes
- [ ] Signup modal appears and validates email
- [ ] Analytics events fire correctly
- [ ] Images load (when added)
- [ ] SEO metadata appears in page source
- [ ] Social sharing preview works (when OG image added)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- [ ] Add video background option for hero
- [ ] Integrate with email service (SendGrid, Mailchimp)
- [ ] Add live chat widget
- [ ] Implement cookie consent banner
- [ ] Add blog section link
- [ ] Create case studies page

