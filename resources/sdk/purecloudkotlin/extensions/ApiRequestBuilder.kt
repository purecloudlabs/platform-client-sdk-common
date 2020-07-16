package com.mypurecloud.sdk.v2

import java.io.UnsupportedEncodingException
import java.net.URLEncoder
import java.text.DateFormat
import java.util.*

class ApiRequestBuilder<T> {
    private val method: String
    private val path: String
    private val pathParams: MutableMap<String, String>
    private val formParams: MutableMap<String, Any>
    private val queryParams: MutableList<Pair>
    private val headerParams: MutableMap<String, String>
    private val customHeaders: MutableMap<String, String>
    private var contentTypes: Array<String?> = EMPTY
    private var accepts: Array<String?> = EMPTY
    private var body: T? = null
    private var authNames = EMPTY

    private constructor(method: String, path: String) {
        this.method = method
        this.path = path
        pathParams = mutableMapOf()
        formParams = mutableMapOf()
        queryParams = mutableListOf()
        headerParams = mutableMapOf()
        customHeaders = mutableMapOf()
    }

    private constructor(parent: ApiRequestBuilder<*>, body: T) {
        method = parent.method
        path = parent.path
        pathParams = parent.pathParams
        formParams = parent.formParams
        queryParams = parent.queryParams
        headerParams = parent.headerParams
        customHeaders = parent.customHeaders
        contentTypes = parent.contentTypes
        accepts = parent.accepts
        this.body = body
        authNames = parent.authNames
    }

    fun getMethodHelper() : String {
        return method
    }

    fun getPathHelper() : String {
        return path
    }

    fun withPathParameter(name: String, value: Any?): ApiRequestBuilder<T> {
        if (value != null) {
            pathParams[name] = escapeString(value.toString())
        } else {
            pathParams.remove(name)
        }
        return this
    }

    fun withFormParameter(name: String, value: Any): ApiRequestBuilder<T> {
        formParams[name] = value
        return this
    }

    fun withQueryParameters(name: String?, collectionFormat: String, value: Any?): ApiRequestBuilder<T> {
        queryParams.addAll(parameterToPairs(collectionFormat, name, value))
        return this
    }

    fun withHeaderParameter(name: String, value: Any?): ApiRequestBuilder<T> {
        if (value != null) {
            headerParams[name] = parameterToString(value)
        } else {
            headerParams.remove(name)
        }
        return this
    }

    fun withCustomHeader(name: String, value: String?): ApiRequestBuilder<T> {
        if (value != null) {
            customHeaders[name] = value
        } else {
            customHeaders.remove(name)
        }
        return this
    }

    fun withCustomHeaders(headers: Map<String, String>?): ApiRequestBuilder<T> {
        if (headers != null) {
            customHeaders.putAll(headers)
        }
        return this
    }

    fun withContentTypes(vararg contentTypes: String?): ApiRequestBuilder<T> {
        @Suppress("UNCHECKED_CAST")
        this.contentTypes = contentTypes as Array<String?>? ?: EMPTY
        return this
    }

    fun withAccepts(vararg accepts: String?): ApiRequestBuilder<T> {
        @Suppress("UNCHECKED_CAST")
        this.accepts = accepts as Array<String?>? ?: EMPTY
        return this
    }

    fun withAuthNames(vararg authNames: String?): ApiRequestBuilder<T> {
        @Suppress("UNCHECKED_CAST")
        this.authNames = authNames as Array<String?>? ?: EMPTY
        return this
    }

    fun <BODY> withBody(body: BODY): ApiRequestBuilder<BODY> {
        return ApiRequestBuilder(this, body)
    }

    fun build(): ApiRequest<T> {
        val pathParams = Collections.unmodifiableMap(pathParams)
        val formParams = Collections.unmodifiableMap(formParams)
        val queryParams = Collections.unmodifiableList(queryParams)
        val headerParams = Collections.unmodifiableMap(headerParams)
        val customHeaders = Collections.unmodifiableMap(customHeaders)
        val contentType = selectHeaderContentType(contentTypes)
        val accepts = selectHeaderAccept(accepts)
        val body: T? = body
        val authNames = authNames
        return object : ApiRequest<T> {
            override val path: String
                get() = getPathHelper()

            override val method: String
                get() = getMethodHelper()

            override val pathParams: Map<String, String>
                get() = pathParams

            override val queryParams: List<Pair>
                get() = queryParams

            override val formParams: Map<String, Any>
                get() = formParams

            override val headerParams: Map<String, String>
                get() = headerParams

            override val customHeaders: Map<String, String>
                get() = customHeaders

            override val contentType: String?
                get() = contentType

            override val accepts: String?
                get() = accepts

            override val body: T
                @Suppress("UNCHECKED_CAST")
                get() = body as T

            override val authNames: Array<String?>
                get() = authNames

            override fun toString(): String {
                return "ApiRequest { $method $path }"
            }
        }
    }

    companion object {
        private var DATE_FORMAT: ThreadLocal<DateFormat>? = null
        private val EMPTY = arrayOfNulls<String>(0)
        private var initialDateFormat: DateFormat? = null

        private fun initializeDateFormat(dateFormat: DateFormat) {
            initialDateFormat = dateFormat
        }

        var dateFormat: DateFormat?
            get() {
                // Lazy load ApiDateFormat
                synchronized(EMPTY) {
                    // Initialize the source date format object
                    if (initialDateFormat == null) {
                        val dateFormat: DateFormat = ApiDateFormat()
                        dateFormat.timeZone = TimeZone.getTimeZone("UTC")
                        initializeDateFormat(dateFormat)
                    }
                    // Ensure date format object has a value
                    if (DATE_FORMAT == null) {
                        dateFormat = null
                    }
                }
                // Return an instance for the calling thread
                return DATE_FORMAT!!.get()
            }
            set(dateFormat) { // Set initial date format object
                dateFormat?.let { initializeDateFormat(it) }
                DATE_FORMAT = object : ThreadLocal<DateFormat>() {
                    override fun initialValue(): DateFormat? {
                        return initialDateFormat
                    }
                }
            }

        /**
         * Format the given Date object into string.
         */
        fun formatDate(date: Date?): String {
            return dateFormat!!.format(date)
        }

        /**
         * Format the given parameter object into string.
         */
        private fun parameterToString(param: Any?): String {
            return when (param) {
                null -> {
                    ""
                }
                is Date -> {
                    formatDate(param as Date?)
                }
                is Collection<*> -> {
                    val b = StringBuilder()
                    for (o in param) {
                        if (b.isNotEmpty()) {
                            b.append(",")
                        }
                        b.append(o.toString())
                    }
                    b.toString()
                }
                else -> {
                    param.toString()
                }
            }
        }

        /*
        * Format to {@code Pair} objects.
        */
        private fun parameterToPairs(collectionFormat: String, name: String?, value: Any?): List<Pair> {
            var myCollectionFormat: String? = collectionFormat
            val params: MutableList<Pair> = mutableListOf()
            // preconditions
            if (name == null || name.isEmpty() || value == null) return params
            val valueCollection: Collection<*>?
            valueCollection = if (value is Collection<*>) {
                value
            } else {
                params.add(Pair(name, parameterToString(value)))
                return params
            }
            if (valueCollection.isEmpty()) {
                return params
            }
            // get the collection format
            myCollectionFormat = if (myCollectionFormat == null || myCollectionFormat.isEmpty()) "csv" else myCollectionFormat // default: csv
            // create the params based on the collection format
            if (myCollectionFormat == "multi") {
                for (item in valueCollection) {
                    params.add(Pair(name, parameterToString(item)))
                }
                return params
            }
            var delimiter = ","
            when (myCollectionFormat) {
                "csv" -> {
                    delimiter = ","
                }
                "ssv" -> {
                    delimiter = " "
                }
                "tsv" -> {
                    delimiter = "\t"
                }
                "pipes" -> {
                    delimiter = "|"
                }
            }
            val sb = StringBuilder()
            for (item in valueCollection) {
                sb.append(delimiter)
                sb.append(parameterToString(item))
            }
            params.add(Pair(name, sb.substring(1)))
            return params
        }

        /**
         * Check if the given MIME is a JSON MIME.
         * JSON MIME examples:
         * application/json
         * application/json; charset=UTF8
         * APPLICATION/JSON
         */
        private fun isJsonMime(mime: String?): Boolean {
            return mime != null && mime.matches(Regex("(?i)application\\/json(;.*)?"))
        }

        /**
         * Select the Accept header's value from the given accepts array:
         * if JSON exists in the given array, use it;
         * otherwise use all of them (joining into a string)
         *
         * @param accepts The accepts array to select from
         * @return The Accept header to use. If the given array is empty,
         * null will be returned (not to set the Accept header explicitly).
         */
        private fun selectHeaderAccept(accepts: Array<String?>): String? {
            if (accepts.isEmpty()) {
                return null
            }
            for (accept in accepts) {
                if (isJsonMime(accept)) {
                    return accept
                }
            }
            return StringUtil.join(accepts, ",")
        }

        /**
         * Select the Content-Type header's value from the given array:
         * if JSON exists in the given array, use it;
         * otherwise use the first one of the array.
         *
         * @param contentTypes The Content-Type array to select from
         * @return The Content-Type header to use. If the given array is empty,
         * JSON will be used.
         */
        private fun selectHeaderContentType(contentTypes: Array<String?>): String? {
            if (contentTypes.isEmpty()) {
                return "application/json"
            }
            for (contentType in contentTypes) {
                if (isJsonMime(contentType)) {
                    return contentType
                }
            }
            return contentTypes[0]
        }

        /**
         * Escape the given string to be used as URL query value.
         */
        private fun escapeString(str: String): String {
            return try {
                URLEncoder.encode(str, "utf8").replace("\\+".toRegex(), "%20")
            } catch (e: UnsupportedEncodingException) {
                str
            }
        }

        fun create(method: String, path: String): ApiRequestBuilder<Void> {
            return ApiRequestBuilder(method, path)
        }
    }
}
