package com.gorilas.StellarShift

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class WallpaperModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "WallpaperModule"

    @ReactMethod
    fun startRotation(
        poolJson: String,
        intervalMinutes: Int,
        target: String,
        wifiOnly: Boolean,
        chargingOnly: Boolean,
        promise: Promise
    ) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("WallpaperPrefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("photoPool", poolJson)
                .putInt("poolIndex", 0)
                .putString("target", target)
                .putInt("intervalMinutes", intervalMinutes)
                .putBoolean("wifiOnly", wifiOnly)
                .putBoolean("chargingOnly", chargingOnly)
                .apply()

            WallpaperWorker.schedule(reactApplicationContext, intervalMinutes, wifiOnly, chargingOnly)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("START_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopRotation(promise: Promise) {
        try {
            WallpaperWorker.cancel(reactApplicationContext)
            val prefs = reactApplicationContext.getSharedPreferences("WallpaperPrefs", Context.MODE_PRIVATE)
            prefs.edit().putInt("intervalMinutes", 0).apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setFromUrl(url: String, target: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                WallpaperWorker.applyFromUrl(reactApplicationContext, url, target)
                withContext(Dispatchers.Main) { promise.resolve(true) }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { promise.reject("SET_ERROR", e.message, e) }
            }
        }
    }

    @ReactMethod
    fun isIgnoringBatteryOptimization(promise: Promise) {
        val pm = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
        promise.resolve(pm.isIgnoringBatteryOptimizations(reactApplicationContext.packageName))
    }

    @ReactMethod
    fun requestIgnoreBatteryOptimization(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:${reactApplicationContext.packageName}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("BATTERY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun changeNow(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val applied = WallpaperWorker.applyNext(reactApplicationContext)
                withContext(Dispatchers.Main) {
                    if (applied) {
                        promise.resolve(true)
                    } else {
                        promise.reject("EMPTY_POOL", "Пул фото порожній. Спочатку збережи налаштування.")
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("CHANGE_ERROR", e.message, e)
                }
            }
        }
    }
}
