# Landing Design Playbook

This document explains the landing page style used in this project and how to replicate it in other products.

Primary reference: `apps/web/src/app/landing-page.tsx`.

## Design Objective

Build a landing page that feels premium and product-real, not generic marketing.

Key outcomes:
- Immediate visual identity (dark, technical, clean)
- Clear reading hierarchy (headline -> proof -> CTA)
- Real product feel through interactive UI blocks
- Strong conversion focus without hype language

## Visual System

### 1) Color and Surfaces

Use a restrained dark base with one primary accent family.

- Base background: very dark neutral
- Surface cards: slightly lighter transparent layers
- Borders: low-opacity light edges for structure
- Accent: emerald (primary), cyan (secondary accent)

Implementation pattern:
- Main canvas: `bg-background text-foreground`
- Surfaces: `bg-white/[0.02]`, `bg-white/[0.03]`, `bg-card`
- Borders: `border-white/10`, `border-border/60`
- Emphasis: `text-emerald-400`, `text-cyan-400`

Rule: keep accent usage sparse and intentional. Most UI should stay neutral.

### 2) Typography Hierarchy

Use 4 clear levels:
- Hero headline: large, tight leading, high contrast
- Section headings: medium-large, semibold
- Body copy: readable line-height, muted color
- Labels/meta: tiny uppercase, tracking-wide

Implementation pattern:
- Headline: `text-3xl ... md:text-5xl`, `font-semibold`, `leading-[1.1]`
- Body: `text-base leading-relaxed text-white/50`
- Labels: `text-xs tracking-wide uppercase`

Rule: reduce decorative type treatments. Let contrast and spacing create hierarchy.

### 3) Spacing Rhythm

Use consistent vertical rhythm across sections:
- Standard section: `py-24`
- Compact section: `py-16`
- Dense card internals: `p-4`, `p-6`

Rule: alternate dense + open sections so the page feels paced, not monotonous.

## Layout Blueprint

### 1) Hero Grid

Use a 12-column split with copy heavier than visuals:
- Left copy: 7 columns
- Right visual/proof: 5 columns

Implementation pattern:
- `lg:grid-cols-12`
- Copy block: `lg:col-span-7`
- Visual block: `lg:col-span-5`

Why it works:
- Copy has enough width to persuade
- Visual still gets meaningful space for product proof

### 2) Section Flow

Recommended order for this style:
1. Hero with primary CTA
2. Fast social/proof signal (optional)
3. Product interaction/demo
4. Benefits and differentiators
5. Example output/case style proof
6. Final CTA
7. Safety disclaimer/footer

Rule: each section should answer one user question and hand off to the next.

### 3) Card Language

Unify all cards with the same shape grammar:
- Radius: rounded-xl or rounded-2xl
- Border: thin, low-opacity
- Surface: translucent dark
- Internal padding: consistent scale

Rule: consistency in card styling is what makes a complex page feel designed.

## Motion System

Use one motion vocabulary across the full page.

Defined variants in `landing-page.tsx`:
- `fadeInUp`
- `fadeIn`
- `staggerContainer`
- `staggerItem`

Practical rules:
- Animate section entry once (`viewport: { once: true }`)
- Use stagger for lists/grids
- Keep durations in a narrow band (~0.6-0.9s)

Avoid:
- Random per-component animation styles
- Overly long or bouncy transitions

## CTA Pattern

CTA strategy used here:
- Primary CTA in nav
- Primary + secondary CTA in hero
- Repeated primary CTA near major decision points
- Final CTA before footer

Styling guidance:
- Use one primary button style for all major actions
- Keep hover behavior subtle and consistent

Current implementation moved to solid high-contrast primary (no gradient) for cleaner trust tone.

## Product-Proof Pattern

What makes this landing feel credible is not feature lists; it is product-like output blocks.

Use these proof formats:
- Terminal/results panel
- Input -> output highlight cards
- "What changed" before/after tables

Each proof block should include:
- user input context
- detected issues
- suggested actions

Rule: show the user exactly what they would receive, not abstract claims.

## Copy Constraints (for this wedge)

For the supplement stack audit positioning:
- Keep language concrete and user-facing
- Avoid dramatic health claims
- Avoid generic wellness slogans
- Avoid broad "platform" framing

Anchor message:
- "Paste your stack. Spot overlaps, conflicts, and clutter."

## Reuse Checklist

When replicating this design in a new project:
- [ ] Create a constrained color system with one primary accent
- [ ] Define 3-4 shared motion variants first
- [ ] Build a 7/5 hero split (copy + product proof)
- [ ] Create one card style and reuse everywhere
- [ ] Add at least one realistic product-output block
- [ ] Repeat one primary CTA label across the page
- [ ] Keep footer disclaimer clear and non-legalese

## Minimal Starter Structure

Use this section skeleton:

```text
Nav
Hero (headline, subheadline, primary CTA, secondary CTA, support line)
Proof signal
Interactive or example product block
Benefits
Why-this-instead section
Example output section
Final CTA
Disclaimer + footer
```

## Notes for Adaptation

If you apply this pattern to another domain:
- Keep the same visual grammar (surface, borders, spacing, motion)
- Replace only domain copy and proof blocks
- Do not change the entire section architecture unless user journey differs

This keeps consistency while still allowing product-specific messaging.
