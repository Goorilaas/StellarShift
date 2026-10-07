package com.gorilas.StellarShift

import java.util.Calendar
import java.util.TimeZone

internal object MorningMixSchedule {
    fun day(now: Long, zone: TimeZone = TimeZone.getDefault()): String {
        val c = Calendar.getInstance(zone).apply { timeInMillis = now }
        return "${c.get(Calendar.YEAR)}-${c.get(Calendar.MONTH) + 1}-${c.get(Calendar.DAY_OF_MONTH)}"
    }
    fun morning(now: Long, zone: TimeZone = TimeZone.getDefault()): Long =
        Calendar.getInstance(zone).apply {
            timeInMillis = now; set(Calendar.HOUR_OF_DAY, 7); set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
        }.timeInMillis

    fun due(now: Long, lastDay: String?, retryAfter: Long, zone: TimeZone = TimeZone.getDefault()): Boolean =
        now >= morning(now, zone) && lastDay != day(now, zone) && now >= retryAfter

    fun initialDelay(now: Long, zone: TimeZone = TimeZone.getDefault()): Long {
        val c = Calendar.getInstance(zone).apply { timeInMillis = morning(now, zone) }
        if (c.timeInMillis <= now) c.add(Calendar.DAY_OF_MONTH, 1)
        return c.timeInMillis - now
    }
}
