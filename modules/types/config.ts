export  interface Config {
    name:          string;
    envVars:       { [key: string]: any };
    settings:      Settings;
    stageSettings: StageSettings;
}

export interface Settings {
    sdkRepo:                        SDKRepo;
    versionFile:                    string;
    logLevel:                       string;
    resourcePaths:                  ResourcePaths;
    extensionsDestination:          string;
    swagger:                        Swagger;
    swaggerCodegen:                 SwaggerCodegen;
    releaseNoteTemplatePath:        string;
    releaseNoteSummaryTemplatePath: string;
    debugConfig:                    boolean;
    enableLoggerColor:              boolean;
    namespace:                      string;
    apiHealthCheckUrl:              string;
}

export interface ResourcePaths {
    extensions: string;
    templates: string;
    scripts: string;
}

export interface SDKRepo {
    repo:   string;
    branch: string;
    tagFormat: string;
}

export interface Swagger {
    oldSwaggerPath:     string;
    newSwaggerPath:     string;
    previewSwaggerPath: string;
    saveNewSwaggerPath: string;
    saveOldSwaggerPath: string;
}

export interface SwaggerCodegen {
    resourceLanguage:      string;
    codegenLanguage:       string;
    jarPath:               string;
    configFile:            string;
    extraGeneratorOptions: any[];
    generateApiTests: boolean;
    generateModelTests: boolean;

}

export interface StageSettings {
    prebuild:  Prebuild;
    build:     Build;
    postbuild: Postbuild;
}

export interface Build {
    preRunScripts:  Script[];
    compileScripts: Script[];
    postRunScripts: Script[];
}



export interface Postbuild {
    gitCommit:      boolean;
    publishRelease: boolean;
    preRunScripts:  Script[];
    compileScripts: Script[];
    postRunScripts: Script[];
}

export interface Prebuild {
    preRunScripts:  Script[];
    compileScripts: Script[];
    postRunScripts: Script[];
}

export interface Script {
    type:                   string;
    path:                   string;
    args:                   any;
    failOnError:            boolean;
    appendIsNewReleaseArg?: boolean;
    appendVersionArg?:      boolean;
    cwd?:                   string;
    command?:               string;
}

export interface ArgClass {
    $ref: string;
}

