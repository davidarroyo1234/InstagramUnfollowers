export interface Timings {
  timeBetweenSearchCycles: number;
  timeToWaitAfterFiveSearchCycles: number;
  timeBetweenUnfollows: number;
  timeToWaitAfterUnfollowBatch?: number;
  unfollowsPerBatch?: number;
  usersPerSearchCycle?: number;
}
