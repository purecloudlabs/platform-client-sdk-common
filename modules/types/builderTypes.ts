export interface Resourcepaths {
    extensions:          string;
    scripts:       string;
    templates:      string;
}

export interface Version {
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

export interface Data {
    extraNotes:   string;
    hasExtraNotes: boolean;
    apiVersionData: ApiVersionData;
}

export interface APIData {
    operationId:  string;
    functionName: string;
    signature:    string;
    parameters?:  Parameter[];
    example:      string;
    return?:      string;
}

export interface Parameter {
    name:     string;
    type:     string;
    required: string;
}
