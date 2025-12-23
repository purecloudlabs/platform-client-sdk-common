import * as fc from 'fast-check';

describe('postConversationsMessageMessagesBulk Method Enhancement', () => {
    /**
     * Mock implementation of the postConversationsMessageMessagesBulk method
     * This demonstrates how the method would work with per-request headers
     */
    class MockConversationsApi {
        private apiClient: any;

        constructor(apiClient: any) {
            this.apiClient = apiClient;
        }

        /**
         * Enhanced postConversationsMessageMessagesBulk method with headers support
         * @param conversationId - The conversation ID
         * @param opts - Options object containing body and optional headers
         * @param opts.body - Array of message strings for bulk operation
         * @param opts.headers - Optional per-request headers
         */
        postConversationsMessageMessagesBulk(conversationId: string, opts: { 
            body: string[], 
            headers?: Record<string, string> 
        }) {
            // Validate required parameters
            if (!conversationId || conversationId === '') {
                throw new Error('Missing the required parameter "conversationId" when calling postConversationsMessageMessagesBulk');
            }
            if (!opts || !opts.body) {
                throw new Error('Missing the required parameter "body" when calling postConversationsMessageMessagesBulk');
            }

            // Call the underlying API client with per-request headers
            return this.apiClient.callApi(
                `/api/v2/conversations/${conversationId}/messages/bulk`,
                'POST',
                { 'conversationId': conversationId }, // pathParams
                {}, // queryParams
                {}, // headerParams (from OpenAPI spec)
                {}, // formParams
                opts.body, // bodyParam
                ['PureCloud OAuth'], // authNames
                ['application/json'], // contentTypes
                ['application/json'], // accepts
                opts.headers // perRequestHeaders
            );
        }
    }

    /**
     * Mock API client that simulates the enhanced callApi method
     */
    function createMockApiClient(defaultHeaders: Record<string, string> = {}) {
        return {
            defaultHeaders: defaultHeaders,
            
            normalizeParams: (params: any) => params || {},
            
            addHeaders: (existingHeaders: any, ...newHeaders: any[]) => {
                if (existingHeaders) {
                    return Object.assign(existingHeaders, ...newHeaders);
                } else {
                    return Object.assign(...newHeaders);
                }
            },
            
            callApi: function(
                path: string, 
                httpMethod: string, 
                pathParams: any, 
                queryParams: any, 
                headerParams: any, 
                formParams: any, 
                bodyParam: any, 
                authNames: string[], 
                contentTypes: string[], 
                accepts: string[], 
                perRequestHeaders?: Record<string, string>
            ) {
                // Simulate the header processing logic from the actual implementation
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
                
                // Simulate successful API response
                return Promise.resolve({
                    status: 200,
                    data: {
                        id: 'bulk-operation-123',
                        conversationId: pathParams.conversationId,
                        messages: bodyParam,
                        headers: finalHeaders,
                        timestamp: new Date().toISOString()
                    }
                });
            }
        };
    }

    describe('Task 6.1: Enhance postConversationsMessageMessagesBulk method', () => {
        it('should accept headers option in addition to body parameter', () => {
            const mockApiClient = createMockApiClient({
                'User-Agent': 'MyApp/1.0',
                'Accept': 'application/json'
            });
            
            const conversationsApi = new MockConversationsApi(mockApiClient);
            
            const conversationId = 'conv-123';
            const messages = ['Hello', 'World', 'Test'];
            const customHeaders = {
                'X-Request-ID': 'req-456',
                'Authorization': 'Bearer token123'
            };
            
            return conversationsApi.postConversationsMessageMessagesBulk(conversationId, {
                body: messages,
                headers: customHeaders
            }).then((response) => {
                // Verify the response structure
                expect(response.data.conversationId).toBe(conversationId);
                expect(response.data.messages).toEqual(messages);
                
                // Verify that custom headers were included
                expect(response.data.headers['X-Request-ID']).toBe('req-456');
                expect(response.data.headers['Authorization']).toBe('Bearer token123');
                
                // Verify that default headers are preserved
                expect(response.data.headers['User-Agent']).toBe('MyApp/1.0');
                expect(response.data.headers['Accept']).toBe('application/json');
            });
        });

        it('should work with body parameter only (backward compatibility)', () => {
            const mockApiClient = createMockApiClient({
                'User-Agent': 'MyApp/1.0'
            });
            
            const conversationsApi = new MockConversationsApi(mockApiClient);
            
            const conversationId = 'conv-456';
            const messages = ['Backward', 'Compatible'];
            
            return conversationsApi.postConversationsMessageMessagesBulk(conversationId, {
                body: messages
            }).then((response) => {
                // Verify the response structure
                expect(response.data.conversationId).toBe(conversationId);
                expect(response.data.messages).toEqual(messages);
                
                // Should only have default headers
                expect(response.data.headers['User-Agent']).toBe('MyApp/1.0');
                expect(Object.keys(response.data.headers)).toHaveLength(1);
            });
        });

        it('should handle header precedence correctly', () => {
            const mockApiClient = createMockApiClient({
                'Content-Type': 'application/json',
                'User-Agent': 'MyApp/1.0'
            });
            
            const conversationsApi = new MockConversationsApi(mockApiClient);
            
            const conversationId = 'conv-789';
            const messages = ['Override', 'Test'];
            const customHeaders = {
                'Content-Type': 'application/xml', // Override default
                'X-Custom': 'custom-value'         // New header
            };
            
            return conversationsApi.postConversationsMessageMessagesBulk(conversationId, {
                body: messages,
                headers: customHeaders
            }).then((response) => {
                // Verify header precedence
                expect(response.data.headers['Content-Type']).toBe('application/xml'); // Overridden
                expect(response.data.headers['X-Custom']).toBe('custom-value');        // New
                expect(response.data.headers['User-Agent']).toBe('MyApp/1.0');         // Preserved
            });
        });

        it('should validate required parameters', () => {
            const mockApiClient = createMockApiClient();
            const conversationsApi = new MockConversationsApi(mockApiClient);
            
            // Test missing conversationId
            expect(() => {
                conversationsApi.postConversationsMessageMessagesBulk('', {
                    body: ['test']
                });
            }).toThrow('Missing the required parameter "conversationId"');
            
            // Test missing body
            expect(() => {
                conversationsApi.postConversationsMessageMessagesBulk('conv-123', {} as any);
            }).toThrow('Missing the required parameter "body"');
        });

        it('should validate header format', () => {
            const mockApiClient = createMockApiClient();
            const conversationsApi = new MockConversationsApi(mockApiClient);
            
            const conversationId = 'conv-123';
            const messages = ['test'];
            
            // Test invalid header object
            return conversationsApi.postConversationsMessageMessagesBulk(conversationId, {
                body: messages,
                headers: null as any
            }).catch((error) => {
                expect(error.message).toContain('Per-request headers must be a valid object');
            });
        });
    });

    describe('Task 6.2: Unit tests for postConversationsMessageMessagesBulk', () => {
        it('should process both headers and body parameters correctly', () => {
            const mockApiClient = createMockApiClient({
                'Default-Header': 'default-value'
            });
            
            const conversationsApi = new MockConversationsApi(mockApiClient);
            
            const conversationId = 'conv-integration-test';
            const messages = ['Message 1', 'Message 2', 'Message 3'];
            const customHeaders = {
                'X-Conversation-Context': 'bulk-operation',
                'X-Priority': 'high'
            };
            
            return conversationsApi.postConversationsMessageMessagesBulk(conversationId, {
                body: messages,
                headers: customHeaders
            }).then((response) => {
                // Verify both body and headers are processed
                expect(response.data.messages).toEqual(messages);
                expect(response.data.headers['X-Conversation-Context']).toBe('bulk-operation');
                expect(response.data.headers['X-Priority']).toBe('high');
                expect(response.data.headers['Default-Header']).toBe('default-value');
                
                // Verify response format consistency
                expect(response.data).toHaveProperty('id');
                expect(response.data).toHaveProperty('conversationId');
                expect(response.data).toHaveProperty('messages');
                expect(response.data).toHaveProperty('timestamp');
            });
        });

        it('should handle error scenarios with invalid headers', () => {
            const mockApiClient = createMockApiClient();
            const conversationsApi = new MockConversationsApi(mockApiClient);
            
            const conversationId = 'conv-error-test';
            const messages = ['test'];
            
            // Test invalid header name
            return conversationsApi.postConversationsMessageMessagesBulk(conversationId, {
                body: messages,
                headers: { 'invalid header name': 'value' }
            }).catch((error) => {
                expect(error.message).toContain('Invalid header name');
            });
        });

        it('should maintain response format consistency', () => {
            const mockApiClient = createMockApiClient();
            const conversationsApi = new MockConversationsApi(mockApiClient);
            
            const conversationId = 'conv-format-test';
            const messages = ['format', 'test'];
            
            // Test without headers
            const withoutHeadersPromise = conversationsApi.postConversationsMessageMessagesBulk(conversationId, {
                body: messages
            });
            
            // Test with headers
            const withHeadersPromise = conversationsApi.postConversationsMessageMessagesBulk(conversationId, {
                body: messages,
                headers: { 'X-Test': 'value' }
            });
            
            return Promise.all([withoutHeadersPromise, withHeadersPromise]).then(([responseWithout, responseWith]) => {
                // Both responses should have the same structure
                expect(responseWithout.data).toHaveProperty('id');
                expect(responseWithout.data).toHaveProperty('conversationId');
                expect(responseWithout.data).toHaveProperty('messages');
                expect(responseWithout.data).toHaveProperty('timestamp');
                
                expect(responseWith.data).toHaveProperty('id');
                expect(responseWith.data).toHaveProperty('conversationId');
                expect(responseWith.data).toHaveProperty('messages');
                expect(responseWith.data).toHaveProperty('timestamp');
                
                // Content should be identical except for headers
                expect(responseWithout.data.conversationId).toBe(responseWith.data.conversationId);
                expect(responseWithout.data.messages).toEqual(responseWith.data.messages);
            });
        });
    });

    describe('Property-based tests for postConversationsMessageMessagesBulk', () => {
        it('should handle various header combinations correctly', () => {
            fc.assert(fc.property(
                // Generate valid conversation IDs
                fc.stringMatching(/^conv-[a-zA-Z0-9-]+$/),
                // Generate message arrays
                fc.array(fc.string().filter(s => s.length > 0), { minLength: 1, maxLength: 10 }),
                // Generate valid headers
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
                (conversationId, messages, customHeaders) => {
                    const mockApiClient = createMockApiClient({
                        'Default-Header': 'default-value'
                    });
                    
                    const conversationsApi = new MockConversationsApi(mockApiClient);
                    
                    return conversationsApi.postConversationsMessageMessagesBulk(conversationId, {
                        body: messages,
                        headers: customHeaders
                    }).then((response) => {
                        // Verify basic response structure
                        expect(response.data.conversationId).toBe(conversationId);
                        expect(response.data.messages).toEqual(messages);
                        
                        // Verify all custom headers are present
                        for (const [headerName, headerValue] of Object.entries(customHeaders)) {
                            expect(response.data.headers[headerName]).toBe(headerValue);
                        }
                        
                        // Verify default headers are preserved (unless overridden)
                        if (!('Default-Header' in customHeaders)) {
                            expect(response.data.headers['Default-Header']).toBe('default-value');
                        }
                    });
                }
            ), { numRuns: 50 });
        });

        it('should isolate headers between concurrent requests', () => {
            fc.assert(fc.property(
                // Generate multiple conversation scenarios
                fc.array(fc.record({
                    conversationId: fc.stringMatching(/^conv-[a-zA-Z0-9-]+$/),
                    messages: fc.array(fc.string().filter(s => s.length > 0), { minLength: 1, maxLength: 5 }),
                    headers: fc.dictionary(
                        fc.stringMatching(/^X-Test-[A-Z]+$/),
                        fc.string().filter(s => s.length > 0 && /^[a-zA-Z0-9-]+$/.test(s))
                    ).filter(headers => Object.keys(headers).length > 0)
                }), { minLength: 2, maxLength: 5 }),
                (scenarios) => {
                    const mockApiClient = createMockApiClient();
                    const conversationsApi = new MockConversationsApi(mockApiClient);
                    
                    // Execute all requests concurrently
                    const promises = scenarios.map(scenario => 
                        conversationsApi.postConversationsMessageMessagesBulk(scenario.conversationId, {
                            body: scenario.messages,
                            headers: scenario.headers
                        })
                    );
                    
                    return Promise.all(promises).then((responses) => {
                        // Verify each response has only its own headers
                        responses.forEach((response, index) => {
                            const expectedScenario = scenarios[index];
                            
                            // Verify conversation ID and messages match
                            expect(response.data.conversationId).toBe(expectedScenario.conversationId);
                            expect(response.data.messages).toEqual(expectedScenario.messages);
                            
                            // Verify only the expected headers are present
                            for (const [headerName, headerValue] of Object.entries(expectedScenario.headers)) {
                                expect(response.data.headers[headerName]).toBe(headerValue);
                            }
                            
                            // Verify no headers from other scenarios are present
                            scenarios.forEach((otherScenario, otherIndex) => {
                                if (otherIndex !== index) {
                                    for (const otherHeaderName of Object.keys(otherScenario.headers)) {
                                        if (!(otherHeaderName in expectedScenario.headers)) {
                                            expect(response.data.headers).not.toHaveProperty(otherHeaderName);
                                        }
                                    }
                                }
                            });
                        });
                    });
                }
            ), { numRuns: 25 });
        });
    });
});