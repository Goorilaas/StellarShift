package com.gorilas.StellarShift

import android.app.WallpaperManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Rect
import android.os.Build
import androidx.work.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
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
            // Щоденний перезбір пулу (тільки плановий тік): свіжий контент + нова
            // ротація під-запитів без відкриття застосунку. Swap-on-success.
            if (!manual) maybeRebuildPool(context, prefs)
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

        // ── Щоденний перезбір пулу (фоновий, за «рецептом» від JS) ──────────────
        private const val POOL_TTL_MS = 24L * 60 * 60 * 1000      // 24 год — вік пулу
        private const val REBUILD_BACKOFF_MS = 60L * 60 * 1000    // 1 год між невдалими спробами

        /** Активні колекції (Model B): якщо є — перебивають категорійний рецепт. */
        private fun activeCollections(prefs: android.content.SharedPreferences): List<String> =
            try { jsonToStringList(JSONArray(prefs.getString("activeCollections", "[]"))) } catch (_: Exception) { emptyList() }

        /**
         * Єдина точка збірки пулу: активні колекції (override) АБО рецепт категорій.
         * І для фонового тіку, і для миттєвого перезбору на дію юзера.
         */
        private suspend fun buildPool(prefs: android.content.SharedPreferences): JSONArray? {
            val active = activeCollections(prefs)
            if (active.isNotEmpty()) return buildFromCollections(prefs, active)
            val recipeJson = prefs.getString("poolRecipe", null) ?: return null
            return buildPoolFromRecipe(prefs, JSONObject(recipeJson))
        }

        /**
         * Перезбирає пул, якщо старший за 24год. Swap-on-success: при невдачі старий
         * пул лишається, ретрай за годину. Джерело — buildPool (колекції/рецепт).
         */
        private suspend fun maybeRebuildPool(context: Context, prefs: android.content.SharedPreferences) {
            if (prefs.getString("poolRecipe", null) == null && activeCollections(prefs).isEmpty()) return
            val now = System.currentTimeMillis()
            if (now - prefs.getLong("lastPoolBuild", 0L) < POOL_TTL_MS) return
            if (now - prefs.getLong("lastPoolAttempt", 0L) < REBUILD_BACKOFF_MS) return
            prefs.edit().putLong("lastPoolAttempt", now).apply()
            try {
                val fresh = buildPool(prefs) ?: return
                if (fresh.length() == 0) return
                prefs.edit()
                    .putString("photoPool", fresh.toString())
                    .putInt("poolIndex", 0)
                    .putLong("lastPoolBuild", now)
                    .apply()
            } catch (_: Exception) {
                // лишаємо старий пул; наступна спроба за REBUILD_BACKOFF_MS
            }
        }

        /** Примусовий перезбір (на дію юзера — активація колекції). Ігнорує 24h-гард. */
        suspend fun rebuildNow(context: Context): Boolean {
            val prefs = context.getSharedPreferences("WallpaperPrefs", Context.MODE_PRIVATE)
            return try {
                val fresh = buildPool(prefs) ?: return false
                if (fresh.length() == 0) return false
                prefs.edit()
                    .putString("photoPool", fresh.toString())
                    .putInt("poolIndex", 0)
                    .putLong("lastPoolBuild", System.currentTimeMillis())
                    .apply()
                true
            } catch (_: Exception) {
                false
            }
        }

        /** Виконує рецепт: ротація під-запитів → Unsplash (паралельно) → фільтр людей → дедуп → шафл. */
        private suspend fun buildPoolFromRecipe(
            prefs: android.content.SharedPreferences,
            recipe: JSONObject
        ): JSONArray? = withContext(Dispatchers.IO) {
            val key = prefs.getString("unsplashKey", null)?.takeIf { it.isNotBlank() } ?: return@withContext null
            val jobs = recipe.optJSONArray("jobs") ?: return@withContext null
            val peopleKeywords = jsonToLowerList(recipe.optJSONArray("peopleKeywords"))
            val blocked = jsonToStringSet(recipe.optJSONArray("blockedIds"))

            // Розгортаємо рецепт у пласкі fetch-задачі (query, page, excludePeople).
            // Ротацію (який під-запит брати) робимо ТУТ — тож щодня інший зріз.
            val tasks = ArrayList<Triple<String, Int, Boolean>>()
            for (j in 0 until jobs.length()) {
                val job = jobs.getJSONObject(j)
                val candidates = jsonToStringList(job.getJSONArray("queries")).toMutableList().apply { shuffle() }
                val pick = job.optInt("pick", 1).coerceAtMost(candidates.size)
                val pages = job.optInt("pages", 2)
                val excludePeople = job.optBoolean("excludePeople", false)
                for (qi in 0 until pick) {
                    val query = candidates[qi]
                    val pageList = if (pages >= 2) {
                        val p1 = (1..5).random()
                        listOf(p1, if (p1 < 5) p1 + 5 else p1 - 4)
                    } else listOf((1..6).random())
                    for (page in pageList) tasks.add(Triple(query, page, excludePeople))
                }
            }

            val collected = ArrayList<JSONObject>()
            // Улюблені (якщо обрані) — без фільтра людей, як є
            recipe.optJSONArray("favorites")?.let { favs ->
                for (i in 0 until favs.length()) collected.add(favs.getJSONObject(i))
            }

            // Паралельний фетч — інакше ~44 послідовні запити можуть перевищити
            // 10-хв ліміт WorkManager. Dispatchers.IO тримає пул потоків.
            val fetched = coroutineScope {
                tasks.map { t ->
                    async {
                        fetchSearch(key, t.first, t.second)
                            ?.filter { !(t.third && hasPerson(it, peopleKeywords)) }
                            ?: emptyList()
                    }
                }.awaitAll()
            }
            fetched.forEach { collected.addAll(it) }

            collected.shuffle()
            val seen = HashSet<String>()
            val authorCount = HashMap<String, Int>()
            val pool = JSONArray()
            for (p in collected) {
                val id = p.optString("id", "")
                if (id.isBlank() || id in blocked || id in seen) continue
                // ≤2 фото на автора — розбиваємо «шпалерні ферми». Favorites без
                // поля author (порожнє) → не лімітуються.
                val author = p.optString("author", "")
                val n = authorCount[author] ?: 0
                if (author.isNotBlank() && n >= 2) continue
                seen.add(id)
                authorCount[author] = n + 1
                val out = JSONObject().put("id", id).put("url", p.getString("url"))
                p.optString("downloadLocation", "").takeIf { it.isNotBlank() }?.let { out.put("downloadLocation", it) }
                pool.put(out)
            }
            pool
        }

        /** Пул із активних колекцій (Model B). Куровані → без фільтра людей; author-cap + дедуп лишаємо. */
        private suspend fun buildFromCollections(
            prefs: android.content.SharedPreferences,
            collectionIds: List<String>
        ): JSONArray? = withContext(Dispatchers.IO) {
            val key = prefs.getString("unsplashKey", null)?.takeIf { it.isNotBlank() } ?: return@withContext null
            val blocked = try {
                jsonToStringSet(JSONObject(prefs.getString("poolRecipe", "{}")).optJSONArray("blockedIds"))
            } catch (_: Exception) { HashSet<String>() }

            // 2 випадкові сторінки на колекцію (колекції зазвичай на 100+ фото).
            val tasks = ArrayList<Pair<String, Int>>()
            for (cid in collectionIds) {
                val p1 = (1..3).random()
                listOf(p1, p1 + 3).forEach { tasks.add(Pair(cid, it)) }
            }

            val fetched = coroutineScope {
                tasks.map { t -> async { fetchCollection(key, t.first, t.second) ?: emptyList() } }.awaitAll()
            }
            val collected = ArrayList<JSONObject>()
            fetched.forEach { collected.addAll(it) }

            collected.shuffle()
            val seen = HashSet<String>()
            val authorCount = HashMap<String, Int>()
            val pool = JSONArray()
            for (p in collected) {
                val id = p.optString("id", "")
                if (id.isBlank() || id in blocked || id in seen) continue
                val author = p.optString("author", "")
                val n = authorCount[author] ?: 0
                if (author.isNotBlank() && n >= 2) continue
                seen.add(id)
                authorCount[author] = n + 1
                val out = JSONObject().put("id", id).put("url", p.getString("url"))
                p.optString("downloadLocation", "").takeIf { it.isNotBlank() }?.let { out.put("downloadLocation", it) }
                pool.put(out)
            }
            pool
        }

        /** Один Unsplash /collections/:id/photos (повертає масив фото напряму). */
        private fun fetchCollection(key: String, collectionId: String, page: Int): List<JSONObject>? {
            return try {
                val url = "https://api.unsplash.com/collections/$collectionId/photos?page=$page&per_page=30&orientation=portrait"
                val conn = URL(url).openConnection() as HttpURLConnection
                conn.connectTimeout = 15_000
                conn.readTimeout = 15_000
                conn.setRequestProperty("Authorization", "Client-ID $key")
                if (conn.responseCode != 200) { conn.disconnect(); return null }
                val body = conn.inputStream.bufferedReader().use { it.readText() }
                conn.disconnect()
                val results = JSONArray(body)
                val out = ArrayList<JSONObject>(results.length())
                for (i in 0 until results.length()) {
                    val r = results.getJSONObject(i)
                    val regular = r.optJSONObject("urls")?.optString("regular", "")?.takeIf { it.isNotBlank() } ?: continue
                    val o = JSONObject().put("id", r.optString("id", "")).put("url", regular)
                    r.optJSONObject("links")?.optString("download_location", "")?.takeIf { it.isNotBlank() }
                        ?.let { o.put("downloadLocation", it) }
                    o.put("author", r.optJSONObject("user")?.optString("username", "") ?: "")
                    out.add(o)
                }
                out
            } catch (_: Exception) {
                null
            }
        }

        /** Один Unsplash /search/photos. Повертає [{id,url,downloadLocation,haystack}] або null. */
        private fun fetchSearch(key: String, query: String, page: Int): List<JSONObject>? {
            return try {
                val q = URLEncoder.encode(query, "UTF-8")
                val url = "https://api.unsplash.com/search/photos?query=$q&page=$page&per_page=30&orientation=portrait"
                val conn = URL(url).openConnection() as HttpURLConnection
                conn.connectTimeout = 15_000
                conn.readTimeout = 15_000
                conn.setRequestProperty("Authorization", "Client-ID $key")
                if (conn.responseCode != 200) { conn.disconnect(); return null }
                val body = conn.inputStream.bufferedReader().use { it.readText() }
                conn.disconnect()
                val results = JSONObject(body).optJSONArray("results") ?: return null
                val out = ArrayList<JSONObject>(results.length())
                for (i in 0 until results.length()) {
                    val r = results.getJSONObject(i)
                    val regular = r.optJSONObject("urls")?.optString("regular", "")?.takeIf { it.isNotBlank() } ?: continue
                    val o = JSONObject().put("id", r.optString("id", "")).put("url", regular)
                    r.optJSONObject("links")?.optString("download_location", "")?.takeIf { it.isNotBlank() }
                        ?.let { o.put("downloadLocation", it) }
                    o.put("author", r.optJSONObject("user")?.optString("username", "") ?: "")
                    val hay = StringBuilder()
                        .append(r.optString("alt_description", "").lowercase()).append(' ')
                        .append(r.optString("description", "").lowercase()).append(' ')
                    r.optJSONArray("tags")?.let { ta ->
                        for (k in 0 until ta.length()) ta.optJSONObject(k)?.optString("title", "")
                            ?.let { hay.append(it.lowercase()).append(' ') }
                    }
                    o.put("haystack", hay.toString())
                    out.add(o)
                }
                out
            } catch (_: Exception) {
                null
            }
        }

        private fun hasPerson(photo: JSONObject, keywords: List<String>): Boolean {
            val hay = photo.optString("haystack", "")
            return keywords.any { hay.contains(it) }
        }

        private fun jsonToStringList(arr: JSONArray?): List<String> =
            if (arr == null) emptyList() else (0 until arr.length()).map { arr.optString(it, "") }.filter { it.isNotBlank() }

        private fun jsonToLowerList(arr: JSONArray?): List<String> = jsonToStringList(arr).map { it.lowercase() }

        private fun jsonToStringSet(arr: JSONArray?): HashSet<String> = HashSet(jsonToStringList(arr))

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
