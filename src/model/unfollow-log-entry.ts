import { UserNode } from "./user";

export interface UnfollowLogEntry {
  readonly user: UserNode;
  readonly unfollowedSuccessfully: boolean;
}
