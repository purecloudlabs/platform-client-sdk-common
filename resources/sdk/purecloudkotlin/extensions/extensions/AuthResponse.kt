package com.mypurecloud.sdk.v2.extensions

import java.io.Serializable

class AuthResponse : Serializable {
    var access_token: String? = null
    var token_type: String? = null
    var expires_in = 0
    var error: String? = null

    override fun toString(): String {
        return "[AuthResponse]\n" +
                "  access_token=" + access_token + "\n" +
                "  token_type=" + token_type + "\n" +
                "  expires_in=" + expires_in + "\n" +
                "  error=" + error + "\n"
    }
}
