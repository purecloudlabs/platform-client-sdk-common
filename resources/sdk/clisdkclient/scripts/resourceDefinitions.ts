export interface ResourceDefinitions {
    name:         string;
    supercommand: string;
    description:  string;
    get?:         Method;
    post?:        Method;
    patch?:       Method;
    put?:         Method;
    delete?:      Method;
}

export interface Method {
    name: string;
}

export interface Template {
    addImports?: string;
    addCommands?: string;
    supercommand?: string;
    description?: string;
    import?: string;
    addcommand?: string;
    short?: string;
	long?: string;
}
