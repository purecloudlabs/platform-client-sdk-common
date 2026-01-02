package com.mypurecloud.sdk.v2;

import static org.testng.Assert.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.core.type.TypeReference;
import com.mypurecloud.sdk.v2.connector.*;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Property-based tests for header isolation between concurrent requests
 * **Feature: per-request-headers, Property 5: Header isolation between requests**
 */
public class HeaderIsolationPropertyTest {

    @Mock
    private ApiClientConnector mockConnector;

    @Mock
    private ApiClientConnectorResponse mockResponse;

    private ApiClient apiClient;

    @BeforeMethod
    public void setup() throws Exception {
        MockitoAnnotations.initMocks(this);
        
        // Setup mock response
        when(mockResponse.getStatusCode()).thenReturn(200);
        when(mockResponse.getStatusReasonPhrase()).thenReturn("OK");
        when(mockResponse.getHeaders()).thenReturn(Collections.emptyMap());
        when(mockResponse.hasBody()).thenReturn(true);
        when(mockResponse.readBody()).thenReturn("{}");
        when(mockResponse.getBody()).thenReturn(new InputStream() {
            @Override
            public int read() throws IOException {
                return -1;
            }
        });
        
        // Setup mock connector to capture requests
        when(mockConnector.invoke(any(ApiClientConnectorRequest.class))).thenReturn(mockResponse);
        
        // Create ApiClient with mock connector
        apiClient = ApiClient.Builder.standard()
            .withProperty(ApiClientConnectorProperty.CONNECTOR_PROVIDER, 
                (properties) -> mockConnector)
            .build();
    }

    /**
     * Property 5: Header isolation between requests
     * For any concurrent API calls with different per-request headers, 
     * each request should only include its own specified headers without 
     * interference from other concurrent requests
     * **Validates: Requirements 6.2**
     */
    @Test(invocationCount = 100, threadPoolSize = 3)
    public void headerIsolationBetweenConcurrentRequests() throws Exception {
        
        // Generate different header sets for this test iteration
        Map<String, String> headers1 = generateRandomHeaders(1);
        Map<String, String> headers2 = generateRandomHeaders(2);
        Map<String, String> headers3 = generateRandomHeaders(3);
        
        // Ensure headers are different for each request
        if (headers1.isEmpty() && headers2.isEmpty() && headers3.isEmpty()) {
            return; // Skip this iteration if all headers are empty
        }
        
        ExecutorService executor = Executors.newFixedThreadPool(3);
        List<CompletableFuture<Map<String, String>>> futures = new ArrayList<>();
        List<ApiClientConnectorRequest> capturedRequests = Collections.synchronizedList(new ArrayList<>());
        
        // Setup connector to capture requests
        when(mockConnector.invoke(any(ApiClientConnectorRequest.class))).thenAnswer(invocation -> {
            ApiClientConnectorRequest request = invocation.getArgument(0);
            capturedRequests.add(request);
            return mockResponse;
        });
        
        try {
            // Submit three concurrent requests with different headers
            futures.add(CompletableFuture.supplyAsync(() -> {
                try {
                    ApiRequest<Void> request = createTestRequest(headers1);
                    apiClient.invoke(request, new TypeReference<Void>() {});
                    return headers1;
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }, executor));
            
            futures.add(CompletableFuture.supplyAsync(() -> {
                try {
                    ApiRequest<Void> request = createTestRequest(headers2);
                    apiClient.invoke(request, new TypeReference<Void>() {});
                    return headers2;
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }, executor));
            
            futures.add(CompletableFuture.supplyAsync(() -> {
                try {
                    ApiRequest<Void> request = createTestRequest(headers3);
                    apiClient.invoke(request, new TypeReference<Void>() {});
                    return headers3;
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }, executor));
            
            // Wait for all requests to complete
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).get(5, TimeUnit.SECONDS);
            
            // Verify that exactly 3 requests were captured
            assertEquals(capturedRequests.size(), 3, "Should have captured exactly 3 requests");
            
            // Verify header isolation - each request should only contain its own headers
            List<Map<String, String>> expectedHeaders = Arrays.asList(headers1, headers2, headers3);
            
            for (int i = 0; i < capturedRequests.size(); i++) {
                ApiClientConnectorRequest request = capturedRequests.get(i);
                Map<String, String> requestHeaders = request.getHeaders();
                
                // Find which set of expected headers this request should match
                boolean foundMatch = false;
                for (Map<String, String> expectedHeaderSet : expectedHeaders) {
                    if (containsAllCustomHeaders(requestHeaders, expectedHeaderSet)) {
                        foundMatch = true;
                        
                        // Verify no headers from other sets are present (except standard ones)
                        for (Map<String, String> otherHeaderSet : expectedHeaders) {
                            if (otherHeaderSet != expectedHeaderSet) {
                                assertNoUnexpectedHeaders(requestHeaders, otherHeaderSet, expectedHeaderSet);
                            }
                        }
                        break;
                    }
                }
                
                assertTrue(foundMatch, "Request " + i + " should match one of the expected header sets");
            }
            
        } finally {
            executor.shutdown();
        }
    }
    
    private Map<String, String> generateRandomHeaders(int seed) {
        Random random = new Random(seed + System.currentTimeMillis());
        Map<String, String> headers = new HashMap<>();
        
        // Generate 0-3 headers
        int headerCount = random.nextInt(4);
        
        String[] possibleNames = {
            "X-Custom-Header-" + seed, "X-Request-ID-" + seed, "X-Correlation-ID-" + seed,
            "X-Client-Version-" + seed, "X-Feature-Flag-" + seed, "X-Debug-Mode-" + seed
        };
        
        String[] possibleValues = {
            "value" + seed, "test-value-" + seed, "debug-enabled-" + seed,
            "v1.0." + seed, "trace-" + seed, "correlation-" + seed
        };
        
        Set<String> usedNames = new HashSet<>();
        
        for (int i = 0; i < headerCount; i++) {
            String name = possibleNames[random.nextInt(possibleNames.length)];
            
            // Ensure unique header names within the same map
            if (usedNames.contains(name)) {
                name = name + "-" + i;
            }
            usedNames.add(name);
            
            String value = possibleValues[random.nextInt(possibleValues.length)];
            headers.put(name, value);
        }
        
        return headers;
    }
    
    private boolean containsAllCustomHeaders(Map<String, String> requestHeaders, 
                                           Map<String, String> expectedHeaders) {
        for (Map.Entry<String, String> expected : expectedHeaders.entrySet()) {
            String actualValue = requestHeaders.get(expected.getKey());
            if (!expected.getValue().equals(actualValue)) {
                return false;
            }
        }
        return true;
    }
    
    private void assertNoUnexpectedHeaders(Map<String, String> requestHeaders,
                                         Map<String, String> otherHeaders,
                                         Map<String, String> expectedHeaders) {
        for (Map.Entry<String, String> otherHeader : otherHeaders.entrySet()) {
            String headerName = otherHeader.getKey();
            
            // Skip if this header is also in the expected set (overlap is allowed)
            if (expectedHeaders.containsKey(headerName)) {
                continue;
            }
            
            // Skip standard HTTP headers that are added by the framework
            if (isStandardHeader(headerName)) {
                continue;
            }
            
            String actualValue = requestHeaders.get(headerName);
            String otherValue = otherHeader.getValue();
            
            assertNotEquals(actualValue, otherValue, 
                "Request should not contain header '" + headerName + 
                "' with value '" + otherValue + "' from another concurrent request");
        }
    }
    
    private boolean isStandardHeader(String headerName) {
        return headerName.equalsIgnoreCase("Accept") ||
               headerName.equalsIgnoreCase("Content-Type") ||
               headerName.equalsIgnoreCase("Authorization") ||
               headerName.equalsIgnoreCase("User-Agent");
    }
    
    private ApiRequest<Void> createTestRequest(Map<String, String> customHeaders) {
        return ApiRequestBuilder.create("GET", "/api/v2/test")
            .withCustomHeaders(customHeaders)
            .withContentTypes("application/json")
            .withAccepts("application/json")
            .withAuthNames("PureCloud OAuth")
            .build();
    }
}