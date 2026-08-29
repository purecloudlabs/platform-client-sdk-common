export interface Config extends Record<string, any> {
    name: string;
    envVars: EnvVars;
    settings: Settings;
    stageSettings: StageSettings;
}

export interface LocalConfig {
    envVars: EnvVars;
    overrides: Overrides;
}

export interface Overrides {
    settings: Settings;
    stageSettings: StageSettings;
}

interface EnvVars {
    [key: string]: Record<string, string | number | boolean> | string;
}

export type valueOverides = Overrides | Settings | StageSettings | Postbuild | Script[] | Prebuild | Build | string | boolean | Array<ArgClass | string | boolean>;

export type Haystack = Config | Settings | SwaggerCodegen | SwaggerPreprocessing | SDKRepo | StageSettings | Swagger | PureCloud | boolean | {};

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
    samplesDestination?: string;
    swagger: Swagger;
    swaggerCodegen: SwaggerCodegen;
    specificationPreprocessing?: SpecificationPreprocessing;
    releaseNoteTemplatePath: string;
    releaseNoteSummaryTemplatePath: string;
    debugConfig: boolean;
    enableLoggerColor: boolean;
    namespace: string;
    apiHealthCheckUrl: string;
}

export interface ResourcePaths {
    extensions: string;
    samples?: string;
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
    sdkPathLanguage?: string;
    jarPath: string;
    configFile: string;
    extraGeneratorOptions: string[];
    generateApiTests: boolean;
    generateModelTests: boolean;
    isOpenApiCustomGenerator: boolean;
}

export interface SpecificationPreprocessing {
    add: {
        tags: any[],
        securities: Record<string, any>
    };
    override: {
        modelNames: Record<string, string>,
        operationIds: Record<string, Record<string, string>>,
        modelsToPrimitiveType: Record<string, any>,
        models: Record<string, any>,
        operations: Record<string, Record<string, any>>
    };
    filter: {
        keep: {
            tags: string[],
            securities: string[],
            operationIds: string[],
            paths: string[],
            consumes: string[],
            produces: string[]
        },
        exclude: {
            tags: string[],
            securities: string[],
            operationIds: string[],
            paths: string[],
            consumes: string[],
            produces: string[]
        }
    };
    removeUnused: boolean;
    notifications: NotificationsPreprocessing;
    specific?: SwaggerPreprocessing | OpenApiPreprocessing;
    addPolymorphismInfo: boolean;
    analyzeReportBefore: boolean;
    analyzeReportAfter: boolean;
}

export interface NotificationsPreprocessing {
    // Add Notifications
    addNotifications: boolean;
    forceInt64Integers: boolean;
    replaceTypeAny: boolean;
    removeEnumDuplicates: boolean;
}

export interface SwaggerPreprocessing {
    type: "swagger";
    // - Legacy Path update    
    processPaths: boolean;
    // - Legacy Ref and AnyTypes update 
    processRefs: boolean;
    // Update collection format to csv in operation with tags
    forceCSVCollectionFormatInTags: string[];
    // - Enums (enum duplicates, boolean enum, string boolean enum as parameter)
    processEnums: boolean;
    // Add enum names, enum description - x-enum-varnames
    // - Discriminator
    discriminatorManagement: string;
    keepDiscriminatorModels: string[];
    // - Modify OneOf (from x-genesys-one-of) and discriminator related models
    updateOneOf: boolean;
}

export interface OpenApiPreprocessing {
    type: "openapi";
    replaceResponseWithArrayRef: boolean;
    // - Legacy Path update    
    processPaths: boolean;
    // Update collection format to csv in operation with tags
    forceCSVCollectionFormatInTags: string[];
    // - Enums (enum duplicates, boolean enum, string boolean enum as parameter)
    processEnums: boolean;
    // - Modify OneOf (from x-genesys-one-of) and discriminator related models
    updateOneOf: boolean;
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
