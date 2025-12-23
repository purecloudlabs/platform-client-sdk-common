export interface Config {
    name: string;
    envVars: EnvVars;
    settings: Settings;
    stageSettings: StageSettings;
}

interface EnvVars {
    [key: string]: Record<string, string | number | boolean> | string;
}

export interface PureCloud {
    EXCLUDE_NOTIFICATIONS?: boolean;
    clientId: string;
    clientSecret: string;
    environment: string;
}

export interface Settings {
    sdkRepo: SDKRepo;
    versionFile: string;
    logLevel: string;
    resourcePaths: ResourcePaths;
    extensionsDestination: string;
    swagger: Swagger;
    swaggerCodegen: SwaggerCodegen;
    headerProcessing?: HeaderProcessing;
    releaseNoteTemplatePath: string;
    releaseNoteSummaryTemplatePath: string;
    debugConfig: boolean;
    enableLoggerColor: boolean;
    namespace: string;
    apiHealthCheckUrl: string;
}

export interface ResourcePaths {
    extensions: string;
    templates: string;
    scripts: string;
}

export interface SDKRepo {
    repo: string;
    branch: string;
    tagFormat?: string;
}

export interface Swagger {
    oldSwaggerPath: string;
    newSwaggerPath: string;
    previewSwaggerPath: string;
    saveNewSwaggerPath: string;
    saveOldSwaggerPath: string;
}

export interface SwaggerCodegen {
    resourceLanguage: string;
    codegenLanguage: string;
    jarPath: string;
    configFile: string;
    extraGeneratorOptions: string[];
    generateApiTests: boolean;
    generateModelTests: boolean;

}

export interface HeaderProcessing {
    enabled: boolean;
    validationEnabled: boolean;
    mergingEnabled: boolean;
    supportedLanguages: string[];
    templateVariables: HeaderTemplateVariables;
}

export interface HeaderTemplateVariables {
    headerSupport: boolean;
    headerValidation: boolean;
    headerMerging: boolean;
    requestBuilderPattern?: boolean;
    dictionaryType?: string;
    dictType?: string;
    mapType?: string;
}

export interface StageSettings {
    prebuild: Prebuild;
    build: Build;
    postbuild: Postbuild;
}

export interface Build {
    preRunScripts: Script[];
    compileScripts: Script[];
    postRunScripts: Script[];
}



export interface Postbuild {
    gitCommit: boolean;
    publishRelease: boolean;
    preRunScripts: Script[];
    compileScripts: Script[];
    postRunScripts: Script[];
}

export interface Prebuild {
    preRunScripts: Script[];
    compileScripts: Script[];
    postRunScripts: Script[];
}

export interface Script {
    type: string;
    path: string;
    args: Array<string>;
    failOnError: boolean;
    appendIsNewReleaseArg?: boolean;
    appendVersionArg?: boolean;
    cwd?: string;
    command?: string;
}

export interface ArgClass {
    $ref: string;
}

export type Haystack = Config | Settings | SwaggerCodegen | SDKRepo | StageSettings | Swagger | PureCloud | HeaderProcessing | boolean | {};