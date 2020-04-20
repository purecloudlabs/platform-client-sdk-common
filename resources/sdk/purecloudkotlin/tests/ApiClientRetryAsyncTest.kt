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
import java.util.concurrent.Future
import java.util.concurrent.TimeUnit

class ApiClientRetryAsyncTest {
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
    fun invokeAsyncTestWith_429() {
        val retryConfiguration = RetryConfiguration()
        retryConfiguration.maxRetryTimeSec = 5
        apiClient = getApiClient(retryConfiguration)
        mockResponse = getMockCloseableHttpResponse(429)
        val header: Header = Mockito.mock(Header::class.java)
        Mockito.`when`(header.name).thenReturn("Retry-After")
        Mockito.`when`(header.value).thenReturn("1")
        Mockito.`when`(mockResponse!!.allHeaders).thenReturn(arrayOf(header))
        Mockito.doReturn(mockResponse).`when`(spyClient)!!.execute(Matchers.any(HttpUriRequest::class.java))
        try {
            stopwatch = Stopwatch.createStarted()
            val response: Future<ApiResponse<ApiClientConnectorResponse>> = apiClient!!.invokeAsync(connectorRequest, returnType, asyncApiCallBack)
            response.get()
        } catch (e: Exception) {
            Assert.assertEquals(429, (e.cause as ApiException?)!!.statusCode)
            Assert.assertTrue(stopwatch!!.elapsed(TimeUnit.MILLISECONDS) in 5000..5099, "It will wait for every 1 Sec provided by Retry-After header Sec and retry for 5 Sec")
            stopwatch!!.stop()
        }
    }

    @Test
    @Throws(IOException::class)
    fun invokeAsyncTestWith_429_And_No_MaxRetryTime() {
        apiClient = getApiClient(RetryConfiguration())
        mockResponse = getMockCloseableHttpResponse(429)
        val header: Header = Mockito.mock(Header::class.java)
        Mockito.`when`(header.name).thenReturn("Retry-After")
        Mockito.`when`(header.value).thenReturn("1")
        Mockito.`when`(mockResponse!!.allHeaders).thenReturn(arrayOf(header))
        Mockito.doReturn(mockResponse).`when`(spyClient)!!.execute(Matchers.any(HttpUriRequest::class.java))
        try {
            stopwatch = Stopwatch.createStarted()
            val response: Future<ApiResponse<ApiClientConnectorResponse>> = apiClient!!.invokeAsync(connectorRequest, returnType, asyncApiCallBack)
            response.get()
        } catch (e: Exception) {
            Assert.assertEquals(429, (e.cause as ApiException?)!!.statusCode)
            Assert.assertTrue(stopwatch!!.elapsed(TimeUnit.MILLISECONDS) in 0..99, "Since maxWaitTime is 0 it will not retry even if status code is 429")
            stopwatch!!.stop()
        }
    }

    @Test
    @Throws(IOException::class)
    fun invokeAsyncTestWith_502() {
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
            val response: Future<ApiResponse<ApiClientConnectorResponse>> = apiClient!!.invokeAsync(connectorRequest, returnType, asyncApiCallBack)
            response.get()
        } catch (e: Exception) {
            Assert.assertEquals(502, (e.cause as ApiException?)!!.statusCode)
            Assert.assertTrue(stopwatch!!.elapsed(TimeUnit.MILLISECONDS) in 13000..13099, "It will wait for every 2 Sec and retry for 5 times then it will backoff for 3 sec and retry then it exits.")
            stopwatch!!.stop()
        }
    }

    @Test
    @Throws(IOException::class)
    fun invokeAsyncTestWith_503() {
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
            val response: Future<ApiResponse<ApiClientConnectorResponse>> = apiClient!!.invokeAsync(connectorRequest, returnType, asyncApiCallBack)
            response.get()
        } catch (e: Exception) {
            Assert.assertEquals(503, (e.cause as ApiException?)!!.statusCode)
            Assert.assertTrue(stopwatch!!.elapsed(TimeUnit.MILLISECONDS) in 40000..40099, "It will wait for every 200 Mills and retry for 5 times then it will backoff for 3 Sec once, 9 Sec once and 27 Sec before retrying")
            stopwatch!!.stop()
        }
    }

    @Test
    @Throws(IOException::class)
    fun invokeAsyncTestWith_504() {
        val retryConfiguration = RetryConfiguration()
        retryConfiguration.maxRetryTimeSec = 2
        retryConfiguration.retryAfterDefaultMs = 1000
        apiClient = getApiClient(retryConfiguration)
        mockResponse = getMockCloseableHttpResponse(504)
        Mockito.`when`(mockResponse!!.allHeaders).thenReturn(arrayOf())
        Mockito.doReturn(mockResponse).`when`(spyClient)!!.execute(Matchers.any(HttpUriRequest::class.java))
        try {
            stopwatch = Stopwatch.createStarted()
            val response: Future<ApiResponse<ApiClientConnectorResponse>> = apiClient!!.invokeAsync(connectorRequest, returnType, asyncApiCallBack)
            response.get()
        } catch (e: Exception) {
            Assert.assertEquals(504, (e.cause as ApiException?)!!.statusCode)
            Assert.assertTrue(stopwatch!!.elapsed(TimeUnit.MILLISECONDS) in 2000..2099, "It will wait for every 1 sec and retry for 2 times")
            stopwatch!!.stop()
        }
    }

    @Test
    @Throws(IOException::class)
    fun invokeAsyncTestWith_504_And_No_MaxRetryTime() {
        val retryConfiguration = RetryConfiguration()
        apiClient = getApiClient(retryConfiguration)
        mockResponse = getMockCloseableHttpResponse(504)
        Mockito.`when`(mockResponse!!.allHeaders).thenReturn(arrayOf())
        Mockito.doReturn(mockResponse).`when`(spyClient)!!.execute(Matchers.any(HttpUriRequest::class.java))
        try {
            stopwatch = Stopwatch.createStarted()
            val response: Future<ApiResponse<ApiClientConnectorResponse>> = apiClient!!.invokeAsync(connectorRequest, returnType, asyncApiCallBack)
            response.get()
        } catch (e: Exception) {
            Assert.assertEquals(504, (e.cause as ApiException?)!!.statusCode)
            Assert.assertTrue(stopwatch!!.elapsed(TimeUnit.MILLISECONDS) in 0..99, "Since maxRetryTime is not provided it will not retry even if the status code is 504")
            stopwatch!!.stop()
        }
    }

    private val asyncApiCallBack: AsyncApiCallback<ApiResponse<ApiClientConnectorResponse>>
        get() = object : AsyncApiCallback<ApiResponse<ApiClientConnectorResponse>> {
            override fun onCompleted(response: ApiResponse<ApiClientConnectorResponse>) {}
            override fun onFailed(exception: Throwable) {}
        }

    private fun getMockCloseableHttpResponse(statusCode: Int): CloseableHttpResponse {
        val mockCloseableHttpResponse: CloseableHttpResponse = Mockito.mock(CloseableHttpResponse::class.java)
        Mockito.`when`(mockCloseableHttpResponse.statusLine).thenReturn(BasicStatusLine(ProtocolVersion("HTTP/1.1", 1, 1), statusCode, "Not Okay"))
        return mockCloseableHttpResponse
    }

    private fun getApiClient(retryConfiguration: RetryConfiguration): ApiClient? {
        region = getEnvironment()
        if (region == null) {
            useenum = false
        }
        try {
            var builder: ApiClient.Builder = ApiClient.Builder.standard()
            builder = if (useenum) {
                builder.withBasePath((region)!!)
            } else {
                builder.withBasePath("https://api.$environment")
            }
            builder = builder.withProperty(ApiClientConnectorProperty.CONNECTOR_PROVIDER, connector)
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

    private val returnType: TypeReference<ApiClientConnectorResponse>
        get() {
            return object : TypeReference<ApiClientConnectorResponse>() {}
        }

    private val connectorRequest: ApiRequest<*>
        get() {
            return object : ApiRequest<ApiClientConnectorRequest?> {
                override val path: String
                    get() {
                        return "/api/v2/users"
                    }

                override val method: String
                    get() {
                        return "GET"
                    }

                override val pathParams: Map<String, String>
                    get() {
                        return emptyMap()
                    }

                override val queryParams: List<Pair>
                    get() {
                        return emptyList()
                    }

                override val formParams: Map<String, Any>
                    get() {
                        return emptyMap()
                    }

                override val headerParams: Map<String, String>
                    get() {
                        return emptyMap()
                    }

                override val customHeaders: Map<String, String>
                    get() {
                        return emptyMap()
                    }

                override val contentType: String
                    get() {
                        return "application/json"
                    }

                override val accepts: String
                    get() {
                        return "application/json"
                    }

                override val body: ApiClientConnectorRequest?
                    get() {
                        return null
                    }

                override val authNames: Array<String?>
                    get() {
                        return arrayOf("PureCloud OAuth")
                    }
            }
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
