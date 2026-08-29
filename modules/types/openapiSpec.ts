import { ChangeItem, Changes } from '../types/builderTypes.js';

// OpenApi v3 Specification

export interface OpenApiSpec {
    openapi: string;
    info: OpenApiInfo;
    tags: Tag[];
    servers: Server[];
    externalDocs: ExternalDocs;
    paths: { [key: string]: Path };
    components: Components;
}

export interface OpenApiInfo {
    description: string;
    version: string;
    title: string;
    termsOfService?: string;
    contact: Contact;
    license?: License;
    apiVersion?: string;
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

export interface Tag {
    name: string;
    description: string;
    externalDocs?: ExternalDocs;
}

export interface ExternalDocs {
    description: string;
    url: string;
}

export interface Server {
    url: string;
    description: string;
}

export interface Components {
    schemas: { [key: string]: Definition };
    securitySchemes: SecurityDefinitions;
}

export interface SecurityDefinitions {
    [key: string]: any;
}

export enum ItemsType {
    Array = "array",
    Boolean = "boolean",
    Integer = "integer",
    Number = "number",
    Object = "object",
    Ref = "ref",
    String = "string",
    Any = "any",
}

export type valueTypes = ItemsType | string | boolean | number | object;

export enum Format {
    Date = "date",
    DateTime = "date-time",
    Double = "double",
    Float = "float",
    Int32 = "int32",
    Int64 = "int64",
    Interval = "interval",
    LocalDate = "local-date",
    LocalDateTime = "local-date-time",
    YearMonth = "year-month",
    URI = "uri",
    URL = "url",
}

export interface Definition {
    type: ItemsType;
    properties?: { [key: string]: Property };
    additionalProperties?: Property;
    required?: string[];
    description?: string;
    discriminator?: {
        propertyName: string
    };
    allOf?: Property[];
    anyOf?: Property[];
    oneOf?: Property[];
    "x-discriminator-value"?: string;
    "x-genesys-polymorphism-type"?: string;
    "x-genesys-polymorphism-property"?: string;
    "x-genesys-polymorphism-values"?: string[];
    "x-genesys-polymorphism-children"?: string[];
    "x-genesys-polymorphism-children-mapping"?: { [key: string]: string };
    "x-genesys-polymorphism-parent"?: string;
    "x-genesys-one-of"?: string[];
}

export interface Property {
    type?: ItemsType;
    description?: string;
    items?: Property;
    readOnly?: boolean;
    $ref?: string;
    format?: Format;
    enum?: Array<number | string>;
    additionalProperties?: Property;
    example?: number | string;
    uniqueItems?: boolean;
    position?: number;
    maxItems?: number;
    minItems?: number;
    minLength?: number;
    maxLength?: number;
    allowEmptyValue?: boolean;
    minimum?: number;
    maximum?: number;
    allOf?: Property[];
    anyOf?: Property[];
    oneOf?: Property[];
    properties?: { [key: string]: Property };
    "x-genesys-enum-members"?: GenesysEnumMember[]
}

export interface GenesysEnumMember {
    name: string;
}

export interface Path extends Record<string, Operation | undefined> {
    post?: Operation;
    get?: Operation;
    put?: Operation;
    delete?: Operation;
    head?: Operation;
    patch?: Operation;
}

export interface Security {
    [key: string]: string[] | any[];
}

export interface Operation {
    tags: string[];
    summary: string;
    description: string;
    operationId: string;
    parameters?: Parameter[];
    requestBody?: RestHttpRequestBody;
    responses: { [key: string]: RestHttpResponse };
    security?: Security[];
    deprecated?: boolean;
    "x-genesys-preview"?: boolean;
}

export type HttpMethod = Operation;

export interface RestHttpResponse {
    description?: string;
    content?: Record<ProduceElement, any>;
    "x-genesys-error-codes"?: { [key: string]: string };
}

export type RestResponse = RestHttpResponse;

export interface RestHttpRequestBody {
    description?: string;
    content?: Record<ConsumeElement, any>;
    required?: boolean;
}

export enum ProduceElement {
    ApplicationJSON = "application/json",
    ApplicationScimJSON = "application/scim+json",
    TextCalendar = "text/calendar",
    TextPlain = "text/plain",
}

export enum ConsumeElement {
    ApplicationJSON = "application/json",
    ApplicationScimJSON = "application/scim+json",
    TextCalendar = "text/calendar",
    TextPlain = "text/plain",
}

export enum In {
    Body = "body",
    FormData = "formData",
    Header = "header",
    Path = "path",
    Query = "query",
}

export interface Parameter {
    in: In;
    name: string;
    description?: string;
    required?: boolean;
    schema: Property;
    style?: string;
    explode?: boolean;
}
