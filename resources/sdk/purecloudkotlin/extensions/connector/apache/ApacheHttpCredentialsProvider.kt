package com.mypurecloud.sdk.v2.connector.apache

import org.apache.http.auth.AuthScope
import org.apache.http.auth.Credentials
import org.apache.http.client.CredentialsProvider
import java.security.Principal
import java.util.*

class ApacheHttpCredentialsProvider(hostname: String?, port: Int, user: String, pass: String) : CredentialsProvider {
    private val map = HashMap<String, Credentials>()
    override fun setCredentials(authScope: AuthScope, credentials: Credentials) {
        map[authDescription(authScope)] = credentials
    }

    override fun getCredentials(authScope: AuthScope): Credentials {
        return map[authDescription(authScope)]!!
    }

    override fun clear() {
        map.clear()
    }

    private fun authDescription(authScope: AuthScope): String {
        return authScope.host + ":" + authScope.port
    }

    private inner class CredentialsWrapper(private val principal: Principal, private val pass: String) : Credentials {
        override fun getUserPrincipal(): Principal {
            return principal
        }

        override fun getPassword(): String {
            return pass
        }

    }

    private inner class PrincipalWrapper(private val name: String) : Principal {
        override fun getName(): String {
            return name
        }

    }

    init {
        val principalWrapper = PrincipalWrapper(user)
        setCredentials(AuthScope(hostname, port), CredentialsWrapper(principalWrapper, pass))
    }
}
