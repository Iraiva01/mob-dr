# Coding Standards & Architecture Rules

These rules govern all TypeScript, React Native, and Supabase code written in the **Mob Dr** repository.

---

## 1. TypeScript & Type Safety

1. **Strict Typing Everywhere**:
   - Do NOT use `any` unless interfacing with an untyped legacy payload.
   - All database entities, navigation parameters, screen props, and API payloads must be declared in `src/types/index.ts`.
2. **Navigation Typing**:
   - Use `NativeStackScreenProps` or `NativeStackNavigationProp` from `@react-navigation/native-stack`.
   - Never use untyped `navigation.navigate('SomeScreen')`.
   ```typescript
   // ✅ CORRECT
   type Props = NativeStackScreenProps<ShopOwnerStackParamList, 'OwnerRequestDetail'>;
   export default function OwnerRequestDetailScreen({ route, navigation }: Props) {
     const { requestId } = route.params;
   }
   ```
3. **Null & Undefined Safety**:
   - Explicitly handle optional fields (e.g. `additional_notes?: string`).
   - Use optional chaining (`?.`) and nullish coalescing (`??`) rather than unchecked property access.

---

## 2. Uber-Inspired Minimalist Design System

Adhere strictly to the black-and-white visual identity:
1. **Palette**:
   - Primary Background: `#FFFFFF` (Pure White).
   - Primary Accent & Action Buttons: `#000000` (Solid Black) with `#FFFFFF` text.
   - Secondary Text: `#666666` or `#999999`.
   - Light Cards / Dividers: `#F7F7F7` or `#EEEEEE`.
   - Currency: Format all prices in Indian Rupees using the **`₹`** symbol (e.g., `₹2,500`).
2. **Shadows vs. Borders**:
   - Favor subtle elevation shadows (`shadowOpacity: 0.05`, `elevation: 2`) over heavy black borders.
3. **Pill Badges**:
   - Status indicators use rounded pills (`borderRadius: 16` or `20`) with uppercase subtext (e.g., `PENDING`, `IN PROGRESS`, `COMPLETED`).
4. **Visual-First Inputs**:
   - Prioritize icon grids over dropdown menus or free-text fields for device brand and problem selection.
   - "Other" options must reveal an underline text input only when selected.

---

## 3. Server-Side Role Enforcement (Defense-in-Depth)

1. **Never Trust the Client**:
   - Client-side navigation hiding is for user experience only. It is **NOT** a security boundary.
   - Privileged operations (accepting requests, rejecting requests, completing repairs, fetching revenue stats) **MUST** verify the user's role on the server before mutating data.
2. **Edge Function Role Verification**:
   - In Supabase Edge Functions, decode the caller's JWT, query `public.users.role`, and reject unauthorized callers with HTTP 403 Forbidden.
3. **Database RLS Policies**:
   - Every database table must have Row-Level Security enabled (`ENABLE ROW LEVEL SECURITY`).
   - Use the recursion-safe helper `get_my_role()` to avoid recursive query loops on the `users` table.

---

## 4. Media Storage & Signed URL Rules

1. **Private Storage**:
   - The `repair-photos` bucket is private. Do not make the bucket publicly readable.
2. **Signed URLs**:
   - Never construct or store static public URLs for photos.
   - Always generate time-limited signed URLs via `getSignedPhotoUrl` or `getSignedPhotoUrls` (`src/utils/storage.ts`) with a default 1-hour expiration (`3600` seconds).
3. **Client-Side Image Optimization**:
   - Compress images (`quality: 0.7`) before uploading to conserve bandwidth and prevent slow cellular uploads.

---

## 5. Resilient Fallbacks & Error Handling

1. **Edge Function Fallbacks**:
   - Mobile network connections during doorstep visits may be intermittent. When invoking an Edge Function, wrap the call in a try/catch.
   - If the Edge Function is unreachable or times out, execute a resilient direct database fallback guarded by Row-Level Security.
2. **User-Friendly Error Alerts**:
   - Display clear, non-technical alert dialogues when an operation fails, guiding the user on how to retry.

---

## 6. Code Clarity for Hands-On Learning

- Write clean, modular, and self-documenting code.
- Include concise file header banners and comments explaining architectural decisions so that human developers and AI assistants maintain total alignment.
