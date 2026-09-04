# Phone Repair Shop App — Design Specification

**Design Language:** Clean & Minimal, Uber-inspired
**Color Palette:** White (primary background) and Black (primary accent/actions)
**Visual Approach:** Icon-first, minimal text, generous whitespace, subtle shadows instead of heavy borders

---

## Auth Screens

### Login
Design a mobile login screen, Uber-inspired minimal style, white background, black accents. Top center shows app logo or wordmark in bold black text, generous top spacing. Below, a large heading "Welcome" or "Get Started" in bold black. Two input fields stacked vertically: phone number field with black underline border style (no boxes, minimal look), and password field with same style, both with light gray placeholder text. Full-width black button below fields with white text "Continue" or "Log In". Below that, small centered gray text "Don't have an account? Sign up" with "Sign up" in bold black, tappable. Bottom of screen, subtle divider line with gray text "Or continue with" and two circular icon buttons for Google and Apple sign-in, white background with black border, centered horizontally.

### Signup
Design a mobile signup screen, same white/black Uber-inspired style. Heading "Create Account" in bold black. Stacked input fields with underline style: full name, phone number, email, password — all minimal, no boxes, light gray placeholder text. Below fields, a toggle or segmented control asking "I am a..." with two options: "Customer" and "Shop Owner" — selected option shown in black fill, unselected in white with black border. Full-width black "Create Account" button with white text at bottom. Small centered gray text below: "Already have an account? Log in" with "Log in" in bold black.

---

## Customer-Side Screens

### 1. Home / Dashboard
Design a mobile app home screen for a phone repair service, Uber-inspired minimal style. Pure white background, black as primary accent color. Top header shows "My Repairs" in bold black text. Below, a vertical list of repair request cards, each showing: device brand icon (small, left-aligned), device name text, status badge (pending/accepted/rejected/completed) in a black pill on white or white pill on black, and submission date in gray subtext. Bottom right, a floating black circular "+" button to submit a new request. Clean spacing, generous whitespace between cards, minimal borders (use subtle shadows instead).

### 2. Submit New Request
Design a mobile form screen, Uber-inspired minimal aesthetic, white background, black accents.
- **Step 1:** Horizontal scrollable row of brand icon buttons (Apple, Samsung, OnePlus, Xiaomi, Other) in circular white cards with black icon; selected state shows black filled circle.
- **Step 2:** Grid of problem-type icons (cracked screen, battery issue, water damage, speaker problem, charging port, other) in square white cards with simple line icons; selected state highlighted with black border.
- **Step 3:** Photo upload area, dashed black border rectangle with camera icon and "Add Photo" text, supports 1-2 images shown as thumbnails once uploaded.
- **Step 4:** Optional text field labeled "Additional Notes" with placeholder "Anything else we should know?"
- **Bottom:** Full-width black "Submit Request" button with white text.

### 3. Request Detail
Design a mobile detail screen, minimal white background with black text. Top shows large status badge (black pill, white text) centered below header. Below, brand icon and device name in bold. Problem type icon and label shown side by side. Uploaded photos displayed as a horizontal scrollable gallery. Additional notes shown in gray subtext below photos, if present. Bottom section shows a simple timeline: "Submitted" → "Acknowledged" → "In Progress" → "Completed" as connected dots, filled black for completed steps, gray outline for pending steps.

---

## Shop Owner-Side Screens

### 1. Incoming Requests
Design a mobile app screen for a repair shop owner, Uber-inspired minimal style, white background, black accents. Top header shows "Incoming Requests" in bold black text, with a small badge showing count of pending requests. Below, a vertical list of request cards, each showing: customer's uploaded photo thumbnail (left, rounded square), device brand icon and device name (bold black text), problem type icon and label (gray subtext), submission time (small gray text, top right of card). Cards have subtle shadow, no heavy borders. Tapping a card opens Request Detail. Generous whitespace between cards.

### 2. Request Detail (Shop Owner)
Design a mobile detail screen, white background, black text, minimal style. Top shows customer's uploaded photos in a horizontal scrollable gallery, larger and prominent. Below, device brand icon and device name in bold, problem type icon and label beside it. Additional notes from customer shown in gray subtext box if present. Customer contact info (phone number, name) shown in a simple row with a phone icon. Bottom of screen: two full-width buttons side by side — black "Accept" button with white text on the left, white "Reject" button with black border and black text on the right.

### 3. Dashboard / Stats
Design a mobile dashboard screen for a repair shop owner, white background, black accents, Uber-inspired clean style. Top shows large bold text "Total Revenue" with amount displayed prominently below in large black numerals. Below that, a horizontal toggle/tab row: "This Month" / "Last Month" / "All Time" — selected tab shown with black underline. Below the toggle, a simple bar chart or line chart in black and gray showing revenue over time. Further down, a "Completed Repairs" section showing a vertical list of past repair cards: device icon, device name, amount charged, completion date — minimal cards with subtle dividers, no heavy borders. Clean spacing throughout, generous whitespace.

---

## Notes for Handoff
- All screens should use a consistent icon set (outline-style, simple line icons) rather than mixing filled and outline icons.
- "Other" options for brand and problem type should reveal a simple text input when tapped.
- Maintain consistent spacing/padding across all screens for a cohesive feel when navigating between customer and shop owner views (same app, role-based).
