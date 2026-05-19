---
name: Nocturnal Pulse
colors:
  surface: '#0d1516'
  surface-dim: '#0d1516'
  surface-bright: '#333a3c'
  surface-container-lowest: '#080f11'
  surface-container-low: '#151d1e'
  surface-container: '#192122'
  surface-container-high: '#242b2d'
  surface-container-highest: '#2e3638'
  on-surface: '#dce4e5'
  on-surface-variant: '#bac9cc'
  inverse-surface: '#dce4e5'
  inverse-on-surface: '#2a3233'
  outline: '#849396'
  outline-variant: '#3b494c'
  surface-tint: '#00daf3'
  primary: '#c3f5ff'
  on-primary: '#00363d'
  primary-container: '#00e5ff'
  on-primary-container: '#00626e'
  inverse-primary: '#006875'
  secondary: '#f8acff'
  on-secondary: '#570067'
  secondary-container: '#e248ff'
  on-secondary-container: '#4c005a'
  tertiary: '#ffeac0'
  on-tertiary: '#3e2e00'
  tertiary-container: '#fec931'
  on-tertiary-container: '#6f5500'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#9cf0ff'
  primary-fixed-dim: '#00daf3'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#004f58'
  secondary-fixed: '#ffd6ff'
  secondary-fixed-dim: '#f8acff'
  on-secondary-fixed: '#350040'
  on-secondary-fixed-variant: '#7b0090'
  tertiary-fixed: '#ffdf96'
  tertiary-fixed-dim: '#f3bf26'
  on-tertiary-fixed: '#251a00'
  on-tertiary-fixed-variant: '#594400'
  background: '#0d1516'
  on-background: '#dce4e5'
  surface-variant: '#2e3638'
typography:
  display-lg:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Sora
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 64px
  container-max: 1280px
---

## Brand & Style

This design system establishes an atmosphere of "VIP exclusivity meets high-end gallery curation." It is designed for a premier live music social experience, evoking the energy of a strobe-lit club filtered through a minimalist, sophisticated lens.

The aesthetic combines **Minimalism** and **Glassmorphism**. The interface prioritizes negative space and high-contrast typography to create a "gallery" feel, while frosted surfaces and vibrant neon accents provide the "nocturnal" energy. The emotional response is intended to be immersive, moody, and undeniably premium.

## Colors

The palette is strictly nocturnal. The foundation is a "True Black" (#050505) which ensures OLED displays achieve infinite depth, paired with "Charcoal Gray" (#121212) for elevated surfaces. 

**Electric Blue** and **Vivid Purple** are used sparingly as high-energy signals. These are not just colors but "light sources" within the UI, often accompanied by soft glows. Typography remains stark white for maximum legibility against the dark void, while secondary information is pushed back into muted grays to maintain hierarchy.

## Typography

The typography system leverages **Sora** for headlines to provide a geometric, modern, and slightly futuristic edge. Its wide stance feels cinematic and authoritative. **Hanken Grotesk** handles body text and labels, offering a sharp, contemporary clarity that remains legible even at small scales on dark backgrounds.

Large display type should be treated as a design element itself, often using tight letter spacing to feel "locked in." Labels utilize uppercase styling with increased tracking to evoke the feel of professional event wayfinding.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** model for desktop and a **Fluid Grid** for mobile. On desktop, content is contained within a generous max-width to maintain the "gallery" aesthetic, surrounded by expansive dark margins.

Spacing follows a strict 8px rhythmic scale. To reinforce the premium feel, vertical rhythm is intentionally loose, allowing elements to "breathe" within the dark environment. Mobile layouts use a 4-column grid, while desktop utilizes a 12-column system with substantial 48px gutters to prevent the high-contrast elements from feeling cluttered.

## Elevation & Depth

Depth in this design system is created through **Glassmorphism** and **Tonal Layers** rather than traditional drop shadows.

1.  **The Void:** The base layer is #050505.
2.  **Surfaces:** Elevated containers use #121212 with a 1px "inner-glow" border (white at 10% opacity) to define edges without heavy shadows.
3.  **Floating Panes:** Overlays use a backdrop-blur (20px) with a semi-transparent charcoal fill (60% opacity). 
4.  **Neon Bloom:** Active elements or high-priority CTAs utilize a soft Gaussian blur of their respective accent color (Electric Blue or Purple) behind the element to simulate a neon glow reflecting off a dark floor.

## Shapes

The shape language is defined by a **Rounded** (Level 2) approach. This balance ensures the UI feels modern and approachable but retains enough structure to look professional and "architectural."

Standard components (inputs, buttons) use a 0.5rem radius. Large cards and containers use 1rem (rounded-lg). This consistency across the nocturnal theme prevents the sharp contrast of the colors from feeling too "aggressive" or "brutalist," leaning instead into the sophisticated "VIP" vibe.

## Components

- **Buttons:** Primary buttons are solid Electric Blue or Vivid Purple with black text for maximum punch. Secondary buttons are "Ghost" style with 1px white borders and no fill.
- **Glass Cards:** Used for event listings. Feature a subtle 20px backdrop blur, a 1px border at 10% white opacity, and high-contrast white headers.
- **Neon Indicators:** Live status or "On Air" indicators use a pulsing animation with the Purple accent and a 8px outer glow.
- **Input Fields:** Minimalist under-line or subtle box style. Background is #121212. Focus state is signaled by an Electric Blue bottom border and a subtle glow.
- **Chips/Tags:** Small, pill-shaped elements with #121212 backgrounds and Sora-bold typography in white.
- **Lists:** No dividers; use 32px vertical spacing between items to maintain the "gallery" feel. Interaction is signaled by the background shifting from #050505 to #121212 on hover.