---
name: Generai Luxe
colors:
  surface-deep: rgba(28, 28, 30, 0.9)
  surface-material: rgba(28, 28, 30, 0.6)
  surface-thick: rgba(44, 44, 46, 0.8)
  surface-form: rgba(118, 118, 128, 0.24)
  border-glass: rgba(255, 255, 255, 0.15)
  text-dim: rgba(255, 255, 255, 0.5)
  text-muted: rgba(255, 255, 255, 0.3)
typography:
  display-xl:
    fontFamily: Hanken Grotesk
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 41px
    letterSpacing: -0.4px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.41px
  button-md:
    fontFamily: Hanken Grotesk
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 22px
  mono-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    letterSpacing: 0.5px
  caption-xs:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  nav-label:
    fontFamily: Hanken Grotesk
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 12px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  xxl: 32px
  section: 80px
  container-max: 576px
---

## Brand & Style
Generai Luxe is a premium, high-utility dashboard that blends the sleek precision of Apple’s Human Interface Guidelines with a futuristic, creative aesthetic. The brand targets power users and creatives who value sophistication, speed, and tactile feedback. 

The design style is **Glassmorphism**, characterized by restrained "system materials" that use backdrop blurs and subtle inner borders to create hierarchy without heavy shadows. It evokes a "Midnight Studio" atmosphere—dark, focused, and expensive. The visual language balances professional utility (tight grids, crisp typography) with moments of creative energy (vibrant violet accents and liquid-silk imagery).

## Colors
The palette is rooted in a true black (`#000000`) background to maximize contrast and OLED efficiency. 

- **Primary (Custom Violet):** Used for active states, primary actions, and brand-identifiable icons. It provides a technical, high-energy focal point.
- **Secondary (Custom Gold):** Reserved for high-value information like balances or premium features.
- **Surface Strategy:** Layers are built using semi-transparent grays rather than solid colors. `surface-material` is the standard for cards, while `surface-thick` is used for persistent navigation bars to ensure legibility over scrolling content.
- **Typography Colors:** Pure white is used for headings and primary labels. `text-dim` (50% white) is used for secondary metadata and mono-labels to maintain a clear visual hierarchy.

## Typography
The system uses **Hanken Grotesk** as a contemporary, sharp alternative to system fonts, providing a high-end "tech" feel. For technical metadata and section headers, **JetBrains Mono** is used to reinforce the "Generative AI" and developer-adjacent nature of the tool.

- **Scale:** High contrast between `display-xl` (for balances/numbers) and `body-md` (for content).
- **Tracking:** Negative letter-spacing is applied to larger display sizes to maintain a tight, editorial look.
- **Mono Labels:** Always uppercase with generous tracking to differentiate them from interactive body text.

## Layout & Spacing
The layout follows a **Fixed Grid** approach for mobile-first consumption, centered on larger screens with a maximum width of `576px`.

- **Vertical Rhythm:** A base 4px unit is used. Standard stack spacing between distinct components is `lg` (16px), while internal padding within glass containers is also `lg` to ensure breathing room.
- **Safe Areas:** A `section` (80px) bottom padding is enforced to prevent content from being obscured by the fixed navigation bar.
- **Interaction:** Buttons and interactive links use a minimum height of 48px-52px to accommodate touch targets comfortably.

## Elevation & Depth
Depth is achieved through **Material Stacking** rather than traditional drop shadows.

1. **Base Layer:** Pure Black (`#000000`).
2. **Intermediate Layer (Cards):** Semi-transparent `surface-material` with a 20px blur and a 0.5px `border-glass` inner stroke. This simulates a sheet of glass floating just above the background.
3. **Top Layer (Navigation):** `surface-thick` with 30px blur. This is the highest elevation, visually "crushing" the content beneath it to maintain focus on navigation.
4. **Interactive State:** When pressed, elements should scale slightly (`active:scale-[0.98]`) or increase background opacity rather than casting a shadow, maintaining the flat-glass metaphor.

## Shapes
The system uses a sophisticated, rounded language reminiscent of high-end hardware.

- **Outer Containers (Cards):** Use `rounded-xl` (20px) or `rounded-lg` (16px).
- **Form Elements & Buttons:** Use `rounded-lg` (12px) to maintain a slightly more "buttoned-up" and functional appearance.
- **Icons & Badges:** Circular or `rounded-full` is used for status indicators and navigation icons to provide a soft contrast to the rectangular layout blocks.

## Components
- **Primary Button:** Solid `custom-violet` background with white text. High-contrast, no shadow, subtle opacity change on tap.
- **Secondary/Glass Button:** `white/10` background with a `border-glass` stroke. Used for secondary actions within cards.
- **Input Fields:** Use `surface-form` (low-opacity gray) with no borders until focused. Upon focus, a 2px `custom-violet` ring appears. 
- **List Items/Links:** `surface-material` background with a chevron-right trailing icon (`text-white/40`) to indicate navigation.
- **Banner/Pro-Tip:** Lightly tinted background (`custom-violet/10`) with a small 20px icon. Text should be `caption-xs`.
- **Navigation Bar:** Fixed position, `ios-material-thick` blur, with icons using the `Material Symbols Outlined` set. Active state is indicated by a color shift to `custom-violet` and a 'Fill' variation change in the icon.
