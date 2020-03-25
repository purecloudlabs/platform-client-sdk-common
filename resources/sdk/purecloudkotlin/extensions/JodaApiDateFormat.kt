package com.mypurecloud.sdk.v2

import com.google.common.collect.Lists
import org.joda.time.LocalDateTime
import org.joda.time.format.DateTimeFormat
import org.joda.time.format.DateTimeFormatter
import org.joda.time.format.DateTimeFormatterBuilder
import org.joda.time.format.ISODateTimeFormat
import java.text.DateFormat
import java.text.FieldPosition
import java.text.NumberFormat
import java.text.ParsePosition
import java.util.*

class JodaApiDateFormat : DateFormat() {
    private val formats: List<DateTimeFormatter>
    private val printer = DateTimeFormatterBuilder()
            .append(ISODateTimeFormat.dateTime())
            .toPrinter()

    override fun format(date: Date, toAppendTo: StringBuffer, fieldPosition: FieldPosition): StringBuffer {
        var appendTo: StringBuffer? = toAppendTo
        if (appendTo == null) {
            appendTo = StringBuffer(printer.estimatePrintedLength())
        }
        printer.printTo(appendTo, LocalDateTime(date), Locale.US)
        return appendTo
    }

    override fun parse(source: String, pos: ParsePosition): Date? {
        for (format in formats) {
            try {
                val date = format.parseDateTime(source)
                if (date != null) {
                    pos.index = source.length - 1
                    return date.toDate()
                }
            } catch (e: Exception) { // no-op
            }
        }
        return null
    }

    init {
        setCalendar(Calendar.getInstance(TimeZone.getTimeZone("UTC")))
        setNumberFormat(NumberFormat.getInstance())
        formats = Lists.newArrayList(
                ISODateTimeFormat.dateTime(),
                DateTimeFormat.forPattern("yyyy-MM-dd'T'HH:mm:ssZ"),
                DateTimeFormat.forPattern("yyyy-MM-dd'T'HH:mm:ss.SSS")
        )
    }
}
