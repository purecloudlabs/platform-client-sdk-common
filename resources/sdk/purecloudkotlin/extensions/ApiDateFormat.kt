package com.mypurecloud.sdk.v2

import java.text.*
import java.util.*

class ApiDateFormat : DateFormat() {
    var formatStrings: MutableList<String> = mutableListOf( // Standard ISO-8601 format used by PureCloud
            "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",  // Alternate format without ms
            "yyyy-MM-dd'T'HH:mm:ssXXX",  // Alternate format without timezone (API-2107)
            "yyyy-MM-dd'T'HH:mm:ss.SSS",  // Alternate format - date only (API-3286)
            "yyyy-MM-dd"
    )
    var formats: MutableList<SimpleDateFormat> = mutableListOf()
    override fun format(date: Date, toAppendTo: StringBuffer, fieldPosition: FieldPosition): StringBuffer {
        return formats[0].format(date, toAppendTo, fieldPosition)
    }

    override fun parse(source: String, pos: ParsePosition): Date? {
        for (format in formats) {
            try {
                val d = format.parse(source, pos)
                if (d != null) return d
            } catch (e: NullPointerException) {
            }
        }
        return null
    }

    override fun clone(): Any {
        val dateFormat: DateFormat = ApiDateFormat()
        dateFormat.timeZone = this.timeZone
        return dateFormat
    }

    override fun setTimeZone(zone: TimeZone) { // Set this
        calendar.timeZone = zone
        // Set each format
        for (format in formats) {
            format.timeZone = zone
        }
    }

    init {
        setCalendar(Calendar.getInstance(TimeZone.getTimeZone("UTC")))
        setNumberFormat(NumberFormat.getInstance())
        // Initialize formats
        for (formatString in formatStrings) {
            val format = SimpleDateFormat(formatString)
            format.timeZone = TimeZone.getTimeZone("UTC")
            formats.add(format)
        }
    }
}
