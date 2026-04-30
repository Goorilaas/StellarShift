package com.gorilas.StellarShift

import android.app.WallpaperManager
import android.content.Context
import android.graphics.BitmapFactory
import android.graphics.Rect
import android.os.Build
import androidx.work.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

class WallpaperWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            val applied = applyNext(applicationContext)
            if (applied) Result.success() else Result.success() // empty pool is not an error
        } catch (e: Exception) {
            if (runAttemptCount < 2) Result.retry() else Result.failure()
        }
    }

    companion object {
        const val WORK_TAG = "WallpaperRotation"

        /**
         * Fire Unsplash download-tracking ping (required by API ToS for "use" events).
         * Fire-and-forget: failures must not break wallpaper-set flow.
         */
        private fun trackUnsplashDownload(context: Context, downloadLocation: String?) {
            if (downloadLocation.isNullOrBlank()) return
            try {
                val prefs = context.getSharedPreferences("WallpaperPrefs", Context.MODE_PRIVATE)
                val key = prefs.getString("unsplashKey", null) ?: return
                val conn = URL(downloadLocation).openConnection() as HttpURLConnection
                conn.connectTimeout = 8_000
                conn.readTimeout = 8_000
                conn.setRequestProperty("Authorization", "Client-ID $key")
                conn.connect()
                conn.inputStream.close()
                conn.disconnect()
            } catch (_: Exception) {
                // Tracking failure must be silent.
            }
        }

        suspend fun applyFromUrl(context: Context, url: String, target: String) {
            withContext(Dispatchers.IO) {
                val conn = URL(url).openConnection() as HttpURLConnection
                conn.connectTimeout = 15_000
                conn.readTimeout = 15_000
                val original = BitmapFactory.decodeStream(conn.inputStream)
                conn.disconnect()

                // Pass original bitmap directly — let WallpaperManager handle scaling
                // Manual resize caused over-cropping on Samsung due to launcher parallax
                val cropHint = Rect(0, 0, original.width, original.height)
                val wm = WallpaperManager.getInstance(context)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    val flag = when (target) {
                        "home" -> WallpaperManager.FLAG_SYSTEM
                        "lock" -> WallpaperManager.FLAG_LOCK
                        else -> WallpaperManager.FLAG_SYSTEM or WallpaperManager.FLAG_LOCK
                    }
                    wm.setBitmap(original, cropHint, true, flag)
                } else {
                    wm.setBitmap(original, cropHint, true)
                }
            }
        }

        suspend fun applyNext(context: Context): Boolean {
            val prefs = context.getSharedPreferences("WallpaperPrefs", Context.MODE_PRIVATE)
            val poolJson = prefs.getString("photoPool", null) ?: return false
            val target = prefs.getString("target", "both") ?: "both"

            val pool = JSONArray(poolJson)
            if (pool.length() == 0) return false

            val index = prefs.getInt("poolIndex", 0)
            val item = pool.getJSONObject(index % pool.length())
            val url = item.getString("url")
            val downloadLocation = item.optString("downloadLocation", "").takeIf { it.isNotBlank() }

            applyFromUrl(context, url, target)
            // Fire Unsplash download-tracking after successful apply.
            trackUnsplashDownload(context, downloadLocation)
            prefs.edit().putInt("poolIndex", (index + 1) % pool.length()).apply()
            return true
        }

        fun schedule(context: Context, intervalMinutes: Int, wifiOnly: Boolean, chargingOnly: Boolean) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(if (wifiOnly) NetworkType.UNMETERED else NetworkType.CONNECTED)
                .apply { if (chargingOnly) setRequiresCharging(true) }
                .build()

            val request = PeriodicWorkRequestBuilder<WallpaperWorker>(
                maxOf(intervalMinutes.toLong(), 15L), TimeUnit.MINUTES,
                5L, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .addTag(WORK_TAG)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_TAG,
                ExistingPeriodicWorkPolicy.CANCEL_AND_REENQUEUE,
                request
            )
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelAllWorkByTag(WORK_TAG)
        }
    }
}
