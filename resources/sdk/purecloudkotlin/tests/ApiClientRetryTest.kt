package com.mypurecloud.sdk.v2

import com.fasterxml.jackson.core.type.TypeReference
import com.google.common.base.Stopwatch
import com.mypurecloud.sdk.v2.ApiClient.RetryConfiguration
import com.mypurecloud.sdk.v2.ConsoleColors.applyTag
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorProperty
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorRequest
import com.mypurecloud.sdk.v2.connector.ApiClientConnectorResponse
import com.mypurecloud.sdk.v2.connector.apache.ApacheHttpClientConnector
import org.apache.http.Header
import org.apache.http.ProtocolVersion
import org.apache.http.client.methods.CloseableHttpResponse
import org.apache.http.client.methods.HttpUriRequest
import org.apache.http.impl.client.CloseableHttpClient
import org.apache.http.impl.client.HttpClientBuilder
import org.apache.http.message.BasicStatusLine
import org.mockito.Matchers
import org.mockito.Mock
import org.mockito.Mockito
import org.mockito.MockitoAnnotations
import org.testng.Assert
import org.testng.annotations.BeforeMethod
import org.testng.annotations.Test
import java.io.IOException
import java.io.InputStream
import java.util.*
import java.util.concurrent.TimeUnit

class ApiClientRetryTest {
    private var apiClient: ApiClient? = null
    private var environment: String? = null
    private var region: PureCloudRegionHosts? = null
    private var useenum: Boolean = true
    var stopwatch: Stopwatch? = null
    var client: CloseableHttpClient? = null
    var spyClient: CloseableHttpClient? = null
    var connector: ApacheHttpClientConnector? = null
    @Mock
    private var mockResponse: CloseableHttpResponse? = null

    @BeforeMethod
    fun setup() {
        client = HttpClientBuilder.create().build()
        spyClient = Mockito.spy(client)
        MockitoAnnotations.initMocks(this)
        connector = ApacheHttpClientConnector((spyClient)!!, null)
    }

    @Test
    @Throws(IOException::class)
    fun invokeTestWith_429() {
        val retryConfiguration = RetryConfiguration()
        retryConfiguration.maxRetryTimeSec = 6
        retryConfiguration.retryAfterDefaultMs = 100
        apiClient = getApiClient(retryConfiguration)
        mockResponse = getMockCloseableHttpResponse(429)
        val header: Header = Mockito.mock(Header::class.java)
        Mockito.`when`(header.name).thenReturn("Retry-After")
        Mockito.`when`(header.value).thenReturn("3")
        Mockito.`when`(mockResponse!!.allHeaders).thenReturn(arrayOf(header))
        Mockito.doReturn(mockResponse).`when`(spyClient)!!.execute(Matchers.any(HttpUriRequest::class.java))
        try {
            stopwatch = Stopwatch.createStarted()
            apiClient!!.invoke(connectorRequest, returnType)
        } catch (ex: ApiException) {
            Assert.assertEquals(429, ex.statusCode)
            Assert.assertTrue(stopwatch!!.elapsed(TimeUnit.MILLISECONDS) in 6000..6099, "It will wait for every 100 Mills and retry until 6 Seconds")
            stopwatch!!.stop()
        }
    }

    @Test
    @Throws(IOException::class)
    fun invokeTestWith_429_And_No_MaxRetryTime() {
        val retryConfiguration = RetryConfiguration()
        apiClient = getApiClient(retryConfiguration)
        mockResponse = getMockCloseableHttpResponse(429)
        val header: Header = Mockito.mock(Header::class.java)
        Mockito.`when`(header.name).thenReturn("Retry-After")
        Mockito.`when`(header.value).thenReturn("3")
        Mockito.`when`(mockResponse!!.allHeaders).thenReturn(arrayOf(header))
        Mockito.doReturn(mockResponse).`when`(spyClient)!!.execute(Matchers.any(HttpUriRequest::class.java))
        try {
            stopwatch = Stopwatch.createStarted()
            apiClient!!.invoke(connectorRequest, returnType)
        } catch (ex: ApiException) {
            Assert.assertEquals(429, ex.statusCode)
            Assert.assertTrue(stopwatch!!.elapsed(TimeUnit.MILLISECONDS) in 0..99, "Since maxRetryTime is not provided it will not retry even if the status code is 429")
            stopwatch!!.stop()
        }
    }

    @Test
    @Throws(IOException::class)
    fun invokeTestWith_502() {
        val retryConfiguration = RetryConfiguration()
        retryConfiguration.maxRetryTimeSec = 13
        retryConfiguration.retryAfterDefaultMs = 2000
        retryConfiguration.backoffIntervalMs = 11000
        apiClient = getApiClient(retryConfiguration)
        mockResponse = getMockCloseableHttpResponse(502)
        Mockito.`when`(mockResponse!!.allHeaders).thenReturn(arrayOf())
        Mockito.doReturn(mockResponse).`when`(spyClient)!!.execute(Matchers.any(HttpUriRequest::class.java))
        try {
            stopwatch = Stopwatch.createStarted()
            apiClient!!.invoke(connectorRequest, returnType)
        } catch (ex: ApiException) {
            Assert.assertEquals(502, ex.statusCode)
            Assert.assertTrue(stopwatch!!.elapsed(TimeUnit.MILLISECONDS) in 13000..13099, "It will wait for every 2 Sec and retry for 5 times then it will backoff for 3 sec and retry then it exits.")
            stopwatch!!.stop()
        }
    }

    @Test
    @Throws(IOException::class)
    fun invokeTestWith_503() {
        val retryConfiguration = RetryConfiguration()
        retryConfiguration.maxRetryTimeSec = 40
        retryConfiguration.retryAfterDefaultMs = 200
        retryConfiguration.backoffIntervalMs = 3000
        apiClient = getApiClient(retryConfiguration)
        mockResponse = getMockCloseableHttpResponse(503)
        Mockito.`when`(mockResponse!!.allHeaders).thenReturn(arrayOf())
        Mockito.doReturn(mockResponse).`when`(spyClient)!!.execute(Matchers.any(HttpUriRequest::class.java))
        try {
            stopwatch = Stopwatch.createStarted()
            apiClient!!.invoke(connectorRequest, returnType)
        } catch (ex: ApiException) {
            Assert.assertEquals(503, ex.statusCode)
            Assert.assertTrue(stopwatch!!.elapsed(TimeUnit.MILLISECONDS) in 40000..40099, "It will wait for every 200 Mills and retry for 5 times then it will backoff for 3 Sec once, 9 Sec once and 27 Sec before retrying")
            stopwatch!!.stop()
        }
    }

    @Test
    @Throws(IOException::class)
    fun invokeTestWith_504() {
        val retryConfiguration = RetryConfiguration()
        retryConfiguration.maxRetryTimeSec = 2
        retryConfiguration.retryAfterDefaultMs = 1000
        apiClient = getApiClient(retryConfiguration)
        mockResponse = getMockCloseableHttpResponse(504)
        Mockito.`when`(mockResponse!!.allHeaders).thenReturn(arrayOf())
        Mockito.doReturn(mockResponse).`when`(spyClient)!!.execute(Matchers.any(HttpUriRequest::class.java))
        try {
            stopwatch = Stopwatch.createStarted()
            apiClient!!.invoke(connectorRequest, returnType)
        } catch (ex: ApiException) {
            Assert.assertEquals(504, ex.statusCode)
            Assert.assertTrue(stopwatch!!.elapsed(TimeUnit.MILLISECONDS) in 2000..2099, "It will wait for every 1 sec and retry for 2 times")
            stopwatch!!.stop()
        }
    }

    @Test
    @Throws(IOException::class)
    fun invokeTestWith_504_No_MaxRetryTime() {
        val retryConfiguration = RetryConfiguration()
        apiClient = getApiClient(retryConfiguration)
        mockResponse = getMockCloseableHttpResponse(504)
        Mockito.`when`(mockResponse!!.allHeaders).thenReturn(arrayOf())
        Mockito.doReturn(mockResponse).`when`(spyClient)!!.execute(Matchers.any(HttpUriRequest::class.java))
        try {
            stopwatch = Stopwatch.createStarted()
            apiClient!!.invoke(connectorRequest, returnType)
        } catch (ex: ApiException) {
            Assert.assertEquals(504, ex.statusCode)
            Assert.assertTrue(stopwatch!!.elapsed(TimeUnit.MILLISECONDS) in 0..99, "Since maxRetryTime is not provided it will not retry even if the status code is 504")
            stopwatch!!.stop()
        }
    }

    @Test
    @Throws(IOException::class)
    fun shouldRetryTestWith_200() {
        val response: ApiClientConnectorResponse = getConnectorResponse(200, emptyMap())
        val retryConfiguration = RetryConfiguration()
        retryConfiguration.maxRetryTimeSec = 30
        val retry: ApiClient.Retry = ApiClient.Retry(retryConfiguration)
        val stopwatch: Stopwatch = Stopwatch.createStarted()
        val result: Boolean = retry.shouldRetry(response)
        Assert.assertFalse(result, "Status Code is 200, so shouldRetry method returns false")
        Assert.assertTrue(stopwatch.elapsed(TimeUnit.MILLISECONDS) in 0..99)
        stopwatch.stop()
    }

    @Test
    @Throws(IOException::class)
    fun shouldRetryTestWith_429() {
        val headers: MutableMap<String, String> = HashMap()
        headers["Retry-After"] = "1"
        val response: ApiClientConnectorResponse = getConnectorResponse(429, headers)
        val retryConfiguration = RetryConfiguration()
        retryConfiguration.maxRetryTimeSec = 30
        val retry: ApiClient.Retry = ApiClient.Retry(retryConfiguration)
        val stopwatch: Stopwatch = Stopwatch.createStarted()
        val result: Boolean = retry.shouldRetry(response)
        Assert.assertTrue(result, "Status Code is 429, so it will sleep for 1 Sec as provided in Retry-After header and returns true")
        Assert.assertTrue(stopwatch.elapsed(TimeUnit.MILLISECONDS) in 1000..1099)
        stopwatch.stop()
    }

    @Test
    @Throws(IOException::class)
    fun shouldRetryTestWith_502() {
        val headers: MutableMap<String, String> = HashMap()
        headers["Retry-After"] = "1"
        val response: ApiClientConnectorResponse = getConnectorResponse(502, headers)
        val retryConfiguration = RetryConfiguration()
        retryConfiguration.maxRetryTimeSec = 30
        val retry: ApiClient.Retry = ApiClient.Retry(retryConfiguration)
        val stopwatch: Stopwatch = Stopwatch.createStarted()
        val result: Boolean = retry.shouldRetry(response)
        Assert.assertTrue(result, "Status Code is 502, so it will sleep for 1 Sec as provided in Retry-After header and returns true")
        Assert.assertTrue(stopwatch.elapsed(TimeUnit.MILLISECONDS) in 1000..1099)
        stopwatch.stop()
    }

    @Test
    @Throws(IOException::class)
    fun shouldRetryTestWith_502_And_0_MaxRetryTime() {
        val response: ApiClientConnectorResponse = getConnectorResponse(502, emptyMap())
        val retryConfiguration = RetryConfiguration()
        val stopwatch: Stopwatch = Stopwatch.createStarted()
        val retry: ApiClient.Retry = ApiClient.Retry(retryConfiguration)
        val result: Boolean = retry.shouldRetry(response)
        Assert.assertFalse(result, "Even though Status Code is 502, it will return false because MaxRetryTime is set to Zero by default")
        Assert.assertTrue(stopwatch.elapsed(TimeUnit.MILLISECONDS) in 0..99)
        stopwatch.stop()
    }

    @Test
    @Throws(IOException::class)
    fun shouldRetryTestWith_503_And_RetryConfig() {
        val response: ApiClientConnectorResponse = getConnectorResponse(503, emptyMap())
        val retryConfiguration = RetryConfiguration()
        retryConfiguration.backoffIntervalMs = 6000L
        retryConfiguration.retryAfterDefaultMs = 3000L
        retryConfiguration.maxRetryTimeSec = 10
        retryConfiguration.maxRetriesBeforeBackoff = 0
        val retry: ApiClient.Retry = ApiClient.Retry(retryConfiguration)
        val stopwatch: Stopwatch = Stopwatch.createStarted()
        val result: Boolean = retry.shouldRetry(response)
        Assert.assertTrue(result, "Since Status Code is 503 and maxRetriesBeforeBackoff is Zero, backoff block will be executed and returns true")
        Assert.assertTrue(stopwatch.elapsed(TimeUnit.MILLISECONDS) in 3000..3099)
        stopwatch.stop()
    }

    @Test
    @Throws(IOException::class)
    fun shouldRetryTestWith_504_And_No_RetryAfter_Header() {
        val response: ApiClientConnectorResponse = getConnectorResponse(504, emptyMap())
        val retryConfiguration = RetryConfiguration()
        retryConfiguration.maxRetryTimeSec = 30
        val retry: ApiClient.Retry = ApiClient.Retry(retryConfiguration)
        val stopwatch: Stopwatch = Stopwatch.createStarted()
        val result: Boolean = retry.shouldRetry(response)
        Assert.assertTrue(result, "Even though Retry-After header is missing, it will sleep for 3 Sec by default and returns true")
        Assert.assertTrue(stopwatch.elapsed(TimeUnit.MILLISECONDS) in 3000..3099)
        stopwatch.stop()
    }

    private fun getApiClient(retryConfiguration: RetryConfiguration): ApiClient? {
        region = getEnvironment()
        if (region == null) {
            useenum = false
        }
        try {
            var builder: ApiClient.Builder = ApiClient.Builder.standard()
            builder = builder.withProperty(ApiClientConnectorProperty.CONNECTOR_PROVIDER, connector)
            builder = if (useenum) {
                builder.withBasePath((region)!!)
            } else {
                builder.withBasePath("https://api.$environment")
            }
            builder = builder.withRetryConfiguration(retryConfiguration)
            apiClient = builder.build()
            apiClient!!.authorizeClientCredentials(clientId, clientSecret)
            Configuration.defaultApiClient = apiClient
        } catch (ex: ApiException) {
            handleApiException(ex)
        } catch (ex: Exception) {
            println(ex)
            Assert.fail()
        }
        return apiClient
    }

    private fun getMockCloseableHttpResponse(statusCode: Int): CloseableHttpResponse {
        val mockCloseableHttpResponse: CloseableHttpResponse = Mockito.mock(CloseableHttpResponse::class.java)
        Mockito.`when`(mockCloseableHttpResponse.statusLine).thenReturn(BasicStatusLine(ProtocolVersion("HTTP/1.1", 1, 1), statusCode, "Not Okay"))
        return mockCloseableHttpResponse
    }

    private fun getConnectorResponse(statusCode: Int, headers: Map<String, String>): ApiClientConnectorResponse {
        return object : ApiClientConnectorResponse {
            override val statusCode: Int
                get() = statusCode

            override val statusReasonPhrase: String?
                get() = null

            override fun getHeaders(): Map<String, String> {
                return headers
            }

            override fun hasBody(): Boolean {
                return false
            }

            @Throws(IOException::class)
            override fun readBody(): String? {
                return null
            }

            @Throws(IOException::class)
            override fun getBody(): InputStream? {
                return null
            }

            @Throws(Exception::class)
            override fun close() {
            }
        }
    }

    private val connectorRequest: ApiRequest<*>
        get() = object : ApiRequest<ApiClientConnectorRequest?> {
            override val path: String
                get() = "/api/v2/users"

            override val method: String
                get() = "GET"

            override val pathParams: Map<String, String>
                get() = emptyMap()

            override val queryParams: List<Pair>
                get() = emptyList()

            override val formParams: Map<String, Any>
                get() = emptyMap()

            override val headerParams: Map<String, String>
                get() = emptyMap()

            override val customHeaders: Map<String, String>
                get() = emptyMap()

            override val contentType: String
                get() = "application/json"

            override val accepts: String
                get() = "application/json"

            override val body: ApiClientConnectorRequest?
                get() = null

            override val authNames: Array<String?>
                get() = arrayOf("PureCloud OAuth")
        }

    private val returnType: TypeReference<ApiClientConnectorResponse>
        get() {
            return object : TypeReference<ApiClientConnectorResponse>() {}
        }

    private fun getEnvironment(): PureCloudRegionHosts? {
        environment = System.getenv("PURECLOUD_ENVIRONMENT")
        return when (environment) {
            "mypurecloud.com" -> PureCloudRegionHosts.us_east_1
            "mypurecloud.ie" -> PureCloudRegionHosts.eu_west_1
            "mypurecloud.com.au" -> PureCloudRegionHosts.ap_southeast_2
            "mypurecloud.jp" -> PureCloudRegionHosts.ap_northeast_1
            "mypurecloud.de" -> PureCloudRegionHosts.eu_central_1
            else -> {
                println("Not in PureCloudRegionHosts using string value")
                null
            }
        }
    }

    private val clientId: String
        get() {
            return System.getenv("PURECLOUD_CLIENT_ID")
        }

    private val clientSecret: String
        get() {
            return System.getenv("PURECLOUD_CLIENT_SECRET")
        }

    private fun handleApiException(ex: ApiException) {
        println((applyTag(ConsoleColors.RED_BOLD, "API Exception") +
                "(" + ex.getCorrelationId() + ") " +
                ex.statusCode + " " + ex.getStatusReasonPhrase() + " - " + ex.rawBody))
        Assert.fail(ex.statusCode.toString() + " " + ex.getStatusReasonPhrase() + " (" + ex.getCorrelationId() + ")")
    }
}
