---
name: icon-grid-selector
description: Use this skill when building any screen element where the customer picks from a visual set of options instead of typing — e.g. selecting a device brand, a problem type, or any future icon-based choice. Ensures every icon-grid selector in the app behaves and looks consistently, including the "Other" text-input fallback.
---

# Icon Grid Selector Pattern

## When to use this
The client wants minimal typing throughout the customer-facing side of the app. Any time a customer needs to choose from a known, limited set of options (device brand, problem type, and any future category), use this pattern instead of a dropdown, radio list, or free-text field.

## Behavior

- Render a scrollable grid (or horizontal row, depending on option count) of tappable icon cards.
- Each card shows an icon/logo and a short label beneath it.
- Exactly one option can be selected at a time (single-select).
- Selected state: black filled background (or black border, per current design language — see `design.md`), unselected: white background with light gray border.
- The **last option is always "Other"**, represented by a generic icon (e.g. a plus or ellipsis icon) with the label "Other".
- Tapping "Other" reveals a text input directly below the grid (animate in, don't navigate to a new screen) with placeholder text like "Tell us the brand" or "Describe the issue" depending on context.
- If the user selects a different icon after having typed into "Other", clear the text input and hide it again.
- The selected value passed to the backend is either the icon's known value (e.g. `"samsung"`) or the free-typed string if "Other" was used.

## Component structure (React Native)

```jsx
<IconGridSelector
  options={[
    { value: "apple", label: "Apple", icon: AppleIcon },
    { value: "samsung", label: "Samsung", icon: SamsungIcon },
    { value: "oneplus", label: "OnePlus", icon: OnePlusIcon },
    { value: "xiaomi", label: "Xiaomi", icon: XiaomiIcon },
    { value: "other", label: "Other", icon: OtherIcon },
  ]}
  selectedValue={brand}
  onSelect={(value) => setBrand(value)}
  otherValue={customBrandText}
  onOtherChange={(text) => setCustomBrandText(text)}
  otherPlaceholder="Tell us the brand"
/>
```

Build `IconGridSelector` as a single reusable component (not copy-pasted per screen) since it's used for both brand selection and problem-type selection, and potentially future categories.

## Conventions to follow

- Keep the component generic — it should not know whether it's rendering brands or problem types. Pass in the options list and labels.
- Icons should be simple line-style icons/logos, consistent with the rest of the icon set (see `design.md` notes on icon style).
- Always include "Other" as the final option, never omit it.
- Validate that either a non-"other" value is selected, or the "Other" text field is non-empty, before allowing the user to proceed.

## Example prompt to the agent
"Build the problem-type step of the Submit New Request screen using our icon-grid-selector skill, with these problem types: cracked screen, battery issue, water damage, speaker problem, charging port."
