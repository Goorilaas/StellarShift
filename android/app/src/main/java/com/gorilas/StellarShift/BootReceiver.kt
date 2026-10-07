package com.gorilas.StellarShift

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_TIMEZONE_CHANGED || intent.action == Intent.ACTION_TIME_CHANGED) {
            MorningMixWorker.schedule(context, reset = true)
            return
        }
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        MorningMixWorker.schedule(context)

        val prefs = context.getSharedPreferences("WallpaperPrefs", Context.MODE_PRIVATE)
        val intervalMinutes = prefs.getInt("intervalMinutes", 0)
        val pool = prefs.getString("photoPool", null)

        if (intervalMinutes > 0 && !pool.isNullOrEmpty()) {
            val wifiOnly = prefs.getBoolean("wifiOnly", true)
            val chargingOnly = prefs.getBoolean("chargingOnly", false)
            WallpaperWorker.schedule(context, intervalMinutes, wifiOnly, chargingOnly)
        }
    }
}
