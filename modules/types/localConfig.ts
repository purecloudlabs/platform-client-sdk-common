
export interface LocalConfig {
    envVars: EnvVars;
    overrides: Overrides;
}

export interface Overrides {
    settings: Settings;
    stageSettings: StageSettings;
}

export interface Settings {
    versionFile: string;
    swagger: Swagger;
    apiHealthCheckUrl: string;
}

export interface Swagger {
    oldSwaggerPath: string;
    newSwaggerPath: string;
    saveNewSwaggerPath: string;
}

export type valueOverides = Overrides | Settings | StageSettings | Postbuild | Script[] | Prebuild | Build | string | boolean | Array<ArgClass | string | boolean>;

export interface StageSettings {
    postbuild: Postbuild;
    prebuild: Prebuild;
    build: Build;
}

export interface Postbuild {
    gitCommit: boolean;
    publishRelease: boolean;
    postRunScripts: Script[];
    preRunScripts: Script[];
    compileScripts: Script[];
}

export interface Prebuild {
    postRunScripts: Script[];
    preRunScripts: Script[];
    compileScripts: Script[];
}

export interface Build {
    postRunScripts: Script[];
    preRunScripts: Script[];
    compileScripts: Script[];
}

export interface Script {
    type: string;
    path: string;
    args: Array<ArgClass | string | boolean>;
    appendIsNewReleaseArg: boolean;
    appendVersionArg: boolean;
    failOnError: boolean;
}

export interface ArgClass {
    $ref: string;
}

interface EnvVars {
    [key: string]: Record<string, string | number | boolean> | string;
}