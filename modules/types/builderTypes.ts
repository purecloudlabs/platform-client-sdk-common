export interface Resourcepaths {
    extensions: string;
    scripts: string;
    templates: string;
}

export interface Version {
    major: number;
    minor: number;
    point: number;
    prerelease: string;
    apiVersion: number;
    display?: string;
    displayFull?: string;
};


export interface PureCloud {
    EXCLUDE_NOTIFICATIONS?: boolean;
    clientId: string;
    clientSecret: string;
    environment: string;
}

export interface ApiVersionData {
    name: string;
    BuildTime: string;
    BuildVersion: string;
    ImplementationVersion: string;
}

export interface Data {
    extraNotes: string;
    hasExtraNotes: boolean;
    apiVersionData: ApiVersionData;
}

export interface APIData {
    operationId: string;
    functionName: string;
    signature: string;
    parameters?: Parameter[];
    example: string;
    return?: string;
}

export interface Parameter {
    name: string;
    type: string;
    required: string;
}


export interface Release {
    url: string;
    html_url: string;
    assets_url: string;
    upload_url: string;
    tarball_url: string;
    zipball_url: string;
    id: number;
    node_id: string;
    tag_name: string;
    target_commitish: string;
    name: string;
    body?: string;
    draft: boolean;
    prerelease: boolean;
    created_at: string;
    published_at: string;
    author: {
        name?: string;
        email?: string;
        login: string;
        id: number;
        node_id: string;
        avatar_url: string;
        gravatar_id: string;
        url: string;
        html_url: string;
        followers_url: string;
        following_url: string;
        gists_url: string;
        starred_url: string;
        subscriptions_url: string;
        organizations_url: string;
        repos_url: string;
        events_url: string;
        received_events_url: string;
        type: string;
        site_admin: boolean;
        starred_at?: string;
    };
    assets: {
        url: string;
        browser_download_url: string;
        id: number;
        node_id: string;
        name: string;
        label: string;
        state: "open" | "uploaded";
        content_type: string;
        size: number;
        download_count: number;
        created_at: string;
        updated_at: string;
        uploader: {
            name?: string;
            email?: string;
            login: string;
            id: number;
            node_id: string;
            avatar_url: string;
            gravatar_id: string;
            url: string;
            html_url: string;
            followers_url: string;
            following_url: string;
            gists_url: string;
            starred_url: string;
            subscriptions_url: string;
            organizations_url: string;
            repos_url: string;
            events_url: string;
            received_events_url: string;
            type: string;
            site_admin: boolean;
            starred_at?: string;
        };
    }[];
    body_html?: string;
    body_text?: string;
    mentions_count?: number;
    discussion_url?: string;
    reactions?: {
        url: string;
        total_count: number;
        "+1": number;
        "-1": number;
        laugh: number;
        confused: number;
        heart: number;
        hooray: number;
        eyes: number;
        rocket: number;
    };
}

