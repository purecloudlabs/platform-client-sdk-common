export interface Swagger {
    swagger:             string;
    info:                Info;
    host:                string;
    tags:                Tag[];
    schemes:             string[];
    consumes:            ProduceElement[];
    produces:            ProduceElement[];
    paths:               { [key: string]: Path };
    securityDefinitions: SecurityDefinitions;
    definitions:         { [key: string]: Definition };
    responses:           { [key: string]: The202_Value };
    externalDocs:        ExternalDocs;
}

export enum ProduceElement {
    ApplicationJSON = "application/json",
    ApplicationScimJSON = "application/scim+json",
    TextCalendar = "text/calendar",
    TextPlain = "text/plain",
}

export interface Definition {
    type:         ItemsType;
    properties?:  { [key: string]: Property };
    required?:    string[];
    description?: string;
}

export interface Property {
    type?:                      ItemsType;
    description?:               string;
    items?:                     PropertyItems;
    readOnly?:                  boolean;
    $ref?:                      string;
    format?:                    Format;
    enum?:                      Array<number | string>;
    additionalProperties?:      PropertyAdditionalProperties;
    example?:                   number | string;
    uniqueItems?:               boolean;
    position?:                  number;
    maxItems?:                  number;
    minItems?:                  number;
    "x-genesys-entity-type"?:   XGenesysEntityType;
    minLength?:                 number;
    maxLength?:                 number;
    allowEmptyValue?:           boolean;
    minimum?:                   number;
    maximum?:                   number;
    "x-genesys-search-fields"?: XGenesysSearchFields;
    allOf?:                AllOf[];
    properties?:           PropertyProperties;
}

export interface AllOf {
    $ref: string;
}

export interface PropertyProperties {
    metadata?:  Metadata;
    messageId?: MessageID;
}

export interface MessageID {
    type: Type;
}

export interface Metadata {
    properties: MetadataProperties;
    required:   string[];
    type:       Type;
}

export interface MetadataProperties {
    customAttributes: CustomAttributes;
}

export interface CustomAttributes {
    properties:           Paths;
    additionalProperties: MessageID;
    type:                 Type;
}

export interface Paths {
}

export enum Type {
    Array = "array",
    Boolean = "boolean",
    Integer = "integer",
    Number = "number",
    Object = "object",
    String = "string",
}


export interface PropertyAdditionalProperties {
    type?:                 ItemsType;
    items?:                SchemaClass;
    format?:               Format;
    $ref?:                 string;
    uniqueItems?:          boolean;
    enum?:                 string[];
    additionalProperties?: AdditionalPropertiesAdditionalProperties;
}

export interface AdditionalPropertiesAdditionalProperties {
    type:   ItemsType;
    items?: AdditionalPropertiesClass;
}

export interface AdditionalPropertiesClass {
    type: ItemsType;
}

export enum ItemsType {
    Array = "array",
    Boolean = "boolean",
    File = "file",
    Integer = "integer",
    Number = "number",
    Object = "object",
    Ref = "ref",
    String = "string",
}

export enum Format {
    Date = "date",
    DateTime = "date-time",
    Double = "double",
    Float = "float",
    Int32 = "int32",
    Int64 = "int64",
    Interval = "interval",
    LocalDateTime = "local-date-time",
    URI = "uri",
    URL = "url",
}

export interface SchemaClass {
    type?: ItemsType;
    $ref?: string;
    enum?: string[];
}

export interface PropertyItems {
    $ref?:                 string;
    type?:                 ItemsType;
    enum?:                 string[];
    additionalProperties?: AdditionalProperties;
    format?:               Format;
    description?:          string;
    items?:                AdditionalPropertiesClass;
}

export interface AdditionalProperties {
    type?: ItemsType;
    $ref?: string;
}

export interface XGenesysEntityType {
    value: Value;
}

export enum Value {
    DimensionSelector = "DIMENSION_SELECTOR",
    DimensionType = "DIMENSION_TYPE",
    DivisionID = "DIVISION_ID",
    QueueID = "QUEUE_ID",
    UserID = "USER_ID",
}

export interface XGenesysSearchFields {
    value: string[];
}

export interface ExternalDocs {
    description: string;
    url:         string;
}

export interface Info {
    description:    string;
    version:        string;
    title:          string;
    termsOfService: string;
    contact:        Contact;
    license:        License;
}

export interface Contact {
    name:  string;
    url:   string;
    email: string;
}

export interface License {
    name: string;
    url:  string;
}

export interface Path {
    post?:   Post;
    get?:    Get;
    put?:    Put;
    delete?: Delete;
    head?:   Head;
    patch?:  Patch;
}

export interface Delete {
    tags:                           string[];
    summary:                        string;
    description:                    string;
    operationId:                    string;
    produces:                       ProduceElement[];
    parameters:                     DeleteParameter[];
    responses:                      DeleteResponses;
    security?:                      DeleteSecurity[];
    "x-inin-requires-permissions"?: XIninRequiresPermissions;
    "x-purecloud-method-name":      string;
    "x-genesys-visibility"?:        XGenesysVisibility;
    deprecated?:                    boolean;
    "x-genesys-preview"?:           boolean;
    consumes?:                      ProduceElement[];
}

export interface DeleteParameter {
    name:              string;
    in:                In;
    description?:      string;
    required:          boolean;
    type?:             ItemsType;
    default?:          boolean | string;
    schema?:           ParameterAdditionalProperties;
    enum?:             string[];
    items?:            AdditionalPropertiesClass;
    collectionFormat?: CollectionFormat;
    "x-example"?:      string;
    format?:           Format;
}

export enum CollectionFormat {
    Multi = "multi",
}

export enum In {
    Body = "body",
    FormData = "formData",
    Header = "header",
    Path = "path",
    Query = "query",
}

export interface ParameterAdditionalProperties {
    type:   ItemsType;
    items?: ItemsClass;
}

export interface ItemsClass {
    $ref: Ref;
}

export enum Ref {
    DefinitionsAssistantQueue = "#/definitions/AssistantQueue",
    DefinitionsCoachingAppointmentReference = "#/definitions/CoachingAppointmentReference",
    DefinitionsEmpty = "#/definitions/Empty",
    DefinitionsErrorBody = "#/definitions/ErrorBody",
    DefinitionsErrorInfo = "#/definitions/ErrorInfo",
    DefinitionsInventoryNumber = "#/definitions/InventoryNumber",
    DefinitionsInventoryNumberResponse = "#/definitions/InventoryNumberResponse",
    DefinitionsKnowledgeDocumentBulkRequest = "#/definitions/KnowledgeDocumentBulkRequest",
    DefinitionsKnowledgeFeedbackPatchRequest = "#/definitions/KnowledgeFeedbackPatchRequest",
    DefinitionsNumberRate = "#/definitions/NumberRate",
    DefinitionsPatchUser = "#/definitions/PatchUser",
    DefinitionsQueueMember = "#/definitions/QueueMember",
    DefinitionsReseller = "#/definitions/Reseller",
    DefinitionsScimError = "#/definitions/ScimError",
    DefinitionsUsageRateRegion = "#/definitions/UsageRateRegion",
    DefinitionsUserExternalIdentifier = "#/definitions/UserExternalIdentifier",
    DefinitionsUserQueue = "#/definitions/UserQueue",
    DefinitionsUserRoutingLanguagePost = "#/definitions/UserRoutingLanguagePost",
    DefinitionsUserRoutingSkillPost = "#/definitions/UserRoutingSkillPost",
}

export interface DeleteResponses {
    "204"?:   The204;
    "400":    The500_Class;
    "401":    The401;
    "403":    The403;
    "404":    Purple404;
    "408":    Purple408;
    "413":    Purple413;
    "415":    The415;
    "429":    The429;
    "500":    The500_Class;
    "503":    Purple503;
    "504":    Purple504;
    "200"?:   The202_Class;
    default?: The204;
    "202"?:   The202_Value;
    "423"?:   The204;
    "409"?:   Purple409;
    "501"?:   Purple501;
    "424"?:   Purple424;
    "422"?:   Purple422;
    "405"?:   Purple405;
    "410"?:   The410;
}

export interface The202_Class {
    description: string;
    schema?:     AdditionalProperties;
}

export interface The202_Value {
    description: string;
    schema?:     ItemsClass;
}

export interface The204 {
    description: string;
}

export interface The500_Class {
    description:          string;
    schema:               ItemsClass;
    "x-inin-error-codes": { [key: string]: string };
}

export interface The401 {
    description:          string;
    schema:               ItemsClass;
    "x-inin-error-codes": The401_XIninErrorCodes;
}

export interface The401_XIninErrorCodes {
    "authentication.required": string;
    "ip.not.authorized":       string;
    "bad.credentials":         BadCredentials;
    "credentials.expired"?:    string;
    unauthorized?:             string;
}

export enum BadCredentials {
    InvalidLoginCredentials = "Invalid login credentials.",
}

export interface The403 {
    description:          The403_Description;
    schema:               ItemsClass;
    "x-inin-error-codes": { [key: string]: string };
}

export enum The403_Description {
    YouAreNotAuthorizedToPerformTheRequestedAction = "You are not authorized to perform the requested action.",
}

export interface Purple404 {
    description:          NotFoundEnum;
    schema:               ItemsClass;
    "x-inin-error-codes": { [key: string]: string };
}

export enum NotFoundEnum {
    TheRequestedResourceWasNotFound = "The requested resource was not found.",
}

export interface Purple405 {
    description:          The405_Description;
    schema:               ItemsClass;
    "x-inin-error-codes": { [key: string]: string };
}

export enum The405_Description {
    MethodNotAllowed = "Method Not Allowed",
}

export interface Purple408 {
    description:          string;
    schema:               ItemsClass;
    "x-inin-error-codes": PurpleXIninErrorCodes;
}

export interface PurpleXIninErrorCodes {
    "client.timeout": string;
}

export interface Purple409 {
    description:           The409_Description;
    schema:                ItemsClass;
    "x-inin-error-codes"?: { [key: string]: string };
}

export enum The409_Description {
    Conflict = "Conflict",
    ResourceConflictUnexpectedVersionWasProvided = "Resource conflict - Unexpected version was provided",
    VersionDoesNotMatchCurrentVersion = "Version does not match current version.",
}

export interface The410 {
    description:          The410_Description;
    schema:               ItemsClass;
    "x-inin-error-codes": The410_XIninErrorCodes;
}

export enum The410_Description {
    Gone = "Gone",
}

export interface The410_XIninErrorCodes {
    "architect.flow.deleted": ArchitectFlowDeleted;
}

export enum ArchitectFlowDeleted {
    FlowHasBeenDeleted = "Flow has been deleted.",
}

export interface Purple413 {
    description:          RequestEntityTooLargeEnum;
    schema:               ItemsClass;
    "x-inin-error-codes": FluffyXIninErrorCodes;
}

export enum RequestEntityTooLargeEnum {
    DiagnosticEmailSizeTooLarge = "DIAGNOSTIC_EMAIL_SIZE_TOO_LARGE",
    DiagnosticSizeTooLarge = "DIAGNOSTIC_SIZE_TOO_LARGE",
    PayloadTooLarge = "Payload too large",
    TheRequestIsOverTheSizeLimitMaximumBytesS = "The request is over the size limit. Maximum bytes: %s",
}

export interface FluffyXIninErrorCodes {
    "request.entity.too.large": RequestEntityTooLargeEnum;
}

export interface The415 {
    description:          string;
    schema:               ItemsClass;
    "x-inin-error-codes": The415_XIninErrorCodes;
}

export interface The415_XIninErrorCodes {
    "unsupported.media.type": string;
}

export interface Purple422 {
    schema:               ItemsClass;
    "x-inin-error-codes": TentacledXIninErrorCodes;
}

export interface TentacledXIninErrorCodes {
    "payload.or.params.invalid": string;
}

export interface Purple424 {
    schema:               ItemsClass;
    "x-inin-error-codes": StickyXIninErrorCodes;
}

export interface StickyXIninErrorCodes {
    "knowledgebase.bot.flow.status.unknown": string;
}

export interface The429 {
    description:          string;
    schema?:              ItemsClass;
    "x-inin-error-codes": The429_XIninErrorCodes;
}

export interface The429_XIninErrorCodes {
    "too.many.requests.retry.after": string;
    "too.many.requests":             string;
}

export interface Purple501 {
    description:          The501_Description;
    schema:               ItemsClass;
    "x-inin-error-codes": IndigoXIninErrorCodes;
}

export enum The501_Description {
    NotImplemented = "Not Implemented",
}

export interface IndigoXIninErrorCodes {
    "not.implemented": NotImplemented;
}

export enum NotImplemented {
    DNCListDeleteAllOrExpiredEntriesFeatureNotEnabled = "DNC list delete all or expired entries feature not enabled",
    FeatureToggleIsNotEnabled = "Feature toggle is not enabled",
    FeatureToggleIsNotEnabledForThisEndpoint = "Feature toggle is not enabled for this endpoint.",
}

export interface Purple503 {
    description:          string;
    schema:               ItemsClass;
    "x-inin-error-codes": IndecentXIninErrorCodes;
}

export interface IndecentXIninErrorCodes {
    "service.unavailable":                                              string;
    "flows.datatables.server.too.busy"?:                                string;
    "employee.performance.external.metric.definition.server.too.busy"?: string;
    "service not available"?:                                           string;
    "wem.learning.server.too.busy"?:                                    string;
}

export interface Purple504 {
    description:          RequestTimeoutEnum;
    schema:               ItemsClass;
    "x-inin-error-codes": HilariousXIninErrorCodes;
}

export enum RequestTimeoutEnum {
    TheRequestTimedOut = "The request timed out.",
}

export interface HilariousXIninErrorCodes {
    "authentication.request.timeout": AuthenticationRequestTimeout;
    "request.timeout":                RequestTimeoutEnum;
}

export enum AuthenticationRequestTimeout {
    AuthenticationRequestTimeout = "Authentication request timeout.",
}

export interface DeleteSecurity {
    "PureCloud OAuth"?:  string[];
    "Guest Chat JWT"?:   any[];
    "Webmessaging JWT"?: any[];
}

export enum XGenesysVisibility {
    Internal = "internal",
    Unstable = "unstable",
}

export interface XIninRequiresPermissions {
    type:        XIninRequiresPermissionsType;
    permissions: string[];
}

export enum XIninRequiresPermissionsType {
    All = "ALL",
    Any = "ANY",
}

export interface Get {
    tags:                           string[];
    summary:                        string;
    description:                    string;
    operationId:                    string;
    produces:                       ProduceElement[];
    parameters:                     GetParameter[];
    responses:                      GetResponses;
    security?:                      DeleteSecurity[];
    "x-purecloud-method-name":      string;
    "x-genesys-visibility"?:        XGenesysVisibility;
    "x-inin-requires-permissions"?: XIninRequiresPermissions;
    "x-genesys-preview"?:           boolean;
    deprecated?:                    boolean;
    consumes?:                      ProduceElement[];
}

export interface GetParameter {
    name:              string;
    in:                In;
    description?:      string;
    required:          boolean;
    type:              ItemsType;
    default?:          boolean | number | string;
    enum?:             string[];
    format?:           Format;
    items?:            PurpleItems;
    collectionFormat?: CollectionFormat;
    "x-example"?:      string;
}

export interface PurpleItems {
    type:     ItemsType;
    enum?:    string[];
    default?: string;
}

export interface GetResponses {
    "200"?:   Purple200;
    "400":    The500_Class;
    "401":    The401;
    "403":    The403;
    "404":    Purple404;
    "408":    Fluffy408;
    "413":    Purple413;
    "415":    The415;
    "429":    The429;
    "500":    The500_Class;
    "503":    The500_Class;
    "504":    Fluffy504;
    "202"?:   The202;
    "424"?:   Fluffy424;
    "204"?:   The204;
    "422"?:   Fluffy422;
    "307"?:   The204;
    "501"?:   Purple501;
    "409"?:   Fluffy409;
    "303"?:   The204;
    default?: The204;
    "304"?:   The204;
    "301"?:   The204;
    "502"?:   Purple502;
    "206"?:   The204;
    "410"?:   The410;
    "405"?:   Purple405;
}

export interface Purple200 {
    description: string;
    schema:      PurpleSchema;
}

export interface PurpleSchema {
    $ref?:                 string;
    type?:                 ItemsType;
    additionalProperties?: ParameterAdditionalProperties;
    items?:                AdditionalProperties;
    format?:               Format;
    uniqueItems?:          boolean;
    enum?:                 string[];
}

export interface The202 {
    description: string;
    schema?:     SchemaClass;
}

export interface Fluffy408 {
    description:          string;
    schema:               ItemsClass;
    "x-inin-error-codes": AmbitiousXIninErrorCodes;
}

export interface AmbitiousXIninErrorCodes {
    "client.timeout": string;
    unknown?:         string;
}

export interface Fluffy409 {
    description:          The409_Description;
    schema:               ItemsClass;
    "x-inin-error-codes": The409_XIninErrorCodes;
}

export interface The409_XIninErrorCodes {
    "general.conflict"?:          string;
    "migrations.not.supported"?:  string;
    "general.resource.conflict"?: string;
}

export interface Fluffy422 {
    schema:               ItemsClass;
    "x-inin-error-codes": CunningXIninErrorCodes;
}

export interface CunningXIninErrorCodes {
    "dynamic.schema.expand.failed"?: DynamicSchemaExpandFailed;
    "unprocessable.entity"?:         string;
    "payload.or.params.invalid"?:    string;
}

export enum DynamicSchemaExpandFailed {
    TheSchemaToExpandHasParseErrors = "The schema to expand has parse errors",
    UnableToExpandTheSchema = "Unable to expand the schema.",
}

export interface Fluffy424 {
    schema:               ItemsClass;
    "x-inin-error-codes": MagentaXIninErrorCodes;
}

export interface MagentaXIninErrorCodes {
    "externalservice.unexpectedresponsecode": string;
}

export interface Purple502 {
    description:          string;
    schema:               ItemsClass;
    "x-inin-error-codes": FriskyXIninErrorCodes;
}

export interface FriskyXIninErrorCodes {
    "502": string;
}

export interface Fluffy504 {
    description:          RequestTimeoutEnum;
    schema:               ItemsClass;
    "x-inin-error-codes": MischievousXIninErrorCodes;
}

export interface MischievousXIninErrorCodes {
    "authentication.request.timeout":   AuthenticationRequestTimeout;
    "request.timeout":                  RequestTimeoutEnum;
    "postino.error.request.timeout"?:   string;
    "quality.backend.service.timeout"?: string;
}

export interface Head {
    tags:                      string[];
    summary:                   string;
    description:               string;
    operationId:               string;
    produces:                  ProduceElement[];
    parameters:                HeadParameter[];
    responses:                 HeadResponses;
    security?:                 HeadSecurity[];
    "x-purecloud-method-name": string;
    "x-genesys-visibility"?:   XGenesysVisibility;
}

export interface HeadParameter {
    name:        string;
    in:          In;
    description: string;
    required:    boolean;
    type:        ItemsType;
}

export interface HeadResponses {
    "400":    Purple400;
    "401":    The401;
    "403":    The403;
    "404":    Fluffy404;
    "408":    Purple408;
    "413":    Purple413;
    "415":    The415;
    "429":    The429;
    "500":    The500;
    "503":    Fluffy503;
    "504":    Purple504;
    default?: The204;
    "200"?:   The204;
}

export interface Purple400 {
    description:          string;
    schema:               ItemsClass;
    "x-inin-error-codes": The400_XIninErrorCodes;
}

export interface The400_XIninErrorCodes {
    "bad.request":               string;
    "response.entity.too.large": string;
}

export interface Fluffy404 {
    description:          NotFoundEnum;
    schema:               ItemsClass;
    "x-inin-error-codes": The404_XIninErrorCodes;
}

export interface The404_XIninErrorCodes {
    "not.found": NotFoundEnum;
}

export interface The500 {
    description:          string;
    schema:               ItemsClass;
    "x-inin-error-codes": The500_XIninErrorCodes;
}

export interface The500_XIninErrorCodes {
    "internal.server.error": string;
}

export interface Fluffy503 {
    description:          string;
    schema:               ItemsClass;
    "x-inin-error-codes": BraggadociousXIninErrorCodes;
}

export interface BraggadociousXIninErrorCodes {
    "service.unavailable": string;
}

export interface HeadSecurity {
    "PureCloud OAuth": string[];
}

export interface Patch {
    tags:                           string[];
    summary:                        string;
    description:                    string;
    operationId:                    string;
    produces:                       ProduceElement[];
    parameters:                     PatchParameter[];
    responses:                      PatchResponses;
    security?:                      PatchSecurity[];
    "x-genesys-visibility"?:        XGenesysVisibility;
    "x-inin-requires-permissions"?: XIninRequiresPermissions;
    "x-purecloud-method-name":      string;
    deprecated?:                    boolean;
    consumes?:                      ProduceElement[];
    "x-genesys-preview"?:           boolean;
}

export interface PatchParameter {
    in:                In;
    name:              string;
    description?:      string;
    required:          boolean;
    schema?:           The201_Schema;
    type?:             ItemsType;
    enum?:             string[];
    default?:          number;
    format?:           Format;
    items?:            AdditionalPropertiesClass;
    collectionFormat?: CollectionFormat;
    "x-example"?:      string;
}

export interface The201_Schema {
    $ref?:                 string;
    type?:                 ItemsType;
    items?:                ItemsClass;
    additionalProperties?: ItemsClass;
}

export interface PatchResponses {
    "200"?:   The201_Class;
    "400":    The500_Class;
    "401":    The401;
    "403":    The403;
    "404":    Purple404;
    "408":    Purple408;
    "413":    Purple413;
    "415":    The415;
    "429":    The429;
    "500":    The500_Class;
    "503":    Tentacled503;
    "504":    Tentacled504;
    "409"?:   Tentacled409;
    "204"?:   The204;
    "422"?:   Tentacled422;
    "202"?:   The202_Class;
    "412"?:   Purple412;
    "501"?:   Purple501;
    "405"?:   Fluffy405;
    default?: The204;
}

export interface The201_Class {
    description: string;
    schema?:     The201_Schema;
}

export interface Fluffy405 {
    description:          The405_Description;
    schema:               ItemsClass;
    "x-inin-error-codes": The405_XIninErrorCodes;
}

export interface The405_XIninErrorCodes {
    "featuretoggleservice.featurenotenabled": string;
}

export interface Tentacled409 {
    description:           The409_Description;
    schema?:               ItemsClass;
    "x-inin-error-codes"?: { [key: string]: string };
}

export interface Purple412 {
    description:          string;
    schema:               ItemsClass;
    "x-inin-error-codes": XIninErrorCodes1;
}

export interface XIninErrorCodes1 {
    "callback.error.already.triggered": string;
}

export interface Tentacled422 {
    schema:               ItemsClass;
    "x-inin-error-codes": { [key: string]: string };
}

export interface Tentacled503 {
    description:          string;
    schema:               ItemsClass;
    "x-inin-error-codes": XIninErrorCodes2;
}

export interface XIninErrorCodes2 {
    "service.unavailable":                                              string;
    "postino.error.temporarily.unavailable"?:                           string;
    "employee.performance.external.metric.definition.server.too.busy"?: string;
    "wem.learning.server.too.busy"?:                                    string;
}

export interface Tentacled504 {
    description:          RequestTimeoutEnum;
    schema:               ItemsClass;
    "x-inin-error-codes": XIninErrorCodes3;
}

export interface XIninErrorCodes3 {
    "authentication.request.timeout":   AuthenticationRequestTimeout;
    "request.timeout":                  RequestTimeoutEnum;
    "email.error.integration.timeout"?: string;
}

export interface PatchSecurity {
    "PureCloud OAuth"?: string[];
    "Guest Chat JWT"?:  any[];
}

export interface Post {
    tags:                           string[];
    summary:                        string;
    description:                    string;
    operationId:                    string;
    produces:                       ProduceElement[];
    parameters:                     PostParameter[];
    responses:                      PostResponses;
    security?:                      PostSecurity[];
    "x-inin-requires-permissions"?: XIninRequiresPermissions;
    "x-purecloud-method-name":      string;
    "x-genesys-visibility"?:        XGenesysVisibility;
    "x-genesys-preview"?:           boolean;
    consumes?:                      PostConsume[];
    deprecated?:                    boolean;
}

export enum PostConsume {
    ApplicationJSON = "application/json",
    ApplicationScimJSON = "application/scim+json",
    MultipartFormData = "multipart/form-data",
}

export interface PostParameter {
    in:                In;
    name:              string;
    description?:      string;
    required:          boolean;
    schema?:           ResponseSchema;
    type?:             ItemsType;
    items?:            FluffyItems;
    collectionFormat?: CollectionFormat;
    format?:           Format;
    enum?:             string[];
    default?:          boolean | number | string;
    "x-example"?:      string;
}

export interface FluffyItems {
    type: ItemsType;
    enum: string[];
}

export interface ResponseSchema {
    $ref?:                 string;
    type?:                 ItemsType;
    items?:                AdditionalProperties;
    format?:               Format;
    additionalProperties?: AdditionalPropertiesClass;
    enum?:                 string[];
}

export interface PostResponses {
    "200"?:   Fluffy200;
    "400":    Fluffy400;
    "401":    The401;
    "403":    The403;
    "404":    Purple404;
    "408":    Tentacled408;
    "413":    Fluffy413;
    "415":    The415;
    "429":    The429;
    "500":    The500_Class;
    "503":    The500_Class;
    "504":    Sticky504;
    "409"?:   Sticky409;
    "201"?:   The201_Class;
    "202"?:   The202_Class;
    "204"?:   The204;
    default?: The204;
    "422"?:   Tentacled422;
    "423"?:   The423;
    "501"?:   Fluffy501;
    "405"?:   Purple405;
    "412"?:   Fluffy412;
    "410"?:   The410;
    "502"?:   Fluffy502;
}

export interface Fluffy200 {
    description: string;
    schema?:     ResponseSchema;
}

export interface Fluffy400 {
    description:          string;
    schema?:              ItemsClass;
    "x-inin-error-codes": { [key: string]: string };
}

export interface Tentacled408 {
    description:          string;
    schema:               ItemsClass;
    "x-inin-error-codes": XIninErrorCodes4;
}

export interface XIninErrorCodes4 {
    "client.timeout":              string;
    unknown?:                      string;
    "wfm.deprecated.api.timeout"?: string;
}

export interface Sticky409 {
    description:           string;
    schema?:               ItemsClass;
    "x-inin-error-codes"?: { [key: string]: string };
}

export interface Fluffy412 {
    description:          string;
    schema:               ItemsClass;
    "x-inin-error-codes": XIninErrorCodes5;
}

export interface XIninErrorCodes5 {
    "rms.precondition": string;
}

export interface Fluffy413 {
    description:          RequestEntityTooLargeEnum;
    schema?:              ItemsClass;
    "x-inin-error-codes": XIninErrorCodes6;
}

export interface XIninErrorCodes6 {
    "request.entity.too.large":        RequestEntityTooLargeEnum;
    "payload.too.large"?:              string;
    "request.payload.size.too.large"?: string;
    "trace.size.too.large"?:           string;
}

export interface The423 {
    description:           string;
    "x-inin-error-codes"?: The423_XIninErrorCodes;
}

export interface The423_XIninErrorCodes {
    locked: string;
}

export interface Fluffy501 {
    description:          The501_Description;
    schema:               ItemsClass;
    "x-inin-error-codes": XIninErrorCodes7;
}

export interface XIninErrorCodes7 {
    "not.implemented"?:                             string;
    "wem.learning.type.not.implemented.exception"?: string;
}

export interface Fluffy502 {
    description:          string;
    schema:               ItemsClass;
    "x-inin-error-codes": XIninErrorCodes8;
}

export interface XIninErrorCodes8 {
    "wfm.server.error": string;
}

export interface Sticky504 {
    description:          RequestTimeoutEnum;
    schema:               ItemsClass;
    "x-inin-error-codes": XIninErrorCodes9;
}

export interface XIninErrorCodes9 {
    "authentication.request.timeout":   AuthenticationRequestTimeout;
    "request.timeout":                  RequestTimeoutEnum;
    "postino.error.request.timeout"?:   string;
    "chat.error.service.timeout"?:      string;
    "email.error.integration.timeout"?: string;
}

export interface PostSecurity {
    "PureCloud OAuth"?:      string[];
    "Screen Recording JWT"?: any[];
    "Guest Chat JWT"?:       any[];
}

export interface Put {
    tags:                           string[];
    summary:                        string;
    description:                    string;
    operationId:                    string;
    produces:                       ProduceElement[];
    parameters:                     PutParameter[];
    responses:                      { [key: string]: PutResponse };
    security?:                      HeadSecurity[];
    "x-inin-requires-permissions"?: XIninRequiresPermissions;
    "x-purecloud-method-name":      string;
    "x-genesys-visibility"?:        XGenesysVisibility;
    deprecated?:                    boolean;
    "x-genesys-preview"?:           boolean;
    consumes?:                      ProduceElement[];
}

export interface PutParameter {
    name:              string;
    in:                In;
    description?:      string;
    required:          boolean;
    type?:             ItemsType;
    schema?:           ResponseSchema;
    items?:            FluffyItems;
    collectionFormat?: CollectionFormat;
    enum?:             string[];
    default?:          boolean | string;
}

export interface PutResponse {
    description?:          string;
    schema?:               ResponseSchema;
    "x-inin-error-codes"?: { [key: string]: string };
}

export interface SecurityDefinitions {
    "PureCloud OAuth": PureCloudOAuth;
    "Guest Chat JWT":  GuestChatJWT;
}

export interface GuestChatJWT {
    type: string;
    name: string;
    in:   In;
}

export interface PureCloudOAuth {
    type:             string;
    authorizationUrl: string;
    flow:             string;
    scopes:           Scopes;
}

export interface Scopes {
    all: string;
}

export interface Tag {
    name:          string;
    description:   string;
    externalDocs?: ExternalDocs;
}
