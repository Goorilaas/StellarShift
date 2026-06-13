package com.gorilas.StellarShift

import android.content.ComponentName
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
    fun setUnsplashKey(key: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("WallpaperPrefs", Context.MODE_PRIVATE)
            prefs.edit().putString("unsplashKey", key).apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("KEY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isLiveWallpaperActive(promise: Promise) {
        promise.resolve(WallpaperWorker.isOurLiveWallpaper(reactApplicationContext))
    }

    // Інтенсивність tilt у px. Engine має listener на цей ключ → міняється наживо.
    @ReactMethod
    fun setLiveIntensity(px: Int, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("WallpaperPrefs", Context.MODE_PRIVATE)
            prefs.edit().putInt("lwIntensity", px).apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("LW_INTENSITY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun disableLiveWallpaper(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val ok = WallpaperWorker.disableLive(reactApplicationContext)
                withContext(Dispatchers.Main) { promise.resolve(ok) }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { promise.reject("LW_DISABLE_ERROR", e.message, e) }
            }
        }
    }

    // Системний preview нашої LW (один тап «Встановити»). Fallback — загальний chooser.
    @ReactMethod
    fun openLiveWallpaperPicker(promise: Promise) {
        try {
            val cn = ComponentName(reactApplicationContext, LiveWallpaperService::class.java)
            val intent = Intent(android.app.WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER).apply {
                putExtra(android.app.WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT, cn)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            try {
                val chooser = Intent(android.app.WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactApplicationContext.startActivity(chooser)
                promise.resolve(null)
            } catch (e2: Exception) {
                promise.reject("LW_PICKER_ERROR", e2.message, e2)
            }
        }
    }

    // Тихі години: вікно у хвилинах від півночі. Worker перевіряє перед кожним тіком.
    @ReactMethod
    fun setSleepHours(enabled: Boolean, startMin: Int, endMin: Int, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("WallpaperPrefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putBoolean("sleepEnabled", enabled)
                .putInt("sleepStart", startMin)
                .putInt("sleepEnd", endMin)
                .apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SLEEP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setNotificationsEnabled(enabled: Boolean, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("WallpaperPrefs", Context.MODE_PRIVATE)
            prefs.edit().putBoolean("notifyEnabled", enabled).apply()
            if (!enabled) NotificationHelper.cancel(reactApplicationContext)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("NOTIF_ERROR", e.message, e)
        }
    }

    // JS пише локалізовані рядки нотифікації — Kotlin не знає про i18next.
    @ReactMethod
    fun setNotificationStrings(title: String, fav: String, block: String, next: String, favDone: String, channelName: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("WallpaperPrefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("notifTitle", title)
                .putString("notifFav", fav)
                .putString("notifBlock", block)
                .putString("notifNext", next)
                .putString("notifFavDone", favDone)
                .putString("notifChannelName", channelName)
                .apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("NOTIF_ERROR", e.message, e)
        }
    }

    // Віддає {favorites:[{id,url}], blocked:[{id,url}]} і чистить обидва буфери.
    @ReactMethod
    fun drainPendingActions(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("WallpaperPrefs", Context.MODE_PRIVATE)
            val favorites = prefs.getString("pendingFavorites", "[]") ?: "[]"
            val blocked = prefs.getString("pendingBlocked", "[]") ?: "[]"
            prefs.edit().remove("pendingFavorites").remove("pendingBlocked").apply()
            promise.resolve("""{"favorites":$favorites,"blocked":$blocked}""")
        } catch (e: Exception) {
            promise.reject("ACTIONS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun drainPendingHistory(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("WallpaperPrefs", Context.MODE_PRIVATE)
            val pending = prefs.getString("pendingHistory", "[]") ?: "[]"
            prefs.edit().remove("pendingHistory").apply()
            promise.resolve(pending)
        } catch (e: Exception) {
            promise.reject("HISTORY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setFromUrl(url: String, target: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                // LW-aware: при активній живій шпалері пише файл (engine fade'ить),
                // інакше класичний static. Файл кешується в обох випадках.
                WallpaperWorker.applyWallpaper(reactApplicationContext, url, target)
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
                val applied = WallpaperWorker.applyNext(reactApplicationContext, manual = true)
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
