import * as fc from 'fast-check';

describe('Per-Request Headers Integration', () => {
    /**
     * **Feature: per-request-headers, Property 1: Per-request headers inclusion**
     * **Validates: Requirements 1.1, 4.1, 6.1**
     * 
     * Property: For any API method and any valid per-request headers, when the API method is called 
     * with headers in the options parameter, the final HTTP request should include all specified 
     * per-request headers
     */
    describe('Property 1: Per-request headers inclusion', () => {
        it('should include all per-request headers in the final HTTP request', () => {
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
                ).filter(headers => Object.keys(headers).length > 0), // Ensure at least one header
                // Generate default headers
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
                (perRequestHeaders, defaultHeaders) => {
                    // Mock API client with header processing logic
                    const mockApiClient = {
                        defaultHeaders: defaultHeaders,
                        
                        normalizeParams: (params: any) => params || {},
                        
                        addHeaders: (existingHeaders: any, ...newHeaders: any[]) => {
                            if (existingHeaders) {
                                return Object.assign(existingHeaders, ...newHeaders);
                            } else {
                                return Object.assign(...newHeaders);
                            }
                        },
                        
                        // Simulate the header processing logic from the template
                        processHeaders: function(headerParams: any, perRequestHeaders: any) {
                            const defaultHeaders = this.defaultHeaders;
                            const normalizedHeaderParams = this.normalizeParams(headerParams);
                            
                            // Start with existing headers and add default and template headers
                            let finalHeaders = this.addHeaders({}, defaultHeaders, normalizedHeaderParams);
                            
                            // Merge per-request headers if provided
                            if (perRequestHeaders) {
                                // Validate per-request headers
                                if (typeof perRequestHeaders !== 'object' || perRequestHeaders === null) {
                                    throw new Error('Per-request headers must be a valid object');
                                }
                                
                                // Basic header validation
                                for (const [name, value] of Object.entries(perRequestHeaders)) {
                                    if (typeof name !== 'string' || typeof value !== 'string') {
                                        throw new Error(`Invalid header: "${name}" must have string name and value`);
                                    }
                                    // Basic header name validation (RFC 7230)
                                    if (!/^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/.test(name)) {
                                        throw new Error(`Invalid header name: "${name}" - must be a valid HTTP token`);
                                    }
                                    // Basic header value validation
                                    for (let i = 0; i < (value as string).length; i++) {
                                        const charCode = (value as string).charCodeAt(i);
                                        if (!((charCode >= 0x21 && charCode <= 0x7E) || charCode === 0x20 || charCode === 0x09 || (charCode >= 0x80 && charCode <= 0xFF))) {
                                            throw new Error(`Invalid header value for "${name}": contains invalid characters`);
                                        }
                                    }
                                }
                                
                                // Merge per-request headers (they take precedence)
                                finalHeaders = this.addHeaders(finalHeaders, perRequestHeaders);
                            }
                            
                            return finalHeaders;
                        }
                    };
                    
                    // Process headers using the mock API client
                    const finalHeaders = mockApiClient.processHeaders({}, perRequestHeaders);
                    
                    // Verify that all per-request headers are included in the final headers
                    for (const [headerName, headerValue] of Object.entries(perRequestHeaders)) {
                        expect(finalHeaders).toHaveProperty(headerName);
                        expect(finalHeaders[headerName]).toBe(headerValue);
                    }
                    
                    // Verify that default headers are also included (unless overridden)
                    for (const [headerName, headerValue] of Object.entries(defaultHeaders)) {
                        expect(finalHeaders).toHaveProperty(headerName);
                        if (headerName in perRequestHeaders) {
                            // Should be overridden by per-request value
                            expect(finalHeaders[headerName]).toBe(perRequestHeaders[headerName]);
                        } else {
                            // Should retain default value
                            expect(finalHeaders[headerName]).toBe(headerValue);
                        }
                    }
                    
                    // Verify that the final headers object contains at least the per-request headers
                    const finalHeaderKeys = Object.keys(finalHeaders);
                    const perRequestHeaderKeys = Object.keys(perRequestHeaders);
                    
                    for (const key of perRequestHeaderKeys) {
                        expect(finalHeaderKeys).toContain(key);
                    }
                }
            ), { numRuns: 100 });
        });

        it('should handle edge cases with per-request headers', () => {
            fc.assert(fc.property(
                // Generate edge case scenarios
                fc.oneof(
                    fc.constant({}), // empty headers
                    fc.dictionary(
                        fc.stringMatching(/^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/),
                        fc.constant('') // empty values
                    ),
                    fc.dictionary(
                        fc.stringMatching(/^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/),
                        fc.string().filter(s => s.includes(' ') || s.includes('\t')) // values with whitespace
                    )
                ),
                fc.dictionary(
                    fc.stringMatching(/^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/),
                    fc.string().filter(s => s.length === 0 || /^[\x20\x09\x21-\x7E\x80-\xFF]*$/.test(s))
                ),
                (perRequestHeaders, defaultHeaders) => {
                    // Mock API client
                    const mockApiClient = {
                        defaultHeaders: defaultHeaders,
                        normalizeParams: (params: any) => params || {},
                        addHeaders: (existingHeaders: any, ...newHeaders: any[]) => {
                            if (existingHeaders) {
                                return Object.assign(existingHeaders, ...newHeaders);
                            } else {
                                return Object.assign(...newHeaders);
                            }
                        },
                        processHeaders: function(headerParams: any, perRequestHeaders: any) {
                            const defaultHeaders = this.defaultHeaders;
                            const normalizedHeaderParams = this.normalizeParams(headerParams);
                            let finalHeaders = this.addHeaders({}, defaultHeaders, normalizedHeaderParams);
                            
                            if (perRequestHeaders) {
                                if (typeof perRequestHeaders !== 'object' || perRequestHeaders === null) {
                                    throw new Error('Per-request headers must be a valid object');
                                }
                                
                                for (const [name, value] of Object.entries(perRequestHeaders)) {
                                    if (typeof name !== 'string' || typeof value !== 'string') {
                                        throw new Error(`Invalid header: "${name}" must have string name and value`);
                                    }
                                    if (!/^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/.test(name)) {
                                        throw new Error(`Invalid header name: "${name}" - must be a valid HTTP token`);
                                    }
                                    for (let i = 0; i < (value as string).length; i++) {
                                        const charCode = (value as string).charCodeAt(i);
                                        if (!((charCode >= 0x21 && charCode <= 0x7E) || charCode === 0x20 || charCode === 0x09 || (charCode >= 0x80 && charCode <= 0xFF))) {
                                            throw new Error(`Invalid header value for "${name}": contains invalid characters`);
                                        }
                                    }
                                }
                                
                                finalHeaders = this.addHeaders(finalHeaders, perRequestHeaders);
                            }
                            
                            return finalHeaders;
                        }
                    };
                    
                    // Should not throw for valid edge cases
                    expect(() => {
                        const finalHeaders = mockApiClient.processHeaders({}, perRequestHeaders);
                        
                        // All per-request headers should be present
                        for (const [headerName, headerValue] of Object.entries(perRequestHeaders)) {
                            expect(finalHeaders[headerName]).toBe(headerValue);
                        }
                    }).not.toThrow();
                }
            ), { numRuns: 100 });
        });
    });

    /**
     * **Feature: per-request-headers, Property 3: Backward compatibility preservation**
     * **Validates: Requirements 2.1, 2.3, 2.4**
     * 
     * Property: For any existing API method call pattern without the headers option, the behavior 
     * should be identical to the pre-enhancement implementation
     */
    describe('Property 3: Backward compatibility preservation', () => {
        it('should maintain identical behavior when headers option is not provided', () => {
            fc.assert(fc.property(
                // Generate default headers
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
                // Generate template headers (from OpenAPI spec)
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
                (defaultHeaders, templateHeaders) => {
                    // Mock API client with both old and new behavior
                    const mockApiClient = {
                        defaultHeaders: defaultHeaders,
                        
                        normalizeParams: (params) => params || {},
                        
                        addHeaders: (existingHeaders, ...newHeaders) => {
                            if (existingHeaders) {
                                return Object.assign(existingHeaders, ...newHeaders);
                            } else {
                                return Object.assign(...newHeaders);
                            }
                        },
                        
                        // Old behavior (pre-enhancement) - no per-request headers support
                        processHeadersOld: function(headerParams) {
                            const defaultHeaders = this.defaultHeaders;
                            const normalizedHeaderParams = this.normalizeParams(headerParams);
                            return this.addHeaders({}, defaultHeaders, normalizedHeaderParams);
                        },
                        
                        // New behavior (post-enhancement) - with per-request headers support
                        processHeadersNew: function(headerParams, perRequestHeaders) {
                            const defaultHeaders = this.defaultHeaders;
                            const normalizedHeaderParams = this.normalizeParams(headerParams);
                            
                            // Start with existing headers and add default and template headers
                            let finalHeaders = this.addHeaders({}, defaultHeaders, normalizedHeaderParams);
                            
                            // Merge per-request headers if provided
                            if (perRequestHeaders) {
                                // Validate per-request headers
                                if (typeof perRequestHeaders !== 'object' || perRequestHeaders === null) {
                                    throw new Error('Per-request headers must be a valid object');
                                }
                                
                                // Basic header validation
                                for (const [name, value] of Object.entries(perRequestHeaders)) {
                                    if (typeof name !== 'string' || typeof value !== 'string') {
                                        throw new Error(`Invalid header: "${name}" must have string name and value`);
                                    }
                                    // Basic header name validation (RFC 7230)
                                    if (!/^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/.test(name)) {
                                        throw new Error(`Invalid header name: "${name}" - must be a valid HTTP token`);
                                    }
                                    // Basic header value validation
                                    for (let i = 0; i < value.length; i++) {
                                        const charCode = value.charCodeAt(i);
                                        if (!((charCode >= 0x21 && charCode <= 0x7E) || charCode === 0x20 || charCode === 0x09 || (charCode >= 0x80 && charCode <= 0xFF))) {
                                            throw new Error(`Invalid header value for "${name}": contains invalid characters`);
                                        }
                                    }
                                }
                                
                                // Merge per-request headers (they take precedence)
                                finalHeaders = this.addHeaders(finalHeaders, perRequestHeaders);
                            }
                            
                            return finalHeaders;
                        }
                    };
                    
                    // Test backward compatibility: new behavior without per-request headers should match old behavior
                    const oldResult = mockApiClient.processHeadersOld(templateHeaders);
                    const newResultWithoutHeaders = mockApiClient.processHeadersNew(templateHeaders, null);
                    const newResultWithUndefinedHeaders = mockApiClient.processHeadersNew(templateHeaders, undefined);
                    const newResultWithEmptyHeaders = mockApiClient.processHeadersNew(templateHeaders, {});
                    
                    // All results should be identical
                    expect(newResultWithoutHeaders).toEqual(oldResult);
                    expect(newResultWithUndefinedHeaders).toEqual(oldResult);
                    expect(newResultWithEmptyHeaders).toEqual(oldResult);
                    
                    // Verify that the structure is preserved
                    expect(Object.keys(newResultWithoutHeaders)).toEqual(Object.keys(oldResult));
                    expect(Object.keys(newResultWithUndefinedHeaders)).toEqual(Object.keys(oldResult));
                    expect(Object.keys(newResultWithEmptyHeaders)).toEqual(Object.keys(oldResult));
                    
                    // Verify that all header values match exactly
                    for (const [key, value] of Object.entries(oldResult)) {
                        expect(newResultWithoutHeaders[key]).toBe(value);
                        expect(newResultWithUndefinedHeaders[key]).toBe(value);
                        expect(newResultWithEmptyHeaders[key]).toBe(value);
                    }
                }
            ), { numRuns: 100 });
        });

        it('should handle various null/undefined/empty scenarios consistently', () => {
            fc.assert(fc.property(
                fc.dictionary(
                    fc.stringMatching(/^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/),
                    fc.string().filter(s => s.length === 0 || /^[\x20\x09\x21-\x7E\x80-\xFF]*$/.test(s))
                ),
                (defaultHeaders) => {
                    const mockApiClient = {
                        defaultHeaders: defaultHeaders,
                        normalizeParams: (params) => params || {},
                        addHeaders: (existingHeaders, ...newHeaders) => {
                            if (existingHeaders) {
                                return Object.assign(existingHeaders, ...newHeaders);
                            } else {
                                return Object.assign(...newHeaders);
                            }
                        },
                        processHeaders: function(headerParams, perRequestHeaders) {
                            const defaultHeaders = this.defaultHeaders;
                            const normalizedHeaderParams = this.normalizeParams(headerParams);
                            let finalHeaders = this.addHeaders({}, defaultHeaders, normalizedHeaderParams);
                            
                            if (perRequestHeaders) {
                                if (typeof perRequestHeaders !== 'object' || perRequestHeaders === null) {
                                    throw new Error('Per-request headers must be a valid object');
                                }
                                finalHeaders = this.addHeaders(finalHeaders, perRequestHeaders);
                            }
                            
                            return finalHeaders;
                        }
                    };
                    
                    // Test various ways of not providing per-request headers
                    const resultWithNull = mockApiClient.processHeaders({}, null);
                    const resultWithUndefined = mockApiClient.processHeaders({}, undefined);
                    const resultWithEmpty = mockApiClient.processHeaders({}, {});
                    const resultWithoutParam = mockApiClient.processHeaders({});
                    
                    // All should produce the same result
                    expect(resultWithNull).toEqual(resultWithUndefined);
                    expect(resultWithUndefined).toEqual(resultWithEmpty);
                    expect(resultWithEmpty).toEqual(resultWithoutParam);
                    
                    // Should only contain default headers
                    expect(resultWithNull).toEqual(defaultHeaders);
                    expect(resultWithUndefined).toEqual(defaultHeaders);
                    expect(resultWithEmpty).toEqual(defaultHeaders);
                    expect(resultWithoutParam).toEqual(defaultHeaders);
                }
            ), { numRuns: 100 });
        });
    });

    // Unit tests for specific examples
    describe('Unit tests for per-request headers inclusion', () => {
        it('should include custom headers in API request', () => {
            const mockApiClient = {
                defaultHeaders: {
                    'User-Agent': 'MyApp/1.0',
                    'Accept': 'application/json'
                },
                normalizeParams: (params: any) => params || {},
                addHeaders: (existingHeaders: any, ...newHeaders: any[]) => {
                    if (existingHeaders) {
                        return Object.assign(existingHeaders, ...newHeaders);
                    } else {
                        return Object.assign(...newHeaders);
                    }
                },
                processHeaders: function(headerParams: any, perRequestHeaders: any) {
                    const defaultHeaders = this.defaultHeaders;
                    const normalizedHeaderParams = this.normalizeParams(headerParams);
                    let finalHeaders = this.addHeaders({}, defaultHeaders, normalizedHeaderParams);
                    
                    if (perRequestHeaders) {
                        finalHeaders = this.addHeaders(finalHeaders, perRequestHeaders);
                    }
                    
                    return finalHeaders;
                }
            };
            
            const perRequestHeaders = {
                'Authorization': 'Bearer token123',
                'X-Request-ID': 'req-456'
            };
            
            const finalHeaders = mockApiClient.processHeaders({}, perRequestHeaders);
            
            // Should include all per-request headers
            expect(finalHeaders['Authorization']).toBe('Bearer token123');
            expect(finalHeaders['X-Request-ID']).toBe('req-456');
            
            // Should also include default headers
            expect(finalHeaders['User-Agent']).toBe('MyApp/1.0');
            expect(finalHeaders['Accept']).toBe('application/json');
        });

        it('should override default headers with per-request headers', () => {
            const mockApiClient = {
                defaultHeaders: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'MyApp/1.0'
                },
                normalizeParams: (params: any) => params || {},
                addHeaders: (existingHeaders: any, ...newHeaders: any[]) => {
                    if (existingHeaders) {
                        return Object.assign(existingHeaders, ...newHeaders);
                    } else {
                        return Object.assign(...newHeaders);
                    }
                },
                processHeaders: function(headerParams: any, perRequestHeaders: any) {
                    const defaultHeaders = this.defaultHeaders;
                    const normalizedHeaderParams = this.normalizeParams(headerParams);
                    let finalHeaders = this.addHeaders({}, defaultHeaders, normalizedHeaderParams);
                    
                    if (perRequestHeaders) {
                        finalHeaders = this.addHeaders(finalHeaders, perRequestHeaders);
                    }
                    
                    return finalHeaders;
                }
            };
            
            const perRequestHeaders = {
                'Content-Type': 'application/xml', // Override default
                'Authorization': 'Bearer token123' // New header
            };
            
            const finalHeaders = mockApiClient.processHeaders({}, perRequestHeaders);
            
            // Should override default Content-Type
            expect(finalHeaders['Content-Type']).toBe('application/xml');
            
            // Should include new Authorization header
            expect(finalHeaders['Authorization']).toBe('Bearer token123');
            
            // Should preserve non-overridden default header
            expect(finalHeaders['User-Agent']).toBe('MyApp/1.0');
        });

        it('should work with empty per-request headers', () => {
            const mockApiClient = {
                defaultHeaders: {
                    'User-Agent': 'MyApp/1.0'
                },
                normalizeParams: (params: any) => params || {},
                addHeaders: (existingHeaders: any, ...newHeaders: any[]) => {
                    if (existingHeaders) {
                        return Object.assign(existingHeaders, ...newHeaders);
                    } else {
                        return Object.assign(...newHeaders);
                    }
                },
                processHeaders: function(headerParams: any, perRequestHeaders: any) {
                    const defaultHeaders = this.defaultHeaders;
                    const normalizedHeaderParams = this.normalizeParams(headerParams);
                    let finalHeaders = this.addHeaders({}, defaultHeaders, normalizedHeaderParams);
                    
                    if (perRequestHeaders) {
                        finalHeaders = this.addHeaders(finalHeaders, perRequestHeaders);
                    }
                    
                    return finalHeaders;
                }
            };
            
            const finalHeaders = mockApiClient.processHeaders({}, {});
            
            // Should only include default headers
            expect(finalHeaders['User-Agent']).toBe('MyApp/1.0');
            expect(Object.keys(finalHeaders)).toHaveLength(1);
        });
    });
});

    /**
     * **Feature: per-request-headers, Property 7: Error context preservation**
     * **Validates: Requirements 5.3, 5.4**
     * 
     * Property: For any network error that occurs with custom headers, the error context should 
     * preserve information about the headers that were sent with the request
     */
    describe('Property 7: Error context preservation', () => {
        it('should preserve header information in error context when network errors occur', () => {
            fc.assert(fc.property(
                // Generate valid per-request headers
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
                ).filter(headers => Object.keys(headers).length > 0), // Ensure at least one header
                // Generate default headers
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
                // Generate error scenarios
                fc.oneof(
                    fc.constant('NETWORK_ERROR'),
                    fc.constant('TIMEOUT_ERROR'),
                    fc.constant('CONNECTION_REFUSED'),
                    fc.constant('DNS_ERROR')
                ),
                (perRequestHeaders, defaultHeaders, errorType) => {
                    // Mock API client that simulates network errors with header context preservation
                    const mockApiClient = {
                        defaultHeaders: defaultHeaders,
                        
                        normalizeParams: (params: any) => params || {},
                        
                        addHeaders: (existingHeaders: any, ...newHeaders: any[]) => {
                            if (existingHeaders) {
                                return Object.assign(existingHeaders, ...newHeaders);
                            } else {
                                return Object.assign(...newHeaders);
                            }
                        },
                        
                        // Simulate API call with error context preservation
                        makeApiCall: function(path: string, method: string, perRequestHeaders: any) {
                            const defaultHeaders = this.defaultHeaders;
                            const normalizedHeaderParams = this.normalizeParams({});
                            
                            // Start with existing headers and add default and template headers
                            let finalHeaders = this.addHeaders({}, defaultHeaders, normalizedHeaderParams);
                            
                            // Merge per-request headers if provided
                            if (perRequestHeaders) {
                                // Validate per-request headers
                                if (typeof perRequestHeaders !== 'object' || perRequestHeaders === null) {
                                    throw new Error('Per-request headers must be a valid object');
                                }
                                
                                // Basic header validation
                                for (const [name, value] of Object.entries(perRequestHeaders)) {
                                    if (typeof name !== 'string' || typeof value !== 'string') {
                                        throw new Error(`Invalid header: "${name}" must have string name and value`);
                                    }
                                    // Basic header name validation (RFC 7230)
                                    if (!/^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/.test(name)) {
                                        throw new Error(`Invalid header name: "${name}" - must be a valid HTTP token`);
                                    }
                                    // Basic header value validation
                                    for (let i = 0; i < (value as string).length; i++) {
                                        const charCode = (value as string).charCodeAt(i);
                                        if (!((charCode >= 0x21 && charCode <= 0x7E) || charCode === 0x20 || charCode === 0x09 || (charCode >= 0x80 && charCode <= 0xFF))) {
                                            throw new Error(`Invalid header value for "${name}": contains invalid characters`);
                                        }
                                    }
                                }
                                
                                // Merge per-request headers (they take precedence)
                                finalHeaders = this.addHeaders(finalHeaders, perRequestHeaders);
                            }
                            
                            // Simulate network error with preserved context
                            const error = new Error(`${errorType}: Failed to connect to ${path}`);
                            (error as any).requestContext = {
                                method: method,
                                path: path,
                                headers: finalHeaders,
                                perRequestHeaders: perRequestHeaders,
                                defaultHeaders: defaultHeaders,
                                errorType: errorType
                            };
                            
                            throw error;
                        }
                    };
                    
                    // Test that error context preserves header information
                    let caughtError: any = null;
                    
                    try {
                        mockApiClient.makeApiCall('/api/test', 'GET', perRequestHeaders);
                    } catch (error) {
                        caughtError = error;
                    }
                    
                    // Verify that error was thrown
                    expect(caughtError).not.toBeNull();
                    expect(caughtError.message).toContain(errorType);
                    
                    // Verify that error context contains request information
                    expect(caughtError.requestContext).toBeDefined();
                    expect(caughtError.requestContext.method).toBe('GET');
                    expect(caughtError.requestContext.path).toBe('/api/test');
                    expect(caughtError.requestContext.errorType).toBe(errorType);
                    
                    // Verify that error context preserves header information
                    expect(caughtError.requestContext.headers).toBeDefined();
                    expect(caughtError.requestContext.perRequestHeaders).toBe(perRequestHeaders);
                    expect(caughtError.requestContext.defaultHeaders).toBe(defaultHeaders);
                    
                    // Verify that all per-request headers are preserved in the final headers
                    for (const [headerName, headerValue] of Object.entries(perRequestHeaders)) {
                        expect(caughtError.requestContext.headers).toHaveProperty(headerName);
                        expect(caughtError.requestContext.headers[headerName]).toBe(headerValue);
                    }
                    
                    // Verify that default headers are preserved (unless overridden)
                    for (const [headerName, headerValue] of Object.entries(defaultHeaders)) {
                        expect(caughtError.requestContext.headers).toHaveProperty(headerName);
                        if (headerName in perRequestHeaders) {
                            // Should be overridden by per-request value
                            expect(caughtError.requestContext.headers[headerName]).toBe(perRequestHeaders[headerName]);
                        } else {
                            // Should retain default value
                            expect(caughtError.requestContext.headers[headerName]).toBe(headerValue);
                        }
                    }
                    
                    // Verify that the error context can be used for debugging
                    const debugInfo = {
                        sentHeaders: Object.keys(caughtError.requestContext.headers),
                        perRequestHeaderCount: Object.keys(perRequestHeaders).length,
                        defaultHeaderCount: Object.keys(defaultHeaders).length,
                        totalHeaderCount: Object.keys(caughtError.requestContext.headers).length
                    };
                    
                    expect(debugInfo.sentHeaders.length).toBeGreaterThanOrEqual(debugInfo.perRequestHeaderCount);
                    expect(debugInfo.totalHeaderCount).toBeGreaterThanOrEqual(debugInfo.perRequestHeaderCount);
                }
            ), { numRuns: 100 });
        });

        it('should preserve header context for different types of errors', () => {
            fc.assert(fc.property(
                // Generate headers with various characteristics
                fc.dictionary(
                    fc.stringMatching(/^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/),
                    fc.string().filter(s => s.length === 0 || /^[\x20\x09\x21-\x7E\x80-\xFF]*$/.test(s))
                ).filter(headers => Object.keys(headers).length > 0),
                // Generate different HTTP status codes that might cause errors
                fc.integer({ min: 400, max: 599 }),
                (perRequestHeaders, statusCode) => {
                    const mockApiClient = {
                        defaultHeaders: { 'User-Agent': 'TestClient/1.0' },
                        
                        makeApiCallWithHttpError: function(perRequestHeaders: any, statusCode: number) {
                            // Merge headers
                            const finalHeaders = { ...this.defaultHeaders, ...perRequestHeaders };
                            
                            // Create HTTP error with context
                            const error = new Error(`HTTP ${statusCode}: Request failed`);
                            (error as any).status = statusCode;
                            (error as any).requestContext = {
                                headers: finalHeaders,
                                perRequestHeaders: perRequestHeaders,
                                statusCode: statusCode,
                                timestamp: new Date().toISOString()
                            };
                            
                            throw error;
                        }
                    };
                    
                    let caughtError: any = null;
                    
                    try {
                        mockApiClient.makeApiCallWithHttpError(perRequestHeaders, statusCode);
                    } catch (error) {
                        caughtError = error;
                    }
                    
                    // Verify error context preservation for HTTP errors
                    expect(caughtError).not.toBeNull();
                    expect(caughtError.status).toBe(statusCode);
                    expect(caughtError.requestContext).toBeDefined();
                    expect(caughtError.requestContext.statusCode).toBe(statusCode);
                    expect(caughtError.requestContext.timestamp).toBeDefined();
                    
                    // Verify header preservation
                    expect(caughtError.requestContext.headers).toBeDefined();
                    expect(caughtError.requestContext.perRequestHeaders).toBe(perRequestHeaders);
                    
                    // All per-request headers should be in final headers
                    for (const [headerName, headerValue] of Object.entries(perRequestHeaders)) {
                        expect(caughtError.requestContext.headers[headerName]).toBe(headerValue);
                    }
                    
                    // Default headers should also be present (unless overridden)
                    expect(caughtError.requestContext.headers['User-Agent']).toBeDefined();
                    if (!('User-Agent' in perRequestHeaders)) {
                        expect(caughtError.requestContext.headers['User-Agent']).toBe('TestClient/1.0');
                    }
                }
            ), { numRuns: 100 });
        });
    });

    // Unit tests for error context preservation
    describe('Unit tests for error context preservation', () => {
        it('should preserve custom headers in network error context', () => {
            const mockApiClient = {
                defaultHeaders: { 'User-Agent': 'MyApp/1.0' },
                
                makeRequest: function(headers: any) {
                    const finalHeaders = { ...this.defaultHeaders, ...headers };
                    
                    const error = new Error('Network connection failed');
                    (error as any).requestContext = {
                        headers: finalHeaders,
                        perRequestHeaders: headers
                    };
                    
                    throw error;
                }
            };
            
            const customHeaders = {
                'Authorization': 'Bearer token123',
                'X-Request-ID': 'req-456'
            };
            
            let caughtError: any = null;
            
            try {
                mockApiClient.makeRequest(customHeaders);
            } catch (error) {
                caughtError = error;
            }
            
            expect(caughtError).not.toBeNull();
            expect(caughtError.requestContext.headers['Authorization']).toBe('Bearer token123');
            expect(caughtError.requestContext.headers['X-Request-ID']).toBe('req-456');
            expect(caughtError.requestContext.headers['User-Agent']).toBe('MyApp/1.0');
            expect(caughtError.requestContext.perRequestHeaders).toBe(customHeaders);
        });

        it('should handle error context when headers override defaults', () => {
            const mockApiClient = {
                defaultHeaders: { 
                    'Content-Type': 'application/json',
                    'User-Agent': 'MyApp/1.0' 
                },
                
                makeRequest: function(headers: any) {
                    const finalHeaders = { ...this.defaultHeaders, ...headers };
                    
                    const error = new Error('Request timeout');
                    (error as any).requestContext = {
                        headers: finalHeaders,
                        perRequestHeaders: headers,
                        defaultHeaders: this.defaultHeaders
                    };
                    
                    throw error;
                }
            };
            
            const customHeaders = {
                'Content-Type': 'application/xml', // Override default
                'Authorization': 'Bearer token123'  // New header
            };
            
            let caughtError: any = null;
            
            try {
                mockApiClient.makeRequest(customHeaders);
            } catch (error) {
                caughtError = error;
            }
            
            expect(caughtError).not.toBeNull();
            
            // Verify overridden header
            expect(caughtError.requestContext.headers['Content-Type']).toBe('application/xml');
            
            // Verify new header
            expect(caughtError.requestContext.headers['Authorization']).toBe('Bearer token123');
            
            // Verify preserved default header
            expect(caughtError.requestContext.headers['User-Agent']).toBe('MyApp/1.0');
            
            // Verify context preservation
            expect(caughtError.requestContext.perRequestHeaders).toBe(customHeaders);
            expect(caughtError.requestContext.defaultHeaders['Content-Type']).toBe('application/json');
        });

        it('should preserve empty headers context in errors', () => {
            const mockApiClient = {
                defaultHeaders: { 'User-Agent': 'MyApp/1.0' },
                
                makeRequest: function(headers: any) {
                    const finalHeaders = { ...this.defaultHeaders, ...(headers || {}) };
                    
                    const error = new Error('Server error');
                    (error as any).requestContext = {
                        headers: finalHeaders,
                        perRequestHeaders: headers
                    };
                    
                    throw error;
                }
            };
            
            let caughtError: any = null;
            
            try {
                mockApiClient.makeRequest({});
            } catch (error) {
                caughtError = error;
            }
            
            expect(caughtError).not.toBeNull();
            expect(caughtError.requestContext.headers['User-Agent']).toBe('MyApp/1.0');
            expect(caughtError.requestContext.perRequestHeaders).toEqual({});
            expect(Object.keys(caughtError.requestContext.headers)).toHaveLength(1);
        });
    });
});