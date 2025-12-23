import * as fc from 'fast-check';
import { 
    mergeHeaders, 
    getFinalHeaders, 
    areHeadersEquivalent 
} from './headerMerger.js';
import { HeaderMap } from './headerTypes.js';

describe('Header Merging', () => {
    /**
     * **Feature: per-request-headers, Property 2: Header merging precedence**
     * **Validates: Requirements 1.2, 1.3, 4.2**
     * 
     * Property: For any combination of default headers and per-request headers, when both contain 
     * the same header key, the per-request header value should override the default header value 
     * in the final merged headers
     */
    describe('Property 2: Header merging precedence', () => {
        it('should ensure per-request headers override default headers for same keys', () => {
            fc.assert(fc.property(
                // Generate valid header names (RFC 7230 tokens)
                fc.dictionary(
                    fc.stringMatching(/^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/),
                    fc.string().filter(s => {
                        // Valid header values: no control characters except tab
                        for (let i = 0; i < s.length; i++) {
                            const charCode = s.charCodeAt(i);
                            if (!(
                                (charCode >= 0x21 && charCode <= 0x7E) || // VCHAR
                                charCode === 0x20 || // SP
                                charCode === 0x09 || // HTAB
                                (charCode >= 0x80 && charCode <= 0xFF) // obs-text
                            )) {
                                return false;
                            }
                        }
                        return true;
                    })
                ),
                fc.dictionary(
                    fc.stringMatching(/^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/),
                    fc.string().filter(s => {
                        // Valid header values: no control characters except tab
                        for (let i = 0; i < s.length; i++) {
                            const charCode = s.charCodeAt(i);
                            if (!(
                                (charCode >= 0x21 && charCode <= 0x7E) || // VCHAR
                                charCode === 0x20 || // SP
                                charCode === 0x09 || // HTAB
                                (charCode >= 0x80 && charCode <= 0xFF) // obs-text
                            )) {
                                return false;
                            }
                        }
                        return true;
                    })
                ),
                (defaultHeaders, perRequestHeaders) => {
                    const merged = mergeHeaders(defaultHeaders, perRequestHeaders);
                    
                    // Check that all per-request headers are present in final headers
                    for (const [key, value] of Object.entries(perRequestHeaders)) {
                        expect(merged.finalHeaders[key]).toBe(value);
                    }
                    
                    // Check that default headers are present unless overridden
                    for (const [key, value] of Object.entries(defaultHeaders)) {
                        if (perRequestHeaders.hasOwnProperty(key)) {
                            // Should be overridden by per-request value
                            expect(merged.finalHeaders[key]).toBe(perRequestHeaders[key]);
                        } else {
                            // Should retain default value
                            expect(merged.finalHeaders[key]).toBe(value);
                        }
                    }
                    
                    // Verify immutability - original objects should not be modified
                    const originalDefaultKeys = Object.keys(defaultHeaders);
                    const originalPerRequestKeys = Object.keys(perRequestHeaders);
                    
                    expect(Object.keys(defaultHeaders)).toEqual(originalDefaultKeys);
                    expect(Object.keys(perRequestHeaders)).toEqual(originalPerRequestKeys);
                }
            ), { numRuns: 100 });
        });

        it('should handle null and undefined inputs correctly', () => {
            fc.assert(fc.property(
                fc.oneof(
                    fc.dictionary(
                        fc.stringMatching(/^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/),
                        fc.string().filter(s => s.length === 0 || /^[\x20\x09\x21-\x7E\x80-\xFF]*$/.test(s))
                    ),
                    fc.constant(null),
                    fc.constant(undefined)
                ),
                fc.oneof(
                    fc.dictionary(
                        fc.stringMatching(/^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/),
                        fc.string().filter(s => s.length === 0 || /^[\x20\x09\x21-\x7E\x80-\xFF]*$/.test(s))
                    ),
                    fc.constant(null),
                    fc.constant(undefined)
                ),
                (defaultHeaders, perRequestHeaders) => {
                    const merged = mergeHeaders(defaultHeaders, perRequestHeaders);
                    
                    const safeDefault = defaultHeaders || {};
                    const safePerRequest = perRequestHeaders || {};
                    
                    // Final headers should contain all headers from both sources
                    const expectedFinal = { ...safeDefault, ...safePerRequest };
                    
                    expect(merged.finalHeaders).toEqual(expectedFinal);
                    expect(merged.defaultHeaders).toEqual(safeDefault);
                    expect(merged.perRequestHeaders).toEqual(safePerRequest);
                }
            ), { numRuns: 100 });
        });
    });

    /**
     * **Feature: per-request-headers, Property 6: Default headers preservation**
     * **Validates: Requirements 1.4**
     * 
     * Property: For any API method call without per-request headers, only the default headers 
     * should be included in the HTTP request
     */
    describe('Property 6: Default headers preservation', () => {
        it('should preserve default headers when no per-request headers are provided', () => {
            fc.assert(fc.property(
                fc.dictionary(
                    fc.stringMatching(/^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/),
                    fc.string().filter(s => s.length === 0 || /^[\x20\x09\x21-\x7E\x80-\xFF]*$/.test(s))
                ),
                (defaultHeaders) => {
                    // Test with null per-request headers
                    const mergedWithNull = mergeHeaders(defaultHeaders, null);
                    expect(mergedWithNull.finalHeaders).toEqual(defaultHeaders);
                    expect(mergedWithNull.defaultHeaders).toEqual(defaultHeaders);
                    expect(mergedWithNull.perRequestHeaders).toEqual({});
                    
                    // Test with undefined per-request headers
                    const mergedWithUndefined = mergeHeaders(defaultHeaders, undefined);
                    expect(mergedWithUndefined.finalHeaders).toEqual(defaultHeaders);
                    expect(mergedWithUndefined.defaultHeaders).toEqual(defaultHeaders);
                    expect(mergedWithUndefined.perRequestHeaders).toEqual({});
                    
                    // Test with empty per-request headers
                    const mergedWithEmpty = mergeHeaders(defaultHeaders, {});
                    expect(mergedWithEmpty.finalHeaders).toEqual(defaultHeaders);
                    expect(mergedWithEmpty.defaultHeaders).toEqual(defaultHeaders);
                    expect(mergedWithEmpty.perRequestHeaders).toEqual({});
                }
            ), { numRuns: 100 });
        });
    });

    // Unit tests for specific examples
    describe('Unit tests for header merging', () => {
        describe('mergeHeaders', () => {
            it('should merge headers with per-request taking precedence', () => {
                const defaultHeaders = {
                    'Content-Type': 'application/json',
                    'User-Agent': 'MyApp/1.0'
                };
                
                const perRequestHeaders = {
                    'Authorization': 'Bearer token123',
                    'Content-Type': 'application/xml'
                };
                
                const merged = mergeHeaders(defaultHeaders, perRequestHeaders);
                
                expect(merged.finalHeaders).toEqual({
                    'Content-Type': 'application/xml', // overridden
                    'User-Agent': 'MyApp/1.0', // preserved
                    'Authorization': 'Bearer token123' // added
                });
            });

            it('should handle empty inputs', () => {
                const merged = mergeHeaders({}, {});
                expect(merged.finalHeaders).toEqual({});
                expect(merged.defaultHeaders).toEqual({});
                expect(merged.perRequestHeaders).toEqual({});
            });

            it('should not modify original header objects', () => {
                const defaultHeaders = { 'Content-Type': 'application/json' };
                const perRequestHeaders = { 'Authorization': 'Bearer token' };
                
                const originalDefault = { ...defaultHeaders };
                const originalPerRequest = { ...perRequestHeaders };
                
                mergeHeaders(defaultHeaders, perRequestHeaders);
                
                expect(defaultHeaders).toEqual(originalDefault);
                expect(perRequestHeaders).toEqual(originalPerRequest);
            });
        });

        describe('getFinalHeaders', () => {
            it('should return only the final merged headers', () => {
                const defaultHeaders = { 'Content-Type': 'application/json' };
                const perRequestHeaders = { 'Authorization': 'Bearer token' };
                
                const final = getFinalHeaders(defaultHeaders, perRequestHeaders);
                
                expect(final).toEqual({
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer token'
                });
            });
        });

        describe('areHeadersEquivalent', () => {
            it('should compare headers case-insensitively', () => {
                const headers1 = { 'Content-Type': 'application/json', 'Authorization': 'Bearer token' };
                const headers2 = { 'content-type': 'application/json', 'AUTHORIZATION': 'Bearer token' };
                
                expect(areHeadersEquivalent(headers1, headers2)).toBe(true);
            });

            it('should return false for different values', () => {
                const headers1 = { 'Content-Type': 'application/json' };
                const headers2 = { 'Content-Type': 'application/xml' };
                
                expect(areHeadersEquivalent(headers1, headers2)).toBe(false);
            });

            it('should return false for different number of headers', () => {
                const headers1 = { 'Content-Type': 'application/json' };
                const headers2 = { 'Content-Type': 'application/json', 'Authorization': 'Bearer token' };
                
                expect(areHeadersEquivalent(headers1, headers2)).toBe(false);
            });
        });
    });
});