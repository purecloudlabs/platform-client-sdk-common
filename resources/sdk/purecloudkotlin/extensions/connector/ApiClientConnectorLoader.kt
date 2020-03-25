package com.mypurecloud.sdk.v2.connector

import com.mypurecloud.sdk.v2.connector.apache.ApacheHttpClientConnectorProvider
import java.util.*

object ApiClientConnectorLoader {
    fun load(properties: ApiClientConnectorProperties): ApiClientConnector? {
        var connector = loadFromProperties(properties)
        if (connector != null) {
            return connector
        }
        connector = loadFromServiceLoader(properties)
        return connector ?: ApacheHttpClientConnectorProvider().create(properties)
    }

    private fun loadFromProperties(properties: ApiClientConnectorProperties): ApiClientConnector? {
        var connectorProviderProperty: Any? = properties.getProperty(ApiClientConnectorProperty.CONNECTOR_PROVIDER, Any::class.java, null)
                ?: return null
        if (connectorProviderProperty is ApiClientConnector) {
            return connectorProviderProperty
        }
        if (connectorProviderProperty is ApiClientConnectorProvider) {
            return connectorProviderProperty.create(properties)
        }
        if (connectorProviderProperty is String) {
            val connectorProviderClassName = connectorProviderProperty
            connectorProviderProperty = try {
                Class.forName(connectorProviderClassName)
            } catch (exception: ClassNotFoundException) {
                throw RuntimeException("Unable to load ApiClientConnectorProvider from class name \"$connectorProviderClassName\".", exception)
            }
        }
        if (connectorProviderProperty is Class<*>) {
            val connectorProviderClass = connectorProviderProperty
            return if (ApiClientConnectorProvider::class.java.isAssignableFrom(connectorProviderClass)) {
                try {
                    val provider = connectorProviderClass.newInstance() as ApiClientConnectorProvider
                    provider.create(properties)
                } catch (exception: IllegalAccessException) {
                    throw RuntimeException("Unable to load connector from class.", exception)
                } catch (exception: InstantiationException) {
                    throw RuntimeException("Unable to load connector from class.", exception)
                }
            } else {
                throw RuntimeException("Unable to load ApiClientConnectorProvider from class \"" + connectorProviderClass.name + "\", it does not implement the required interface.")
            }
        }
        return null
    }

    private fun loadFromServiceLoader(properties: ApiClientConnectorProperties): ApiClientConnector? {
        val loader = ServiceLoader.load(ApiClientConnectorProvider::class.java)
        val iterator: Iterator<ApiClientConnectorProvider> = loader.iterator()
        if (iterator.hasNext()) {
            val provider = iterator.next()
            return provider.create(properties)
        }
        return null
    }
}
