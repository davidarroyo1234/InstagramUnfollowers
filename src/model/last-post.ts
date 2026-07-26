export type LastPostMode = 'manual' | 'auto';

export interface FeatureSettings {
  /** When false, the last-post feature is fully inert (no UI, no requests). */
  readonly lastPostBadgeEnabled: boolean;
  /** `manual`: fetch on click. `auto`: fetch when a card scrolls into view. */
  readonly lastPostMode: LastPostMode;
}

export const DEFAULT_FEATURE_SETTINGS: FeatureSettings = {
  lastPostBadgeEnabled: false,
  lastPostMode: 'manual',
};

/** Per-account badge data. `ageText`/`shortcode` fill in once a fetch resolves. */
export interface LastPostInfo {
  readonly status: 'loading' | 'loaded' | 'error';
  readonly ageText: string | null;
  readonly shortcode: string | null;
}
