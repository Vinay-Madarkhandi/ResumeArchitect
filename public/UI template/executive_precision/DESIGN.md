---
name: Executive Precision
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-doc:
    fontFamily: Source Serif 4
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.7'
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  button:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.0'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  xxl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  max-width-doc: 720px
---

## Brand & Style
The design system is rooted in a philosophy of "Intellectual Calm." It is designed for high-performance professionals who require a tool that facilitates deep work without visual noise. The aesthetic combines the structure of modern SaaS with the refined editorial feel of premium stationery.

The design style is **Corporate Modern with Tactile Minimalism**. It rejects fleeting trends like glassmorphism or vibrant gradients in favor of structural integrity, crisp lines, and deliberate whitespace. The emotional response should be one of competence, clarity, and focus. Every element exists to serve the content, utilizing subtle depth and high-quality typography to establish a hierarchy that feels both authoritative and effortless.

## Colors
The palette is dominated by sophisticated neutrals to maintain a professional atmosphere. 
- **Primary (Deep Slate):** Used for typography, iconography, and foundational structural elements. It provides the "weight" of the interface.
- **Accent (Professional Teal):** Used exclusively for primary calls to action and critical interactive states. Its use must be surgical to maintain its impact.
- **Neutrals:** A range of cool slates and soft off-whites (Paper) are used to define different functional areas without relying on heavy borders.
- **Semantic Colors:** Success, Warning, and Error states should be desaturated to fit the mature tone, avoiding neon or overly bright "stoplight" colors.

## Typography
This design system utilizes a dual-typeface strategy to distinguish between the "Interface" and the "Content."
- **Interface UI (Hanken Grotesk):** A sharp, contemporary sans-serif used for navigation, headers, and functional controls. It conveys precision and modern efficiency.
- **Document Content (Source Serif 4):** A professional, highly legible serif used for long-form reading, notes, and document drafting. This creates a psychological shift from "managing" to "thinking."
- **Data & Metadata (JetBrains Mono):** Used sparingly for timestamps, version numbers, or status tags to provide a technical, high-precision feel.

## Layout & Spacing
The layout follows a **Hybrid Grid** model. 
- **Application Shell:** A 12-column fluid grid for the dashboard and toolbars.
- **Content View:** A centered, fixed-width "Document" layout limited to `720px` to optimize line length and readability.
- **Spacing Rhythm:** Based on a 4px scale. Generous padding (XL/XXL) should be used between major sections to prevent information density from becoming overwhelming. 
- **Mobile:** Elements stack vertically, and horizontal margins shrink to 16px. Interactive targets remain at a minimum of 44px for touch precision.

## Elevation & Depth
Depth is communicated through **Tonal Layering** and **Tactile Outlines** rather than heavy shadows.
- **Surfaces:** The background uses a soft off-white (`#F8FAFC`). Primary containers (cards, modals) are pure white (`#FFFFFF`).
- **Borders:** Use subtle 1px borders in a light neutral tint (`#E2E8F0`) to define boundaries.
- **Shadows:** When necessary for elevation (e.g., dropdowns), use a single "Crisp Shadow": 0px 4px 12px rgba(15, 23, 42, 0.08).
- **Active States:** Subtle inset shadows or a 1px increase in border weight should be used to indicate a "pressed" or "active" state.

## Shapes
The design system uses a **Soft (0.25rem)** roundedness level to maintain a professional, architectural feel. 
- **Small Components:** Buttons, inputs, and tags use `0.25rem` (4px).
- **Large Containers:** Cards and modals use `rounded-lg` (8px).
- **Functional Icons:** Should be contained within square or slightly rounded frames.
Avoid full circles (pill shapes) except for status indicators or notification badges, as they feel too casual for this system's mature tone.

## Components
- **Buttons:** Primary buttons use the Teal accent with white text. Secondary buttons use a Slate border and text. All buttons have a subtle 1px bottom border (darker shade) to provide a tactile "button" feel.
- **Inputs:** Use a white background with a 1px Slate-200 border. On focus, the border transitions to the Accent Teal with a 1px outer ring. Labels are always positioned above the input in `label-sm`.
- **Cards:** White surface, 1px border (`#E2E8F0`), no shadow unless hover. On hover, the border darkens slightly.
- **Chips/Tags:** Monospaced font (`label-sm`), light slate background, no border. Used for categorizing tasks or career stages.
- **Document Editor:** A distraction-free area with no borders. Typography is exclusively Serif. Margins are wide.
- **Progress Bars:** Thin (4px), using the Teal accent for the fill and a light Slate for the track. No rounded ends; use square terminals for a more technical look.