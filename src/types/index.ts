// =============================================================================
// Shared TypeScript Types
// =============================================================================
// These types mirror the database schema defined in AGENTS.md (Section 4).
// They are used across the app for type safety in screens, contexts, and API calls.
// =============================================================================

/**
 * User roles — determines which navigator stack is shown after login.
 * "customer" sees the customer tab navigator; "shop_owner" sees the owner tabs.
 */
export type UserRole = 'customer' | 'shop_owner';

/**
 * Repair request lifecycle statuses.
 * pending  → customer submitted, awaiting shop owner review
 * accepted → shop owner accepted, will perform the repair
 * rejected → shop owner declined the request
 * completed → repair is done, amount charged is recorded
 */
export type RepairStatus = 'pending' | 'accepted' | 'rejected' | 'completed';

/**
 * Represents a row in the `users` table.
 * Password is handled by Supabase Auth and never stored/accessed directly.
 */
export interface User {
  id: string;
  email: string;
  phone_number: string;
  role: UserRole;
  created_at: string;
}

/**
 * Represents a row in the `repair_requests` table.
 */
export interface RepairRequest {
  id: string;
  customer_id: string;
  brand: string;
  device_name: string;
  problem_type: string;
  additional_notes?: string;
  status: RepairStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Represents a row in the `repair_photos` table.
 * Each repair request can have 1–2 photos uploaded by the customer.
 */
export interface RepairPhoto {
  id: string;
  repair_request_id: string;
  photo_url: string;
  uploaded_at: string;
}

/**
 * Represents a row in the `completed_repairs` table.
 * Created when the shop owner marks a repair as completed and records the charge.
 */
export interface CompletedRepair {
  id: string;
  repair_request_id: string;
  completion_date: string;
  amount_charged: number;
  notes?: string;
}

// =============================================================================
// Navigation param list types
// =============================================================================
// These define what parameters each screen expects, enabling type-safe navigation.
// Undefined means the screen takes no params.
// =============================================================================

/** Auth stack screens */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

/** Customer bottom-tab screens */
export type CustomerTabParamList = {
  CustomerHome: undefined;
  NewRequest: undefined;
};

/** Customer stack screens (includes placeholder home + detail screens) */
export type CustomerStackParamList = {
  CustomerHome: undefined;
  CustomerTabs?: undefined;
  NewRequest?: undefined;
  RequestDetail: { requestId: string };
};

/** Shop owner bottom-tab screens */
export type ShopOwnerTabParamList = {
  IncomingRequests: undefined;
  OwnerDashboard: undefined;
};

/** Shop owner stack screens (includes placeholder home + detail screens) */
export type ShopOwnerStackParamList = {
  ShopOwnerHome: undefined;
  IncomingRequests?: undefined;
  OwnerTabs?: undefined;
  OwnerDashboard?: undefined;
  OwnerRequestDetail: { requestId: string };
};
