import { HeaderMap, MergedHeaders, HeaderMergeError } from './headerTypes.js';
import { validateHeaders } from './headerValidator.js';

/**
 * Merges default headers with per-request headers
 * Per-request headers take precedence over default headers for the same key
 * Returns immutable merged headers without modifying original objects
 */
export function mergeHeaders(
    defaultHeaders: HeaderMap | null | undefined,
    perRequestHeaders: HeaderMap | null | undefined
): MergedHeaders {
    // Handle null/undefined inputs
    const safeDefaultHeaders: HeaderMap = defaultHeaders || {};
    const safePerRequestHeaders: HeaderMap = perRequestHeaders || {};

    // Validate both header maps
    const defaultValidationError = validateHeaders(safeDefaultHeaders);
    if (defaultValidationError) {
        throw new HeaderMergeError(
            defaultValidationError.invalidHeaders,
            [`Default headers validation failed: ${defaultValidationError.message}`]
        );
    }

    const perRequestValidationError = validateHeaders(safePerRequestHeaders);
    if (perRequestValidationError) {
        throw new HeaderMergeError(
            perRequestValidationError.invalidHeaders,
            [`Per-request headers validation failed: ${perRequestValidationError.message}`]
        );
    }

    // Create immutable copies to ensure original objects are not modified
    const defaultHeadersCopy: HeaderMap = { ...safeDefaultHeaders };
    const perRequestHeadersCopy: HeaderMap = { ...safePerRequestHeaders };

    // Merge headers with per-request headers taking precedence
    const finalHeaders: HeaderMap = {
        ...defaultHeadersCopy,
        ...perRequestHeadersCopy
    };

    return {
        defaultHeaders: defaultHeadersCopy,
        perRequestHeaders: perRequestHeadersCopy,
        finalHeaders
    };
}

/**
 * Convenience function that returns only the final merged headers
 */
export function getFinalHeaders(
    defaultHeaders: HeaderMap | null | undefined,
    perRequestHeaders: HeaderMap | null | undefined
): HeaderMap {
    const merged = mergeHeaders(defaultHeaders, perRequestHeaders);
    return merged.finalHeaders;
}

/**
 * Checks if two header maps are equivalent (case-insensitive header name comparison)
 * Note: HTTP header names are case-insensitive according to RFC 7230
 */
export function areHeadersEquivalent(headers1: HeaderMap, headers2: HeaderMap): boolean {
    const normalizeHeaders = (headers: HeaderMap): HeaderMap => {
        const normalized: HeaderMap = {};
        for (const [key, value] of Object.entries(headers)) {
            normalized[key.toLowerCase()] = value;
        }
        return normalized;
    };

    const normalized1 = normalizeHeaders(headers1);
    const normalized2 = normalizeHeaders(headers2);

    const keys1 = Object.keys(normalized1);
    const keys2 = Object.keys(normalized2);

    if (keys1.length !== keys2.length) {
        return false;
    }

    for (const key of keys1) {
        if (normalized1[key] !== normalized2[key]) {
            return false;
        }
    }

    return true;
}