// Actionable: pending (cancel), following (unfollow), failed (retry).
// Non-actionable: unverified/running transient; done/skipped/accepted/ghost terminal.
export type CancelStatus =
  | "unverified"
  | "pending"
  | "following"
  | "running"
  | "done"
  | "failed"
  | "skipped"
  | "accepted"
  | "ghost";

// Mutable: the cancel worker updates rows in place over a copied working ref.
export interface CancelRequest {
  username: string;
  // The JSON export's fbid is ignored; the real id is resolved at scan time via web_profile_info.
  id: string | null;
  timestamp: number;
  status: CancelStatus;
  checked?: boolean;
  selected?: boolean;
  fullName?: string;
  profilePicUrl?: string;
  isPrivate?: boolean;
  isVerified?: boolean;
}
