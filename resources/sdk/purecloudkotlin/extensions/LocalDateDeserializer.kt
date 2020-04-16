package com.mypurecloud.sdk.v2

import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.databind.DeserializationContext
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.deser.std.StdDeserializer
import java.io.IOException
import org.threeten.bp.LocalDate

class LocalDateDeserializer @JvmOverloads constructor(t: Class<*>? = null) : StdDeserializer<LocalDate>(t) {
    @Throws(IOException::class)
    override fun deserialize(jp: JsonParser, ctxt: DeserializationContext): LocalDate {
        val node = jp.codec.readTree<JsonNode>(jp)
        val text = node.asText()
        return LocalDate.parse(text)
    }
}
