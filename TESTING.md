# Mob Dr — Comprehensive Testing Guide

This document defines testing workflows, verification scenarios, and acceptance criteria for the **Mob Dr** mobile application.

---

## 1. End-to-End User Verification Scenarios

### Scenario A: Customer Journey (Request Submission & Tracking)

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| **A1** | Launch app, tap "Don't have an account? Sign up". Fill Full Name, Phone, Email, Password. Tap "Create Account". | Account is created in `auth.users` and `public.users` with `role = 'customer'`. User is logged in and navigates to `CustomerNavigator`. | [ ] |
| **A2** | On `CustomerHomeScreen`, verify initial state. | Displays "My Requests" header and an empty-state illustration/card ("No repair requests yet"). | [ ] |
| **A3** | Tap the "New Request" bottom tab to open `NewRequestScreen`. | Screen loads with: (1) 12-brand icon grid, (2) Problem-type grid, (3) Photo upload box, (4) Additional notes field. | [ ] |
| **A4** | Tap different brands (e.g. *OnePlus*, *Samsung*, *Apple*). Tap *Other*. | Selected brand displays black filled background with white logo. Selecting *Other* reveals a clean underline text input. | [ ] |
| **A5** | Select a problem type (e.g. *Cracked Screen*). Tap *Other*. | Selected problem highlights with solid black. *Other* reveals a custom text field. | [ ] |
| **A6** | Tap "Upload Photo" and pick 1–2 photos from gallery. | Photos compress client-side and display rounded thumbnail previews with an "X" removal button. | [ ] |
| **A7** | Enter device model (e.g. "OnePlus 11R"), optional notes, and tap "Submit Request". | Loading spinner appears. Photos upload to `repair-photos` bucket. Request record created. Success alert shown. | [ ] |
| **A8** | Return to `CustomerHomeScreen`. | The newly submitted request appears as a card with a `Pending` badge. | [ ] |
| **A9** | Tap the request card. | `RequestDetailScreen` opens showing: (1) 4-step status timeline with `Submitted` highlighted, (2) Uploaded photos (signed URLs), (3) Device details. | [ ] |

---

### Scenario B: Shop Owner Journey (Triage, Completion & Revenue)

| Step | Action | Expected Result | Pass/Fail |
|---|---|---|---|
| **B1** | Log out of customer account. Log in with seeded shop owner credentials (`owner@mobdr.com`). | App navigates to `ShopOwnerNavigator` showing "Incoming Requests" and "Dashboard" bottom tabs. | [ ] |
| **B2** | On `IncomingRequestsScreen`, inspect the **Pending** tab. | The customer's request from Scenario A appears with photo thumbnail, brand logo, device name, problem, and timestamp. | [ ] |
| **B3** | Tap the pending request card. | `OwnerRequestDetailScreen` opens with photo gallery, customer contact row, tap-to-call button, and "Accept" / "Reject" buttons. | [ ] |
| **B4** | Tap the "Call Customer" icon/button. | Native phone dialer opens with customer's phone number populated (`tel:...`). | [ ] |
| **B5** | Tap "Accept". | Invokes `accept-repair-request`. Status transitions to `accepted`. Screen shows "In Progress" badge and "Complete Repair" button. | [ ] |
| **B6** | Return to `IncomingRequestsScreen`. | Request is no longer in **Pending** tab. Tap the **In Progress** tab: request is listed there. | [ ] |
| **B7** | Tap the card in **In Progress** tab, then tap "Complete Repair". | Completion modal appears prompting for "Amount Charged (₹)" and optional notes. | [ ] |
| **B8** | Enter `2500` for amount charged and tap "Confirm & Record". | Invokes `complete-repair-request`. Record inserted into `completed_repairs`. Status updates to `completed`. | [ ] |
| **B9** | Switch to the "Dashboard" bottom tab (`OwnerDashboardScreen`). | (1) Total Revenue shows ₹2,500 under "This Month" & "All Time". (2) Revenue chart displays current month bar. (3) Completed repairs list displays the job. | [ ] |
| **B10** | Toggle between "This Month", "Last Month", and "All Time". | Metric cards update accurately based on completion dates. | [ ] |

---

## 2. Supabase Edge Functions Testing via cURL

### 2.1. Test `accept-repair-request`
```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/accept-repair-request" \
  -H "Authorization: Bearer <SHOP_OWNER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{ "repair_request_id": "<REQUEST_UUID>" }'
```
*Expected response*:
```json
{ "success": true, "message": "Repair request accepted successfully", "request_id": "<REQUEST_UUID>" }
```

### 2.2. Test `complete-repair-request`
```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/complete-repair-request" \
  -H "Authorization: Bearer <SHOP_OWNER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "repair_request_id": "<REQUEST_UUID>",
    "amount_charged": 2500,
    "notes": "Replaced AMOLED screen and adhesive seal"
  }'
```
*Expected response*:
```json
{
  "success": true,
  "message": "Repair request marked as completed",
  "completed_repair": {
    "repair_request_id": "<REQUEST_UUID>",
    "amount_charged": 2500
  }
}
```

### 2.3. Test `get-revenue-stats`
```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/get-revenue-stats" \
  -H "Authorization: Bearer <SHOP_OWNER_JWT>" \
  -H "Content-Type: application/json"
```
*Expected response*:
```json
{
  "success": true,
  "this_month": 2500,
  "last_month": 0,
  "all_time": 2500,
  "completed_count": 1,
  "monthly_bars": [...]
}
```

---

## 3. Database Security & RLS Verification

Run these verification queries in the Supabase SQL Editor to guarantee security boundary integrity:

1. **Verify Customer Isolation**:
   ```sql
   -- Logged in as Customer A:
   -- Must return only Customer A's rows.
   SELECT * FROM public.repair_requests;
   ```
2. **Verify Completed Repairs Protection**:
   ```sql
   -- Logged in as Customer:
   -- Must return 0 rows or permission denied.
   SELECT * FROM public.completed_repairs;
   ```
3. **Verify Shop Owner Access**:
   ```sql
   -- Logged in as Shop Owner:
   -- Must return all requests across all customers.
   SELECT * FROM public.repair_requests;
   ```

---

## 4. UI & Visual Regression Checklist

- [ ] **B&W Palette Adherence**: No unapproved colors (red, blue, green) outside standard alert states or icons.
- [ ] **Brand Grid Density**: 12 brands wrap cleanly into 3 columns on standard phone viewports without horizontal clipping.
- [ ] **Photo Aspect Ratio**: Thumbnails maintain square aspect ratio (`1:1`) with rounded corners (`borderRadius: 8`).
- [ ] **Safe Area Handling**: Status bar and bottom navigation bar padding adjust cleanly on notch and pill devices.
