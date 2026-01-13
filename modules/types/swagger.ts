export interface Swagger {
    swagger: string;
    info: Info;
    host: string;
    tags: Tag[];
    schemes: string[];
    consumes: ProduceElement[];
    produces: ProduceElement[];
    paths: { [key: string]: Path };
    securityDefinitions: SecurityDefinitions;
    definitions: { [key: string]: Definition };
    responses: { [key: string]: RestHttpResponse };
    externalDocs: ExternalDocs;
}

export enum ProduceElement {
    ApplicationJSON = "application/json",
    ApplicationScimJSON = "application/scim+json",
    TextCalendar = "text/calendar",
    TextPlain = "text/plain",
}

export interface Definition {
    type: ItemsType;
    properties?: { [key: string]: Property };
    required?: string[];
    description?: string;
}

export interface ChangeItem {
    parent: string;
    impact: string;
    key: string;
    location: string;
    oldValue: any;
    newValue: any;
    description: string;
}

// Assuming 'changes' is an object with string keys and arrays of ChangeItem
export interface Changes {
    [id: string]: {
        [impact: string]: ChangeItem[];
    };
}

export interface Property {
    type?: ItemsType;
    description?: string;
    items?: PropertyItems;
    readOnly?: boolean;
    $ref?: string;
    format?: Format;
    enum?: Array<number | string>;
    additionalProperties?: PropertyAdditionalProperties;
    example?: number | string;
    uniqueItems?: boolean;
    position?: number;
    maxItems?: number;
    minItems?: number;
    "x-genesys-entity-type"?: XGenesysEntityType;
    minLength?: number;
    maxLength?: number;
    allowEmptyValue?: boolean;
    minimum?: number;
    maximum?: number;
    "x-genesys-search-fields"?: XGenesysSearchFields;
    allOf?: AllOf[];
    properties?: PropertyProperties;
}

export interface AllOf {
    $ref: string;
}

export interface PropertyProperties {
    metadata?: Metadata;
    messageId?: MessageID;
}

export interface MessageID {
    type: Type;
}

export interface Metadata {
    properties: MetadataProperties;
    required: string[];
    type: Type;
}

export interface MetadataProperties {
    customAttributes: CustomAttributes;
}

export interface CustomAttributes {
    properties: Paths;
    additionalProperties: MessageID;
    type: Type;
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

export interface AdditionalPropertiesAdditionalProperties {
    type: ItemsType;
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
    Any = "any",
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
    YearMonth = "year-month",
    URI = "uri",
    URL = "url",
}

export interface SchemaClass {
    type?: ItemsType;
    $ref?: string;
    enum?: string[];
}

export interface PropertyItems {
    $ref?: string;
    type?: ItemsType;
    enum?: string[];
    additionalProperties?: PropertyItems;
    format?: Format;
    description?: string;
    items?: PropertyItems;
    uniqueItems?: boolean;
}

export interface PropertyAdditionalProperties {
    type?: ItemsType;
    items?: PropertyItems;
    format?: Format;
    $ref?: string;
    uniqueItems?: boolean;
    enum?: string[];
    additionalProperties?: PropertyAdditionalProperties;
    default?: string;
}


export interface AdditionalProperties {
    type?: ItemsType;
    $ref?: string;
}

export interface XGenesysEntityType {
    value: string;
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
    url: string;
}

export interface Info {
    description: string;
    version: string;
    title: string;
    termsOfService?: string;
    contact: Contact;
    license?: License;
    swagger?: string;
    host?: string;
}

export interface Contact {
    name: string;
    url: string;
    email: string;
}

export interface License {
    name: string;
    url: string;
}

export interface Path {
    post?: Post;
    get?: Get;
    put?: Put;
    delete?: Delete;
    head?: Head;
    patch?: Patch;
}

export type Parameter = DeleteParameter | GetParameter | PostParameter | PutParameter | PatchParameter | HeadParameter;



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
    type: ItemsType;
    items?: ItemsClass;
}

export interface ItemsClass {
    $ref?: string;
}

export type RestResponse = RestHttpResponse;

export type TypeResponse = RestResponse | RestResponse["schema"]



export interface RestHttpResponse {
    description?: string;
    schema?: any;
    "x-inin-error-codes"?: { [key: string]: string };
}

export enum BadCredentials {
    InvalidLoginCredentials = "Invalid login credentials.",
}

export enum RequestTimeoutEnum {
    TheRequestTimedOut = "The request timed out.",
}


export interface DeleteSecurity {
    "PureCloud OAuth"?: string[];
    "Guest Chat JWT"?: any[];
    "Webmessaging JWT"?: any[];
}

export enum XGenesysVisibility {
    Internal = "internal",
    Unstable = "unstable",
}

export interface XIninRequiresPermissions {
    type: string;
    permissions: string[];
}

export enum XIninRequiresPermissionsType {
    All = "ALL",
    Any = "ANY",
}

export interface GetParameter {
    name: string;
    in: In;
    description?: string;
    required?: boolean;
    type: ItemsType;
    default?: boolean | number | string;
    schema?: any;
    enum?: string[];
    format?: Format;
    items?: PropertyAdditionalProperties;
    collectionFormat?: CollectionFormat;
    "x-example"?: string;
}

export interface DeleteParameter {
    name: string;
    in: In;
    description?: string;
    required?: boolean;
    type?: ItemsType;
    default?: boolean | number | string;
    schema?: any;
    enum?: string[];
    items?: PropertyAdditionalProperties;
    collectionFormat?: CollectionFormat;
    "x-example"?: string;
    format?: Format;
}

export interface PutParameter {
    name: string;
    in: In;
    description?: string;
    required?: boolean;
    type?: ItemsType;
    schema?: any;
    items?: FluffyItems;
    collectionFormat?: CollectionFormat;
    enum?: string[];
    default?: boolean | number | string;
    "x-example"?: string;
    format?: Format;
}

export interface HeadParameter {
    name: string;
    in: In;
    description?: string;
    required?: boolean;
    type?: ItemsType;
    schema?: any;
    items?: FluffyItems;
    collectionFormat?: CollectionFormat;
    enum?: string[];
    default?: boolean | number | string;
    "x-example"?: string;
    format?: Format;
}

export interface PatchParameter {
    in: In;
    name: string;
    description?: string;
    required: boolean;
    schema?: any;
    type?: ItemsType;
    enum?: string[];
    default?: boolean | number | string;
    format?: Format;
    items?: PropertyAdditionalProperties;
    collectionFormat?: CollectionFormat;
    "x-example"?: string;
}

export interface PostParameter {
    in: In;
    name: string;
    description?: string;
    required: boolean;
    schema?: any;
    type?: ItemsType;
    items?: PropertyAdditionalProperties;
    collectionFormat?: CollectionFormat;
    format?: Format;
    enum?: string[];
    default?: boolean | number | string;
    "x-example"?: string;
}

export type HttpMethod = Post | Get | Put | Delete | Head | Patch;

export type valueTypes = ItemsType | string | boolean | number | object | File

export interface Head {
    tags: string[];
    summary: string;
    description: string;
    operationId: string;
    produces: ProduceElement[];
    parameters: HeadParameter[];
    responses: { [key: string]: RestHttpResponse };
    security?: Security[];
    "x-purecloud-method-name": string;
    "x-inin-requires-permissions"?: XIninRequiresPermissions;
    "x-genesys-visibility"?: XGenesysVisibility;
    deprecated?: boolean;
    consumes?: ProduceElement[];
    "x-genesys-preview"?: boolean;
}

export interface Patch {
    tags: string[];
    summary: string;
    description: string;
    operationId: string;
    produces: ProduceElement[];
    parameters: PatchParameter[];
    responses: { [key: string]: RestHttpResponse };
    security?: Security[];
    "x-genesys-visibility"?: XGenesysVisibility;
    "x-inin-requires-permissions"?: XIninRequiresPermissions;
    "x-purecloud-method-name": string;
    deprecated?: boolean;
    consumes?: ProduceElement[];
    "x-genesys-preview"?: boolean;
}

export interface Put {
    tags: string[];
    summary: string;
    description: string;
    operationId: string;
    produces: ProduceElement[];
    parameters: PutParameter[];
    responses: { [key: string]: RestHttpResponse };
    security?: Security[];
    "x-inin-requires-permissions"?: XIninRequiresPermissions;
    "x-purecloud-method-name": string;
    "x-genesys-visibility"?: XGenesysVisibility;
    deprecated?: boolean;
    "x-genesys-preview"?: boolean;
    consumes?: ProduceElement[];
}

export interface Delete {
    tags: string[];
    summary: string;
    description: string;
    operationId: string;
    produces: ProduceElement[];
    parameters: DeleteParameter[];
    responses: { [key: string]: RestHttpResponse };
    security?: Security[];
    "x-inin-requires-permissions"?: XIninRequiresPermissions;
    "x-purecloud-method-name": string;
    "x-genesys-visibility"?: XGenesysVisibility;
    deprecated?: boolean;
    "x-genesys-preview"?: boolean;
    consumes?: ProduceElement[];
}

export interface Post {
    tags: string[];
    summary: string;
    description: string;
    operationId: string;
    produces: ProduceElement[];
    parameters: PostParameter[];
    responses: { [key: string]: RestHttpResponse };
    security?: Security[];
    "x-inin-requires-permissions"?: XIninRequiresPermissions;
    "x-purecloud-method-name": string;
    "x-genesys-visibility"?: XGenesysVisibility;
    "x-genesys-preview"?: boolean;
    consumes?: PostConsume[];
    deprecated?: boolean;
}

export interface Get {
    tags: string[];
    summary: string;
    description: string;
    operationId: string;
    produces: ProduceElement[];
    parameters: GetParameter[];
    responses: { [key: string]: RestHttpResponse };
    security?: Security[];
    "x-purecloud-method-name": string;
    "x-genesys-visibility"?: XGenesysVisibility;
    "x-inin-requires-permissions"?: XIninRequiresPermissions;
    "x-genesys-preview"?: boolean;
    deprecated?: boolean;
    consumes?: ProduceElement[];
}



export enum PostConsume {
    ApplicationJSON = "application/json",
    ApplicationScimJSON = "application/scim+json",
    MultipartFormData = "multipart/form-data",
    TextCalendar = "text/calendar",
    TextPlain = "text/plain",
}



export interface FluffyItems {
    type: ItemsType;
    enum: string[];
}

export interface ResponseSchema {
    $ref?: string;
    type?: ItemsType;
    items?: PropertyAdditionalProperties;
    format?: Format;
    additionalProperties?: PropertyAdditionalProperties;
    enum?: string[];
}

export interface Security {
    [key: string]: string[] | any[];
}

export interface RestHttpResponse {
    description?: string;
    schema?: any;
    "x-inin-error-codes"?: { [key: string]: string };
}

export interface SecurityDefinitions {
    [key: string]: any;
}

export interface GuestChatJWT {
    type: string;
    name: string;
    in: In;
}

export interface PureCloudOAuth {
    type: string;
    authorizationUrl: string;
    flow: string;
    scopes: Scopes;
}

export interface Scopes {
    all: string;
}

export interface Tag {
    name: string;
    description: string;
    externalDocs?: ExternalDocs;
}
