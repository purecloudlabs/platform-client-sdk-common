
package com.mypurecloud.sdk.v2;

import com.mypurecloud.sdk.v2.connector.ApiClientConnectorResponse;
import org.testng.Assert;
import org.testng.annotations.AfterTest;
import org.testng.annotations.BeforeTest;
import org.testng.annotations.Test;
import com.google.common.base.Stopwatch;
import java.util.concurrent.TimeUnit;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.io.InputStream;
import java.io.IOException;

public class ApiClientRetryTest {

    @Test(priority = 1)
    public void shouldRetryTestWith_200() throws IOException {

        ApiClientConnectorResponse response = new ApiClientConnectorResponse() {
            @Override
            public int getStatusCode() {
                return 200;
            }

            @Override
            public String getStatusReasonPhrase() {
                return null;
            }

            @Override
            public Map<String, String> getHeaders() {
                Map<String, String> headers = new HashMap<>();
                headers.put("Retry-After", "1");
                return headers;
            }

            @Override
            public boolean hasBody() {
                return false;
            }

            @Override
            public String readBody() throws IOException {
                return null;
            }

            @Override
            public InputStream getBody() throws IOException {
                return null;
            }

            @Override
            public void close() throws Exception {

            }
        };

        ApiClient.RetryConfiguration retryConfiguration = new ApiClient.RetryConfiguration();
        retryConfiguration.setMaxRetryTime(30);

        ApiClient.Retry retry = new ApiClient.Retry(retryConfiguration);
        Stopwatch stopwatch = Stopwatch.createStarted();
        boolean result = retry.shouldRetry(response);
        Assert.assertEquals(false, result, "Status Code is 200, so shouldRetry method returns false");
        Assert.assertTrue(stopwatch.elapsed(TimeUnit.MILLISECONDS) < 100);
        stopwatch.stop();
    }

    @Test(priority = 2)
    public void shouldRetryTestWith_429() throws IOException {

        ApiClientConnectorResponse response = new ApiClientConnectorResponse() {
            @Override
            public int getStatusCode() {
                return 429;
            }

            @Override
            public String getStatusReasonPhrase() {
                return null;
            }

            @Override
            public Map<String, String> getHeaders() {
                Map<String, String> headers = new HashMap<>();
                headers.put("Retry-After", "1");
                return headers;
            }

            @Override
            public boolean hasBody() {
                return false;
            }

            @Override
            public String readBody() throws IOException {
                return null;
            }

            @Override
            public InputStream getBody() throws IOException {
                return null;
            }

            @Override
            public void close() throws Exception {

            }
        };

        ApiClient.RetryConfiguration retryConfiguration = new ApiClient.RetryConfiguration();
        retryConfiguration.setMaxRetryTime(30);

        ApiClient.Retry retry = new ApiClient.Retry(retryConfiguration);
        Stopwatch stopwatch = Stopwatch.createStarted();
        boolean result = retry.shouldRetry(response);
        Assert.assertEquals(true, result, "Status Code is 429, so it will sleep for 1 Sec as provided in Retry-After header and returns true");
        Assert.assertTrue(stopwatch.elapsed(TimeUnit.MILLISECONDS) < 1100);
        stopwatch.stop();

    }

    @Test(priority = 3)
    public void shouldRetryTestWith_502() throws IOException {

        ApiClientConnectorResponse response = new ApiClientConnectorResponse() {
            @Override
            public int getStatusCode() {
                return 502;
            }

            @Override
            public String getStatusReasonPhrase() {
                return null;
            }

            @Override
            public Map<String, String> getHeaders() {
                Map<String, String> headers = new HashMap<>();
                headers.put("Retry-After", "1");
                return headers;
            }

            @Override
            public boolean hasBody() {
                return false;
            }

            @Override
            public String readBody() throws IOException {
                return null;
            }

            @Override
            public InputStream getBody() throws IOException {
                return null;
            }

            @Override
            public void close() throws Exception {

            }
        };

        ApiClient.RetryConfiguration retryConfiguration = new ApiClient.RetryConfiguration();
        retryConfiguration.setMaxRetryTime(30);

        ApiClient.Retry retry = new ApiClient.Retry(retryConfiguration);
        Stopwatch stopwatch = Stopwatch.createStarted();
        boolean result = retry.shouldRetry(response);
        Assert.assertEquals(true, result, "Status Code is 502, so it will sleep for 1 Sec as provided in Retry-After header and returns true");
        Assert.assertTrue(stopwatch.elapsed(TimeUnit.MILLISECONDS) < 1100);
        stopwatch.stop();
    }

    @Test(priority = 4)
    public void shouldRetryTestWith_502_And_0_MaxRetryTime() throws IOException {

        ApiClientConnectorResponse response = new ApiClientConnectorResponse() {
            @Override
            public int getStatusCode() {
                return 502;
            }

            @Override
            public String getStatusReasonPhrase() {
                return null;
            }

            @Override
            public Map<String, String> getHeaders() {
                Map<String, String> headers = new HashMap<>();
                headers.put("Retry-After", "3");
                return headers;
            }

            @Override
            public boolean hasBody() {
                return false;
            }

            @Override
            public String readBody() throws IOException {
                return null;
            }

            @Override
            public InputStream getBody() throws IOException {
                return null;
            }

            @Override
            public void close() throws Exception {

            }
        };

        ApiClient.RetryConfiguration retryConfiguration = new ApiClient.RetryConfiguration();
        Stopwatch stopwatch = Stopwatch.createStarted();
        ApiClient.Retry retry = new ApiClient.Retry(retryConfiguration);
        boolean result = retry.shouldRetry(response);
        Assert.assertEquals(false, result, "Even though Status Code is 502, it will return false because MaxRetryTime is set to Zero by default");
        Assert.assertTrue(stopwatch.elapsed(TimeUnit.MILLISECONDS) < 100);
        stopwatch.stop();
    }

    @Test(priority = 5)
    public void shouldRetryTestWith_503_And_RetryConfig() throws IOException {

        ApiClientConnectorResponse response = new ApiClientConnectorResponse() {
            @Override
            public int getStatusCode() {
                return 503;
            }

            @Override
            public String getStatusReasonPhrase() {
                return null;
            }

            @Override
            public Map<String, String> getHeaders() {
                Map<String, String> headers = new HashMap<>();
                headers.put("Retry-After", "3");
                return headers;
            }

            @Override
            public boolean hasBody() {
                return false;
            }

            @Override
            public String readBody() throws IOException {
                return null;
            }

            @Override
            public InputStream getBody() throws IOException {
                return null;
            }

            @Override
            public void close() throws Exception {

            }
        };

        ApiClient.RetryConfiguration retryConfiguration = new ApiClient.RetryConfiguration();
        retryConfiguration.setBackoffInterval(6000L);
        retryConfiguration.setDefaultDelay(1);
        retryConfiguration.setMaxRetryTime(10);
        retryConfiguration.setMaxRetriesBeforeBackoff(0);

        ApiClient.Retry retry = new ApiClient.Retry(retryConfiguration);
        Stopwatch stopwatch = Stopwatch.createStarted();
        boolean result = retry.shouldRetry(response);
        Assert.assertEquals(true, result, "Since Status Code is 503 and maxRetriesBeforeBackoff is Zero, backoff block will be executed and returns true");
        Assert.assertTrue(stopwatch.elapsed(TimeUnit.MILLISECONDS) < 3100);
        stopwatch.stop();
    }

    @Test(priority = 6)
    public void shouldRetryTestWith_504_And_No_RetryAfter_Header() throws IOException {

        ApiClientConnectorResponse response = new ApiClientConnectorResponse() {
            @Override
            public int getStatusCode() {
                return 504;
            }

            @Override
            public String getStatusReasonPhrase() {
                return null;
            }

            @Override
            public Map<String, String> getHeaders() {
                Map<String, String> headers = new HashMap<>();
                return headers;
            }

            @Override
            public boolean hasBody() {
                return false;
            }

            @Override
            public String readBody() throws IOException {
                return null;
            }

            @Override
            public InputStream getBody() throws IOException {
                return null;
            }

            @Override
            public void close() throws Exception {

            }
        };

        ApiClient.RetryConfiguration retryConfiguration = new ApiClient.RetryConfiguration();
        retryConfiguration.setMaxRetryTime(30);
        ApiClient.Retry retry = new ApiClient.Retry(retryConfiguration);
        Stopwatch stopwatch = Stopwatch.createStarted();
        boolean result = retry.shouldRetry(response);
        Assert.assertEquals(true, result, "Even though Retry-After header is missing, it will sleep for 3 Sec by default and returns true");
        Assert.assertTrue(stopwatch.elapsed(TimeUnit.MILLISECONDS) < 3100);
        stopwatch.stop();
    }

}
