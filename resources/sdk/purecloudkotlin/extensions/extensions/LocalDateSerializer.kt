package com.mypurecloud.sdk.v2

import com.fasterxml.jackson.core.JsonGenerator
import com.fasterxml.jackson.databind.SerializerProvider
import com.fasterxml.jackson.databind.ser.std.StdSerializer
import java.io.IOException
import org.threeten.bp.LocalDate

class LocalDateSerializer @JvmOverloads constructor(t: Class<LocalDate?>? = null) : StdSerializer<LocalDate>(t) {
    @Throws(IOException::class)
    override fun serialize(
            value: LocalDate, jgen: JsonGenerator, provider: SerializerProvider) {
        jgen.writeString(value.toString())
    }
}
