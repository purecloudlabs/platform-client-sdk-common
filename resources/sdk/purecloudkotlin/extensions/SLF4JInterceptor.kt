package com.mypurecloud.sdk.v2

import org.apache.http.*
import org.apache.http.entity.ByteArrayEntity
import org.apache.http.entity.ContentType
import org.apache.http.message.BasicRequestLine
import org.apache.http.protocol.HttpContext
import org.slf4j.LoggerFactory
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.io.InputStream
import java.util.*

/**
 *
 * A filter that logs both requests and responses to SLF4J.
 *
 * Available detail levels
 *
 *  * NONE - don't log anything
 *  * MINIMAL - only log the verb, url, and response code
 *  * HEADERS - as above, but also log all the headers for both the request and response
 *  * FULL - as above, but also log the full body for both the request and response
 */
class SLF4JInterceptor @JvmOverloads constructor(@field:Volatile var detailLevel: DetailLevel = DetailLevel.MINIMAL) : HttpRequestInterceptor, HttpResponseInterceptor {

    /**
     * The level of detail to log
     *
     *
     *  * NONE - don't log anything
     *  * MINIMAL - only log the verb, url, and response code
     *  * HEADERS - as above, but also log all the headers for both the request and response
     *  * FULL - as above, but also log the full body for both the request and response
     */
    enum class DetailLevel {
        NONE, MINIMAL, HEADERS, FULL
    }

    private class RequestData(val requestLine: RequestLine, val startTime: Long)

    @Throws(HttpException::class, IOException::class)
    override fun process(request: HttpRequest, context: HttpContext) {
        if (LOGGER.isDebugEnabled) {
            val requestData = RequestData(request.requestLine, System.currentTimeMillis())
            context.setAttribute(SLF4J_REQUEST_DATA, requestData)
            logRequest(request)
        }
    }

    @Throws(HttpException::class, IOException::class)
    override fun process(response: HttpResponse, context: HttpContext) {
        if (LOGGER.isDebugEnabled) {
            val requestLine: RequestLine
            val tookMs: Long
            val reqDataAttr = context.getAttribute(SLF4J_REQUEST_DATA)
            if (reqDataAttr == null || reqDataAttr !is RequestData) {
                LOGGER.error("Could not determine the request associated with this response")
                requestLine = BasicRequestLine("<UNKNOWN METHOD>", "<UNKNOWN URL>", null)
                tookMs = -1
            } else {
                requestLine = reqDataAttr.requestLine
                tookMs = System.currentTimeMillis() - reqDataAttr.startTime
            }
            logResponse(response, requestLine, tookMs)
        }
    }

    /**
     * Builds the log message for requests
     *
     *
     * >>>> GET http://api.example.com/endpoint >>>>
     * ---- HEADERS ----
     * Header-1: Value1
     * Header-2: Value2
     * ---- BODY (24-bytes) ----
     * Body body body body body
     * >>>> END >>>>
     *
     *
     * @param request - the request to build a message for
     */
    @Throws(IOException::class)
    private fun logRequest(request: HttpRequest) {
        if (detailLevel >= DetailLevel.MINIMAL) {
            val messageBuilder = StringBuilder()
            // Log the verb and url
            val uriString = String.format(">>>> %s %s >>>>", request.requestLine.method, request.requestLine.uri)
            messageBuilder.append(uriString).append(System.lineSeparator())
            // Add the headers
            if (detailLevel >= DetailLevel.HEADERS) {
                messageBuilder.append("---- HEADERS ----").append(System.lineSeparator())
                messageBuilder.append(formatHeaders(request.allHeaders))
                // Add the request body if it exists
                if (detailLevel >= DetailLevel.FULL) { // This is ugly, but it's the only way to access the body
                    if (request is HttpEntityEnclosingRequest &&
                            request.entity != null) {
                        val data = extractRequestBody(request)
                        messageBuilder.append(String.format("---- BODY (%d bytes) ----", data.size)).append(System.lineSeparator())
                        messageBuilder.append(String(data)).append(System.lineSeparator())
                    } else {
                        messageBuilder.append("---- NO BODY ----").append(System.lineSeparator())
                    }
                }
                messageBuilder.append(">>>> END >>>>").append(System.lineSeparator())
            }
            LOGGER.debug(messageBuilder.toString())
        }
    }

    /**
     * Builds the log message for responses
     *
     *
     * <<<< GET http://api.example.com/endpoint <<<<
     * 404 Not Found  (219 ms)
     * ---- HEADERS ----
     * Header-3: Value3
     * Header-4: Value4
     * ---- NO BODY ----
     * <<<< END <<<<
     *
     *
     * @param response - the response to build a message for
     * @param request - the request line of the initial request for the response
     * @param tookMs - how long the request took, in milliseconds
     */
    @Throws(IOException::class)
    private fun logResponse(response: HttpResponse, requestLine: RequestLine, tookMs: Long) {
        if (detailLevel >= DetailLevel.MINIMAL) {
            val messageBuilder = StringBuilder()
            // Log the verb and url, along with the status code
            val uriString = String.format("<<<< %s %s <<<<", requestLine.method, requestLine.uri)
            messageBuilder.append(uriString).append(System.lineSeparator())
            messageBuilder.append(String.format("     %d %s  (%d ms)",
                    response.statusLine.statusCode,
                    response.statusLine.reasonPhrase,
                    tookMs))
                    .append(System.lineSeparator())
            // Append the headers
            if (detailLevel >= DetailLevel.HEADERS) {
                messageBuilder.append("---- HEADERS ----").append(System.lineSeparator())
                messageBuilder.append(formatHeaders(response.allHeaders))
                // Add the response body if it exists
                if (detailLevel >= DetailLevel.FULL) { // Write the log message
                    if (response.entity != null) {
                        val responseBody = extractResponseBody(response)
                        messageBuilder.append(String.format("---- BODY (%d bytes) ----", responseBody.size)).append(System.lineSeparator())
                        messageBuilder.append(String(responseBody)).append(System.lineSeparator())
                    } else {
                        messageBuilder.append("---- NO BODY ----").append(System.lineSeparator())
                    }
                }
                messageBuilder.append("<<<< END <<<<").append(System.lineSeparator())
            }
            LOGGER.debug(messageBuilder.toString())
        }
    }

    private class HeaderComparator : Comparator<Header> {
        override fun compare(a: Header, b: Header): Int {
            return a.name.compareTo(b.name)
        }
    }

    companion object {
        private val LOGGER = LoggerFactory.getLogger(SLF4JInterceptor::class.java)
        // Attribute for tracking requests and responses
        private const val SLF4J_REQUEST_DATA = "slf4j-request-data"

        /**
         * Extracts the body of a request, resetting the stream if necessary so
         * that the request behaves as if it were unchanged
         *
         * @return the body of the response
         */
        @Throws(IOException::class)
        private fun extractRequestBody(request: HttpEntityEnclosingRequest): ByteArray {
            val data = toByteArray(request.entity.content)
            // Reset the response input stream if necessary
            if (!request.entity.isRepeatable) {
                request.entity = ByteArrayEntity(data, ContentType.get(request.entity))
            }
            return data
        }

        /**
         * Extracts the body of a response, resetting the stream if necessary so
         * that the response behaves as if it were unchanged
         *
         * @return the body of the response
         */
        @Throws(IOException::class)
        private fun extractResponseBody(response: HttpResponse): ByteArray {
            val data = toByteArray(response.entity.content)
            // Reset the response input stream if necessary
            if (!response.entity.isRepeatable) {
                response.entity = ByteArrayEntity(data, ContentType.get(response.entity))
            }
            return data
        }

        /**
         * Reads an input stream into a byte array, then closes the stream
         *
         * @return an array containing all of the data from the stream
         */
        @Throws(IOException::class)
        private fun toByteArray(response: InputStream): ByteArray {
            val BUFFER_SIZE = 2048 // How many bytes to copy at once
            // Clone the stream by reading it into a byte array
            val buffer = ByteArray(BUFFER_SIZE)
            val byteArrayStream = ByteArrayOutputStream()
            response.use { stream ->
                var read: Int
                while (stream.read(buffer).also { read = it } != -1) {
                    byteArrayStream.write(buffer, 0, read)
                }
                byteArrayStream.flush()
            }
            return byteArrayStream.toByteArray()
        }

        /**
         * Formats an array of headers into a human-readable format
         * @param headers - the headers
         * @return a string containing all of the headers
         */
        private fun formatHeaders(headers: Array<Header>): String {
            val sortedHeaders = listOf(*headers)
            Collections.sort(sortedHeaders, HeaderComparator())
            val sb = StringBuilder()
            for (header in sortedHeaders) {
                val headerString = String.format("%s: %s", header.name, header.value)
                sb.append(headerString).append(System.lineSeparator())
            }
            return sb.toString()
        }
    }

}
