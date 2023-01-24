export interface User {
    count?:     number;
    page_info?: PageInfo;
    edges?:     Edge[];
}

export interface Edge {
    node?: Node;
}

export interface Node {
    id?:                  string;
    username?:            string;
    full_name?:           string;
    profile_pic_url?:     string;
    is_private?:          boolean;
    is_verified?:         boolean;
    followed_by_viewer?:  boolean;
    follows_viewer?:      boolean;
    requested_by_viewer?: boolean;
    reel?:                Reel;
}

export interface Reel {
    id?:                string;
    expiring_at?:       number;
    has_pride_media?:   boolean;
    latest_reel_media?: number;
    seen?:              null;
    owner?:             Owner;
}

export interface Owner {
    __typename?:      Typename;
    id?:              string;
    profile_pic_url?: string;
    username?:        string;
}

export enum Typename {
    GraphUser = "GraphUser",
}

export interface PageInfo {
    has_next_page?: boolean;
    end_cursor?:    string;
}
