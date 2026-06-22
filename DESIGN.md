---
name: Fluent Productivity System
colors:
  surface: '#f9f9fc'
  surface-dim: '#dadadc'
  surface-bright: '#f9f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f6'
  surface-container: '#eeeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e5'
  on-surface: '#1a1c1e'
  on-surface-variant: '#3d4946'
  inverse-surface: '#2f3133'
  inverse-on-surface: '#f0f0f3'
  outline: '#6d7a76'
  outline-variant: '#bcc9c5'
  surface-tint: '#006b5f'
  primary: '#00685d'
  on-primary: '#ffffff'
  primary-container: '#008375'
  on-primary-container: '#f4fffb'
  inverse-primary: '#65d9c7'
  secondary: '#546160'
  on-secondary: '#ffffff'
  secondary-container: '#d7e5e3'
  on-secondary-container: '#5a6766'
  tertiary: '#95442a'
  on-tertiary: '#ffffff'
  tertiary-container: '#b35c40'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#83f6e3'
  primary-fixed-dim: '#65d9c7'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005047'
  secondary-fixed: '#d7e5e3'
  secondary-fixed-dim: '#bbc9c7'
  on-secondary-fixed: '#111e1d'
  on-secondary-fixed-variant: '#3c4948'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59e'
  on-tertiary-fixed: '#3a0b00'
  on-tertiary-fixed-variant: '#793017'
  background: '#f9f9fc'
  on-background: '#1a1c1e'
  surface-variant: '#e2e2e5'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1200px
  gutter: 24px
---

## Brand & Style

This design system is built on the principles of **Modern Minimalism** with a focus on cognitive clarity and educational focus. It prioritizes a distraction-free environment essential for language learning and deep work. 

The aesthetic is characterized by a "clean-tech" approach: utilizing generous whitespace, a sophisticated teal primary accent, and a structured information hierarchy. The emotional response is one of calm, competence, and steady progress. By combining the precision of SaaS design with the approachability of modern EdTech, the system feels both professional and encouraging.

## Colors

The palette is anchored by a vibrant **Primary Teal**, used intentionally for key actions and branding elements to signify growth and focus. 

- **Primary:** A medium-density teal that maintains high legibility for white text overlays.
- **Secondary/Surface:** A very desaturated teal tint used for subtle background containers, active states, and non-critical emphasis.
- **Neutrals:** A scale of cool grays. The darkest neutral (#1A1C1E) is used for headings to maintain high contrast without the harshness of pure black.
- **Semantic:** Success (Emerald), Warning (Amber), and Error (Crimson) are used sparingly in low-saturation variants to align with the professional aesthetic.

## Typography

The system utilizes a dual-sans serif pairing. **Hanken Grotesk** is used for display and headline levels, providing a sharp, contemporary edge that feels modern and precise. **Inter** is the workhorse for body text and interface labels, chosen for its exceptional readability at small sizes and its neutral, systematic character.

Lower-level labels often employ uppercase styling with slight letter-spacing to create clear visual separation between metadata and primary content. Line heights are kept generous to prevent "text crowding" during long study sessions.

## Layout & Spacing

This design system uses a **Fluid Grid** model with a strict 4px baseline rhythm. For web applications, a 12-column grid is standard, while mobile layouts collapse to a single column with 16px side margins.

Layouts are divided into "Activity Zones" (content-heavy areas) and "Utility Zones" (navigation and sidebars). Use `lg` and `xl` spacing for page-level margins to maintain the minimalist feel. Components should use `sm` or `md` padding internally to ensure touch targets are comfortable and content has room to breathe.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers** and **Ambient Shadows**. Instead of deep, dramatic shadows, this system uses "Soft Depth":

1.  **Level 0 (Base):** The background color (#F8FAFB).
2.  **Level 1 (Cards):** White surfaces with a very subtle 1px border (#E2E8F0) and an ultra-soft ambient shadow (0px 4px 20px rgba(0, 0, 0, 0.04)).
3.  **Level 2 (Popovers/Modals):** White surfaces with a more defined shadow (0px 10px 32px rgba(0, 0, 0, 0.08)).

Avoid heavy black shadows; instead, use shadows tinted slightly with the primary teal color or deep navy to keep the UI looking "airy" and clean.

## Shapes

The shape language is consistently **Rounded**, reflecting an approachable and user-friendly personality. 

- **Standard Elements:** Buttons, input fields, and small cards use a 0.5rem (8px) corner radius.
- **Large Containers:** Large dashboard cards or modal containers use 1rem (16px) to soften the overall visual weight.
- **Interactive Micro-elements:** Tooltips and tags may use smaller 4px radii to maintain precision.

## Components

### Buttons
- **Primary:** Solid Teal background, white text. No border.
- **Secondary:** White background, 1px border (#E2E8F0), primary teal text.
- **Icon-Action:** Small, subtle icons with #149E8E coloring, often placed within secondary buttons for clarity.

### Input Fields
- Labels sit above the field in `label-bold` style.
- Fields feature a light gray border and 12px internal horizontal padding.
- On focus, the border transitions to Primary Teal with a subtle 2px glow.

### Cards & Modules
- Cards should have a white background and a subtle 1px border.
- Group related items (like "Review Queue" items) into sub-containers with a secondary teal background (#E6F4F2) to visually anchor them within the card.

### Chips & Tags
- Used for categories or status. 
- Style: Small font size, uppercase, high letter-spacing, and light gray or light teal background tints.