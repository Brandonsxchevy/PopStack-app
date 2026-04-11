// ─── Shared types used by both web and api ───────────────────────────────────

export type Role = 'USER' | 'DEVELOPER';
export type Platform = 'WIX' | 'WORDPRESS' | 'SHOPIFY' | 'SQUARESPACE' | 'WEBFLOW' | 'UNKNOWN';
export type BudgetTier = 'FIVE' | 'TWENTY' | 'FIFTY_PLUS';
export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH';
export type SessionTier = 'QUICK_FOLLOWUP' | 'FIFTEEN_MIN' | 'FULL_SOLUTION';
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'STABILIZED' | 'BLOCKED' | 'DEFERRED';
export type ThreadStatus = 'NEW' | 'AWAITING_RESPONSE' | 'AWAITING_PAYMENT' | 'ACTIVE' | 'BLOCKED' | 'PARTIAL' | 'COMPLETED';
export type MessageType = 'FREE_RESPONSE' | 'PAID_MESSAGE' | 'SYSTEM_EVENT' | 'INTERNAL_DEV_NOTE';

// ─── Block types for rich editor ─────────────────────────────────────────────
export interface TextBlock { type: 'text'; content: any }         // Tiptap ProseMirror JSON
export interface CodeBlock { type: 'code'; language: string; content: string }
export interface CanvasBlock { type: 'canvas'; previewUrl: string; storageKey: string; canvasJsonKey: string }
export type Block = TextBlock | CodeBlock | CanvasBlock;

// ─── Pricing ─────────────────────────────────────────────────────────────────
export const BASE_PRICES: Record<SessionTier, number> = {
  QUICK_FOLLOWUP: 750,   // $7.50
  FIFTEEN_MIN:    3000,  // $30.00
  FULL_SOLUTION:  7500,  // $75.00+
};

export const PLATFORM_FEE_PCT = 0.15;
export const RETAINER_PRICE_CENTS = 30000; // $300/month

// ─── Clarity score labels ─────────────────────────────────────────────────────
export type ClarityLabel = 'high' | 'medium' | 'low';
export function getClarityLabel(score: number): ClarityLabel {
  if (score >= 8) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

// ─── Badge slugs ─────────────────────────────────────────────────────────────
export const BADGE_SLUGS = {
  TOP_RATED:    'top_rated',
  SCOPE_KEEPER: 'scope_keeper',
  RISING:       'rising',
  GOOD_CLIENT:  'good_client',
  UNDER_REVIEW: 'under_review',
  NEW:          'new',
} as const;
