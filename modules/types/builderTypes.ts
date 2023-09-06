export interface resourcepaths {
    extensions:          string;
    scripts:       string;
    templates:      string;
}

export interface version {
    major:          number;
    minor:       number;
    point:      number;
    prerelease: string;
    apiVersion: number;
    display?: string;
    displayFull?: string;
};


export interface PureCloud {
    EXCLUDE_NOTIFICATIONS?:   boolean;
    clientId:     string;
    clientSecret: string;
    environment:   string;
}

export interface ApiVersionData {
    name:   string;
    BuildTime: string;
    BuildVersion: string;
    ImplementationVersion: string;
}