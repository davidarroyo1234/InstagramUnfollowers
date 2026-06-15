// Status of a single pending follow-request as it moves through the cancel flow.
export type CancelStatus =
  | "unverified" // Loaded from JSON, not yet checked against Instagram.
  | "pending"    // Verified: the outgoing follow request is still pending (can be cancelled).
  | "following"  // The request was accepted and you currently follow them (can be unfollowed).
  | "running"    // Currently being processed (resolving id / verifying / cancelling).
  | "done"       // Successfully cancelled / unfollowed.
  | "failed"     // Action failed (can be retried).
  | "skipped"    // Skipped by the user or because it is whitelisted.
  | "accepted"   // Resolved — no outgoing request and you do not follow them; nothing to do.
  | "ghost";     // The username could not be resolved (account not found / renamed).

// A pending follow request parsed from `pending_follow_requests.json`.
// Fields are mutable because the cancel worker updates them in place while iterating;
// the parsed list is copied into the component's working ref before being mutated.
export interface CancelRequest {
  username: string;
  // Instagram numeric id. Unknown at load time (the JSON only has usernames), resolved at runtime.
  id: string | null;
  // Unix timestamp (seconds) of when the follow request was sent.
  timestamp: number;
  status: CancelStatus;
  // Whether the friendship state has already been verified during this session.
  checked?: boolean;
  // Whether the user has selected this row to be cancelled.
  selected?: boolean;
  // Profile info, populated when the account is resolved via web_profile_info (for display).
  fullName?: string;
  profilePicUrl?: string;
  isPrivate?: boolean;
  isVerified?: boolean;
}
