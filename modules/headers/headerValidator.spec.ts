import * as fc from 'fast-check';
import { 
    isValidHeaderName, 
    isValidHeaderValue, 
    validateHeaders, 
    validateHeadersOrThrow
} from './headerValidator.js';
import { HeaderValidationError } from './headerTypes.js';
import { HeaderMap } from './headerTypes.js';

describe('Header Validation', () => {
    /**
     * **Feature: per-request-headers, Property 4: Consistent validation and error handling**
     * **Validates: Requirements 4.3, 4.4, 5.1, 5.2**
     * 
     * Property: For any API method and any invalid headers, the validation and error handling 
     * behavior should be identical across all API methods
     */
    describe('Property 4: Consistent validation and error handling', () => {
        it('should consistently validate header names according to RFC 7230', () => {
            fc.assert(fc.property(
                fc.string(),
                (headerName) => {
                    const result = isValidHeaderName(headerName);
                    
                    // Valid header names must be non-empty tokens
                    if (headerName === '' || typeof headerName !== 'string') {
                        expect(result).toBe(false);
                        return;
                    }
                    
                    // Check if contains only valid token characters
                    const hasValidChars = /^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/.test(headerName);
                    expect(result).toBe(hasValidChars);
                }
            ), { numRuns: 100 });
        });

        it('should consistently validate header values according to RFC 7230', () => {
            fc.assert(fc.property(
                fc.oneof(
                    fc.string(),
                    fc.constant(null),
                    fc.constant(undefined),
                    fc.integer(),
                    fc.boolean()
                ),
                (headerValue) => {
                    const result = isValidHeaderValue(headerValue);
                    
                    // Non-string values should be invalid
                    if (typeof headerValue !== 'string' || headerValue === null || headerValue === undefined) {
                        expect(result).toBe(false);
                        return;
                    }
                    
                    // Check each character in the string
                    let expectedValid = true;
                    for (let i = 0; i < headerValue.length; i++) {
                        const charCode = headerValue.charCodeAt(i);
                        
                        // Valid characters: VCHAR (0x21-0x7E), SP (0x20), HTAB (0x09), obs-text (0x80-0xFF)
                        const isValidChar = (
                            (charCode >= 0x21 && charCode <= 0x7E) || // VCHAR
                            charCode === 0x20 || // SP
                            charCode === 0x09 || // HTAB
                            (charCode >= 0x80 && charCode <= 0xFF) // obs-text
                        );
                        
                        if (!isValidChar) {
                            expectedValid = false;
                            break;
                        }
                    }
                    
                    expect(result).toBe(expectedValid);
                }
            ), { numRuns: 100 });
        });

        it('should consistently validate complete header maps', () => {
            fc.assert(fc.property(
                fc.dictionary(
                    fc.string(),
                    fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined))
                ),
                (headers) => {
                    const result = validateHeaders(headers);
                    
                    // Check if any header names or values are invalid
                    let shouldHaveError = false;
                    const expectedInvalidHeaders: string[] = [];
                    const expectedFailures: string[] = [];
                    
                    for (const [name, value] of Object.entries(headers)) {
                        if (!isValidHeaderName(name)) {
                            shouldHaveError = true;
                            expectedInvalidHeaders.push(name);
                            expectedFailures.push(`Invalid header name: "${name}" - must be a valid HTTP token`);
                        }
                        
                        if (!isValidHeaderValue(value)) {
                            shouldHaveError = true;
                            expectedInvalidHeaders.push(name);
                            expectedFailures.push(`Invalid header value for "${name}": "${value}" - contains invalid characters`);
                        }
                    }
                    
                    if (shouldHaveError) {
                        expect(result).toBeInstanceOf(HeaderValidationError);
                        expect(result?.invalidHeaders.length).toBeGreaterThan(0);
                        expect(result?.validationFailures.length).toBeGreaterThan(0);
                    } else {
                        expect(result).toBeNull();
                    }
                }
            ), { numRuns: 100 });
        });

        it('should throw consistent errors when validateHeadersOrThrow is called', () => {
            fc.assert(fc.property(
                fc.dictionary(
                    fc.string(),
                    fc.string()
                ),
                (headers) => {
                    const validationResult = validateHeaders(headers);
                    
                    if (validationResult === null) {
                        // Should not throw for valid headers
                        expect(() => validateHeadersOrThrow(headers)).not.toThrow();
                    } else {
                        // Should throw the same error as validateHeaders returned
                        expect(() => validateHeadersOrThrow(headers)).toThrow(HeaderValidationError);
                        
                        try {
                            validateHeadersOrThrow(headers);
                        } catch (error) {
                            expect(error).toBeInstanceOf(HeaderValidationError);
                            const thrownError = error as HeaderValidationError;
                            expect(thrownError.invalidHeaders).toEqual(validationResult.invalidHeaders);
                            expect(thrownError.validationFailures).toEqual(validationResult.validationFailures);
                        }
                    }
                }
            ), { numRuns: 100 });
        });
    });

    // Unit tests for specific examples
    describe('Unit tests for header validation', () => {
        describe('isValidHeaderName', () => {
            it('should accept valid header names', () => {
                expect(isValidHeaderName('Content-Type')).toBe(true);
                expect(isValidHeaderName('X-Custom-Header')).toBe(true);
                expect(isValidHeaderName('Authorization')).toBe(true);
                expect(isValidHeaderName('accept')).toBe(true);
                expect(isValidHeaderName('user-agent')).toBe(true);
            });

            it('should reject invalid header names', () => {
                expect(isValidHeaderName('')).toBe(false);
                expect(isValidHeaderName('Content Type')).toBe(false); // space
                expect(isValidHeaderName('Content(Type)')).toBe(false); // parentheses
                expect(isValidHeaderName('Content<Type>')).toBe(false); // angle brackets
                expect(isValidHeaderName('Content@Type')).toBe(false); // at symbol
                expect(isValidHeaderName('Content,Type')).toBe(false); // comma
                expect(isValidHeaderName('Content;Type')).toBe(false); // semicolon
                expect(isValidHeaderName('Content:Type')).toBe(false); // colon
                expect(isValidHeaderName('Content"Type')).toBe(false); // quote
                expect(isValidHeaderName('Content/Type')).toBe(false); // slash
                expect(isValidHeaderName('Content[Type]')).toBe(false); // brackets
                expect(isValidHeaderName('Content?Type')).toBe(false); // question mark
                expect(isValidHeaderName('Content=Type')).toBe(false); // equals
                expect(isValidHeaderName('Content{Type}')).toBe(false); // braces
            });
        });

        describe('isValidHeaderValue', () => {
            it('should accept valid header values', () => {
                expect(isValidHeaderValue('application/json')).toBe(true);
                expect(isValidHeaderValue('Bearer token123')).toBe(true);
                expect(isValidHeaderValue('text/html; charset=utf-8')).toBe(true);
                expect(isValidHeaderValue('')).toBe(true); // empty string is valid
                expect(isValidHeaderValue('value with spaces')).toBe(true);
                expect(isValidHeaderValue('value\twith\ttabs')).toBe(true);
            });

            it('should reject invalid header values', () => {
                expect(isValidHeaderValue(null as any)).toBe(false);
                expect(isValidHeaderValue(undefined as any)).toBe(false);
                expect(isValidHeaderValue(123 as any)).toBe(false);
                expect(isValidHeaderValue('value\nwith\nnewline')).toBe(false); // newline
                expect(isValidHeaderValue('value\rwith\rcarriage')).toBe(false); // carriage return
                expect(isValidHeaderValue('value\x00with\x00null')).toBe(false); // null character
                expect(isValidHeaderValue('value\x01with\x01control')).toBe(false); // control character
            });
        });
    });
});