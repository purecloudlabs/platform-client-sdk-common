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
    swaggerPreprocessing?: SwaggerPreprocessing;
    openapiPreprocessing?: OpenApiPreprocessing;
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

export interface SwaggerPreprocessing {
    // Update Swagger
    // - Replace operationId - { "path1": { "get": "new operation id for path1 get", "post": "new operation id for path1 post" }, ... }
    overrideOperationIds?: any;
    // - Replace Model name - { "old model name": "new model name", ... }
    overrideModelNames?: Record<string, string>;
    // - Replace/Override Model
    overrideModels?: Record<string, any>;
    // - Replace/Override Model with primitive type
    overrideModelsToPrimitiveType?: Record<string, any>;
    quarantineModelNames?: string[];
    // Filter Tags (keep and remove==quarantine)
    keepTags?: string[];
    quarantineTags?: string[];
    // Filter OperationIds (keep and remove==quarantine)
    keepOperationIds?: string[];
    quarantineOperationIds?: string[];
    // Filter Security (keep and remove==quarantine) - keyword for no security: NO_AUTH
    keepSecurities?: string[];
    quarantineSecurities?: string[];
    // Filter Consumes (keep and remove==quarantine)
    keepConsumes?: string[];
    quarantineConsumes?: string[];
    // Filter Produces (keep and remove==quarantine)
    keepProduces?: string[];
    quarantineProduces?: string[];
    // Filter Paths (keep and remove==quarantine)
    keepPaths?: string[];
    quarantinePaths?: string[];
    // - Legacy Path update    
    processPaths?: boolean;
    // Update collection format to csv in operation with tags
    forceCSVCollectionFormatInTags?: string[];
    // Import missing tags
    importTags?: any[];
    // Import missing securities
    importSecurities?: Record<string, any>;

    // Add Notifications
    addNotifications?: boolean;
    forceInt64Integers?: boolean;
    notificationsProcessAnyTypes?: boolean;
    notificationsRemoveEnumDuplicates?: boolean;
    
    // Sanitize Swagger
    processAnyTypes?: boolean;
    // - Enums (enum duplicates, boolean enum, string boolean enum as parameter)
    processEnums?: boolean;
    // Add enum names, enum description - x-enum-varnames
    // - Discriminator
    discriminatorManagement?: string;
    keepDiscriminatorModels?: string[];
    // - Modify OneOf (from x-genesys-one-of) and discriminator related models
    updateOneOf?: boolean;
    updateDiscriminator?: boolean;
    // - Legacy Ref and AnyTypes update 
    processRefs?: boolean;

    // Filter Swagger
    removeUnusedTagsAndDefinitions?: boolean;

    // Report
    reportBeforeSanitize?: boolean;
    reportAfterSanitize?: boolean;

}

export interface OpenApiPreprocessing {
    // Update Swagger
    // - Replace operationId - { "path1": { "get": "new operation id for path1 get", "post": "new operation id for path1 post" }, ... }
    overrideOperationIds?: any;
    // - Replace Model name - { "old model name": "new model name", ... }
    overrideModelNames?: Record<string, string>;
    // - Replace/Override Model
    overrideModels?: Record<string, any>;
    // - Replace/Override Model with primitive type
    overrideModelsToPrimitiveType?: Record<string, any>;
    quarantineModelNames?: string[];
    // Filter Tags (keep and remove==quarantine)
    keepTags?: string[];
    quarantineTags?: string[];
    // Filter OperationIds (keep and remove==quarantine)
    keepOperationIds?: string[];
    quarantineOperationIds?: string[];
    // Filter Security (keep and remove==quarantine) - keyword for no security: NO_AUTH
    keepSecurities?: string[];
    quarantineSecurities?: string[];
    // Filter Consumes (keep and remove==quarantine)
    keepConsumes?: string[];
    quarantineConsumes?: string[];
    // Filter Produces (keep and remove==quarantine)
    keepProduces?: string[];
    quarantineProduces?: string[];
    // Filter Paths (keep and remove==quarantine)
    keepPaths?: string[];
    quarantinePaths?: string[];
    // - Legacy Path update    
    processPaths?: boolean;
    // Update collection format to csv in operation with tags
    forceCSVCollectionFormatInTags?: string[];
    // Import missing tags
    importTags?: any[];
    // Import missing securities
    importSecurities?: Record<string, any>;

    // Add Notifications
    addNotifications?: boolean;
    forceInt64Integers?: boolean;
    notificationsProcessAnyTypes?: boolean;
    notificationsRemoveEnumDuplicates?: boolean;
    
    // Sanitize Swagger
    processAnyTypes?: boolean;
    // - Enums (enum duplicates, boolean enum, string boolean enum as parameter)
    processEnums?: boolean;
    // Add enum names, enum description - x-enum-varnames
    // - Discriminator
    discriminatorManagement?: string;
    keepDiscriminatorModels?: string[];
    // - Modify OneOf (from x-genesys-one-of) and discriminator related models
    updateOneOf?: boolean;
    updateDiscriminator?: boolean;
    // - Legacy Ref and AnyTypes update 
    processRefs?: boolean;

    // Filter Swagger
    removeUnusedTagsAndDefinitions?: boolean;

    // Report
    reportBeforeSanitize?: boolean;
    reportAfterSanitize?: boolean;

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
