export interface User {
    readonly count: number;
    readonly page_info: PageInfo;
    readonly edges: Edge[];
}

export interface Edge {
    readonly node: Node;
}

export interface Node {
    readonly id: string;
    readonly username: string;
    readonly full_name: string;
    readonly profile_pic_url: string;
    readonly is_private: boolean;
    readonly is_verified: boolean;
    readonly followed_by_viewer: boolean;
    readonly follows_viewer: boolean;
    readonly requested_by_viewer: boolean;
    readonly reel: Reel;
}

export interface Reel {
    readonly id: string;
    readonly expiring_at: number;
    readonly has_pride_media: boolean;
    readonly latest_reel_media: number;
    readonly seen: null;
    readonly owner: Owner;
}

export interface Owner {
    readonly __typename: Typename;
    readonly id: string;
    readonly profile_pic_url: string;
    readonly username: string;
}

export enum Typename {
    GraphUser = 'GraphUser',
}

export interface PageInfo {
    readonly has_next_page: boolean;
    readonly end_cursor: string;
}
