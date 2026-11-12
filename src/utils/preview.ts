import { Typename, UserNode } from "../model/user";

const avatarUrl = (seed: string): string =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=0f172a,1f2937,312e81&fontFamily=Verdana`;

const createPreviewUser = (
  id: string,
  username: string,
  fullName: string,
  options: { readonly isPrivate?: boolean; readonly isVerified?: boolean; readonly followsViewer?: boolean } = {},
): UserNode => ({
  id,
  username,
  full_name: fullName,
  profile_pic_url: avatarUrl(username),
  is_private: options.isPrivate ?? false,
  is_verified: options.isVerified ?? false,
  followed_by_viewer: true,
  follows_viewer: options.followsViewer ?? false,
  requested_by_viewer: false,
  reel: {
    id,
    expiring_at: 0,
    has_pride_media: false,
    latest_reel_media: 0,
    seen: null,
    owner: {
      __typename: Typename.GraphUser,
      id,
      profile_pic_url: avatarUrl(username),
      username,
    },
  },
});

/**
 * Sample user list used only on localhost preview URLs without Instagram session cookies.
 */
export const getPreviewUsers = (): readonly UserNode[] => [
  createPreviewUser("1", "alina.frames", "Alina Moreno", { isVerified: true }),
  createPreviewUser("2", "brassandbone", "Theo Walsh", { isPrivate: true }),
  createPreviewUser("3", "citrus.archive", "Mara Kim", { followsViewer: true }),
  createPreviewUser("4", "dawnledger", "Jon Bell", { isPrivate: true }),
  createPreviewUser("5", "elias.market", "Elias Noor", { isVerified: true }),
  createPreviewUser("6", "fieldnotes.studio", "Nadia Reyes"),
  createPreviewUser("7", "glint.supply", "Remy Park", { followsViewer: true }),
  createPreviewUser("8", "harbor.sequence", "Ivy Chen", { isPrivate: true }),
  createPreviewUser("9", "inkline.daily", "Sofia Grant"),
  createPreviewUser("10", "juniper.signal", "Cal Reed", { isVerified: true }),
  createPreviewUser("11", "keystone.labs", "Mina Torres"),
  createPreviewUser("12", "lowlight.club", "Owen Voss", { isPrivate: true }),
];
