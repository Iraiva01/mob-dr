---
name: Precision Repair
colors:
  surface: '#F9F9F9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1b1b1b'
  on-surface-variant: '#4c4546'
  inverse-surface: '#303030'
  inverse-on-surface: '#f1f1f1'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e1dfdf'
  on-secondary-container: '#626262'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1a1c1c'
  on-tertiary-container: '#838484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#e4e2e2'
  secondary-fixed-dim: '#c7c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#464747'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#FFFFFF'
  on-background: '#1b1b1b'
  surface-variant: '#e2e2e2'
  success-green: '#22C55E'
  error-red: '#EF4444'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  margin-mobile: 20px
  margin-desktop: 40px
  gutter: 16px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

The brand identity is built on the "Uber-inspired" philosophy: utility through extreme clarity. It targets a modern, mobile-first audience that values efficiency and transparency above all else. The emotional response should be one of "effortless reliability"—the user feels that their high-value device is in professional, capable hands because the interface itself is precise and uncluttered.

The design style is **Minimalism** with a focus on high-contrast utility. It utilizes:
- **Pure White Canvas:** A #FFFFFF background to ensure maximum focus on content.
- **Icon-First Navigation:** Reducing cognitive load by using visual signifiers for brands and device issues.
- **Micro-interactions:** Subtle transitions and shadow shifts that provide tactile feedback without visual noise.
- **Functional Typography:** Using weight and scale rather than color to establish hierarchy.

## Colors

The palette is strictly monochromatic to reflect a professional, tool-like aesthetic. 

- **Primary (Black):** Used for all primary actions, headings, and active states. It represents the "lead" in the interface.
- **Secondary (Dark Gray):** Reserved for subtext, inactive icons, and placeholder text to maintain legibility without competing with primary information.
- **Tertiary (Light Gray):** Used for subtle dividers and disabled states.
- **Background:** Always pure white to provide the "Uber" feel and allow shadows to define depth.
- **Semantic Colors:** Success and Error colors should be used sparingly, primarily in status badges or validation states, keeping the focus on the black-and-white core.

## Typography

Typography is the primary driver of the visual hierarchy. 

- **Headlines:** Uses **Hanken Grotesk** for its sharp, contemporary feel. Extra-bold weights and negative letter spacing on larger sizes create the "Uber" impact.
- **Body:** Uses **Inter** for its neutral, highly legible character, ensuring that repair details and descriptions are easy to scan.
- **Labels:** Uses **JetBrains Mono** for specialized data like status badges, dates, or prices to give a technical, "repair shop" precision to the data points.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a heavy emphasis on vertical "stacks." 

- **Margins:** 20px on mobile to ensure content doesn't feel cramped against the screen edges.
- **Rhythm:** An 8px base grid governs all spacing. Vertical rhythm is maintained using 24px (stack-md) between related elements and 48px (stack-lg) between distinct sections.
- **Whitespace:** Do not be afraid of empty space. The minimal aesthetic relies on large gaps between groups of information to create a premium feel.
- **Responsive:** On larger screens, content should be centered in a maximum 600px container to maintain the focused, mobile-app intimacy even in a browser.

## Elevation & Depth

Depth is created through **Ambient Shadows** rather than lines. This keeps the interface feeling "soft" despite the high-contrast color scheme.

- **Surface Level (0dp):** The main background.
- **Card Level (1dp):** Subtle, highly diffused shadows (e.g., `0px 4px 20px rgba(0,0,0,0.05)`) are used to lift request cards and brand icons off the background.
- **Floating Level (2dp):** The Floating Action Button (+) and primary modals use a slightly more pronounced shadow to indicate higher interactivity.
- **Outlines:** Only used for inactive input states or unselected button states (1px width, Tertiary color).

## Shapes

The shape language is "Rounded" but controlled. 
- **Buttons and Cards:** 0.5rem (8px) radius. This strikes a balance between the clinical feel of sharp corners and the overly "bubbly" feel of fully rounded corners.
- **Icons & Badges:** Use "Pill-shaped" (Full Rounding) for badges (e.g., status updates) to distinguish them from interactive card elements.
- **Selection States:** When an icon or brand is selected, the transition should be a solid black fill, maintaining the 8px corner radius.

## Components

### Buttons
- **Primary:** Solid black background, white text, 8px radius. Height: 56px for mobile "thumb-readiness."
- **Secondary/Outline:** 1px black border, white background, black text.
- **FAB:** Circular black button with a white thin-stroke icon.

### Inputs
- **Underline Style:** No bounding box. 1px black underline that thickens to 2px on focus. Placeholder text in Secondary Gray.
- **Selection Grid:** Square cards with 8px radius. Inactive: subtle shadow. Active: 2px black border.

### Cards
- **Request Cards:** Pure white background, 8px radius, subtle ambient shadow. No border. Internal padding: 16px.
- **Status Badges:** Pill-shaped. "Active" status uses black fill/white text. "Pending" uses white fill/black border.

### Images
- **Thumbnails:** Always 8px rounded corners. Use a 1:1 aspect ratio for device photos to maintain grid consistency.

### Timeline
- Use a simple vertical or horizontal string of 8px dots. Filled black for completion, Gray 1px stroke for remaining steps. Connect with 1px light gray lines.