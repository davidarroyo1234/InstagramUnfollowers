import { UserNode } from "./user";
import { ScanningTab } from "./scanning-tab";
import { ScanningFilter } from "./scanning-filter";
import { UnfollowLogEntry } from "./unfollow-log-entry";
import { UnfollowFilter } from "./unfollow-filter";

type ScanningState = {
  readonly status: 'scanning';
  readonly page: number;
  readonly currentTab: ScanningTab;
  readonly searchTerm: string;
  readonly percentage: number;
  readonly results: readonly UserNode[];
  readonly whitelistedResults: readonly UserNode[];
  readonly selectedResults: readonly UserNode[];
  readonly filter: ScanningFilter;
};

type UnfollowingState = {
  readonly status: 'unfollowing';
  readonly searchTerm: string;
  readonly percentage: number;
  readonly selectedResults: readonly UserNode[];
  readonly unfollowLog: readonly UnfollowLogEntry[];
  readonly filter: UnfollowFilter;
};

//TODO THIS TYPE OF MULTIPLE STATE NEEDS TO BE SEPARETED IN DIFFERENT FILES ASAP (Global state,unfollowing state, scanning state etc...)
export type State = { readonly status: 'initial' } | ScanningState | UnfollowingState;
