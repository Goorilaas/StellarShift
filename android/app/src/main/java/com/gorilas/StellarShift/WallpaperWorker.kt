package com.gorilas.StellarShift

import android.app.WallpaperManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Rect
import android.os.Build
import androidx.work.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
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

        /**
         * Вимикає нашу живу шпалеру: ставить статичну версію поточного фото з кешу
         * (wm.setBitmap витісняє live назад у static — тут це навмисно). Без файлу —
         * системна дефолтна. Автозміна продовжить працювати на статиці.
         */
        fun disableLive(context: Context): Boolean = try {
            val prefs = context.getSharedPreferences("WallpaperPrefs", Context.MODE_PRIVATE)
            val target = prefs.getString("target", "both") ?: "both"
            val f = File(context.filesDir, NotificationHelper.CURRENT_FILE)
            val bmp = if (f.exists()) BitmapFactory.decodeFile(f.absolutePath) else null
            if (bmp != null) {
                applyStatic(context, bmp, target)
            } else {
                WallpaperManager.getInstance(context).clear()
            }
            true
        } catch (_: Exception) {
            false
        }

        /** Наша жива шпалера зараз активна? (інша LW чужого пакета → false) */
        fun isOurLiveWallpaper(context: Context): Boolean = try {
            WallpaperManager.getInstance(context).wallpaperInfo?.packageName == context.packageName
        } catch (_: Exception) {
            false
        }

        private suspend fun downloadBitmap(url: String): Bitmap = withContext(Dispatchers.IO) {
            val conn = URL(url).openConnection() as HttpURLConnection
            conn.connectTimeout = 15_000
            conn.readTimeout = 15_000
            val bmp = BitmapFactory.decodeStream(conn.inputStream)
            conn.disconnect()
            bmp
        }

        private fun applyStatic(context: Context, bitmap: Bitmap, target: String) {
            // Pass original bitmap directly — let WallpaperManager handle scaling
            // Manual resize caused over-cropping on Samsung due to launcher parallax
            val cropHint = Rect(0, 0, bitmap.width, bitmap.height)
            val wm = WallpaperManager.getInstance(context)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                val flag = when (target) {
                    "home" -> WallpaperManager.FLAG_SYSTEM
                    "lock" -> WallpaperManager.FLAG_LOCK
                    else -> WallpaperManager.FLAG_SYSTEM or WallpaperManager.FLAG_LOCK
                }
                wm.setBitmap(bitmap, cropHint, true, flag)
            } else {
                wm.setBitmap(bitmap, cropHint, true)
            }
        }

        /**
         * Локскрін при активній LW: якщо в системі живе ОКРЕМИЙ static-lock
         * (getWallpaperId(FLAG_LOCK) != -1) і target його включає — оновлюємо.
         * Якщо lock дзеркалить системну шпалеру — LW і так показується там,
         * setBitmap зламав би це дзеркало.
         */
        private fun applyLockIfSeparate(context: Context, bitmap: Bitmap, target: String) {
            if (target == "home") return
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return
            try {
                val wm = WallpaperManager.getInstance(context)
                if (wm.getWallpaperId(WallpaperManager.FLAG_LOCK) != -1) {
                    val cropHint = Rect(0, 0, bitmap.width, bitmap.height)
                    wm.setBitmap(bitmap, cropHint, true, WallpaperManager.FLAG_LOCK)
                }
            } catch (_: Exception) { }
        }

        /**
         * Єдиний шлях застосування для тіків І ручних встановлень.
         * LW активна → wm.setBitmap НЕ викликаємо (вибив би живу шпалеру в static!)
         * — пишемо файл, engine підхоплює з fade; lock — окремо за станом системи.
         * LW неактивна → класичний static-шлях. Файл пишеться в ОБОХ випадках —
         * він джерело і для LW, і для мітки 💜 у шторці.
         */
        suspend fun applyWallpaper(context: Context, url: String, target: String): Bitmap {
            val bitmap = downloadBitmap(url)
            if (isOurLiveWallpaper(context)) {
                applyLockIfSeparate(context, bitmap, target)
            } else {
                applyStatic(context, bitmap, target)
            }
            NotificationHelper.saveCurrentToFile(context, bitmap)
            return bitmap
        }

        /**
         * Тихі години: true якщо «зараз» у вікні сну. Вікно в хвилинах від півночі.
         * start < end → звичайне вікно (13:00–15:00); start > end → через північ
         * (23:00–07:00); start == end → нульове, не діє. Час — локальний на момент
         * виклику, тож зміна таймзони сама себе лікує.
         */
        private fun isInSleepWindow(prefs: android.content.SharedPreferences): Boolean {
            if (!prefs.getBoolean("sleepEnabled", false)) return false
            val start = prefs.getInt("sleepStart", 0)
            val end = prefs.getInt("sleepEnd", 420)
            if (start == end) return false
            val cal = java.util.Calendar.getInstance()
            val now = cal.get(java.util.Calendar.HOUR_OF_DAY) * 60 + cal.get(java.util.Calendar.MINUTE)
            return if (start < end) now in start until end else now >= start || now < end
        }

        /**
         * @param manual true для явних дій юзера («Змінити зараз», ⏭/🚫 з шторки) —
         * вони працюють і в тихі години; спить тільки плановий тік.
         */
        suspend fun applyNext(context: Context, manual: Boolean = false): Boolean {
            val prefs = context.getSharedPreferences("WallpaperPrefs", Context.MODE_PRIVATE)
            if (!manual && isInSleepWindow(prefs)) return true // тихий skip, не помилка
            val poolJson = prefs.getString("photoPool", null) ?: return false
            val target = prefs.getString("target", "both") ?: "both"

            val pool = JSONArray(poolJson)
            if (pool.length() == 0) return false

            val index = prefs.getInt("poolIndex", 0)
            val item = pool.getJSONObject(index % pool.length())
            val id = item.getString("id")
            val url = item.getString("url")
            val downloadLocation = item.optString("downloadLocation", "").takeIf { it.isNotBlank() }

            val bitmap = applyWallpaper(context, url, target)
            // Fire Unsplash download-tracking after successful apply.
            trackUnsplashDownload(context, downloadLocation)
            appendPendingHistory(prefs, id, url, target)
            prefs.edit().putInt("poolIndex", (index + 1) % pool.length()).apply()
            // Нотифікація-компаньйон (no-op якщо toggle off / нема дозволу);
            // файл уже закешований усередині applyWallpaper.
            NotificationHelper.showApplied(context, bitmap, id, url)
            return true
        }

        /**
         * Буфер історії для JS: кожен apply (WorkManager-тік або changeNow) дописує
         * запис; Settings забирає через WallpaperModule.drainPendingHistory().
         * Ліміт 30 — захист на випадок, якщо застосунок довго не відкривали.
         * Помилка тут не повинна ламати apply — мовчазний catch.
         */
        private fun appendPendingHistory(
            prefs: android.content.SharedPreferences,
            id: String,
            url: String,
            target: String
        ) {
            try {
                val arr = JSONArray(prefs.getString("pendingHistory", "[]"))
                arr.put(
                    JSONObject()
                        .put("id", id)
                        .put("url", url)
                        .put("target", target)
                        .put("appliedAt", System.currentTimeMillis())
                )
                val trimmed = if (arr.length() > 30) {
                    JSONArray().also { t ->
                        for (i in arr.length() - 30 until arr.length()) t.put(arr.get(i))
                    }
                } else arr
                prefs.edit().putString("pendingHistory", trimmed.toString()).apply()
            } catch (_: Exception) {
                // історія — best effort
            }
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
