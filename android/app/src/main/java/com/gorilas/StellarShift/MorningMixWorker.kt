package com.gorilas.StellarShift

import android.content.Context
import androidx.work.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.TimeUnit
import kotlin.coroutines.coroutineContext

class MorningMixWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val store = store(applicationContext)
        val now = System.currentTimeMillis()
        val previous = store.snapshot()
        if (!store.due(now)) return@withContext Result.success()
        val recipe = store.recipe() ?: return@withContext Result.success()
        val key = store.key()
        if (key.isBlank()) return@withContext Result.success()
        try {
            store.reserve(now)
            val config = JSONObject(recipe)
            val id = config.getString("id")
            val groups = config.getJSONArray("groups")
            val queries = (0 until groups.length()).flatMap { i ->
                val g = groups.getJSONObject(i)
                val q = g.getJSONArray("queries")
                (0 until q.length()).map { q.getString(it) }.shuffled().take(g.getInt("take").coerceIn(1, 3))
            }.distinct().shuffled().take(12)
            if (queries.isEmpty()) return@withContext Result.success()
            val photos = mutableListOf<JSONObject>()
            for (query in queries) {
                coroutineContext.ensureActive()
                val encoded = URLEncoder.encode(query, "UTF-8")
                val conn = URL("https://api.unsplash.com/search/photos?query=$encoded&page=${(1..3).random()}&per_page=10&orientation=portrait").openConnection() as HttpURLConnection
                try {
                    conn.connectTimeout = 10_000; conn.readTimeout = 15_000
                    conn.setRequestProperty("Authorization", "Client-ID $key")
                    // Stop at the first error; keep the entire previous snapshot, including on quota exhaustion.
                    if (conn.responseCode != 200) return@withContext Result.success()
                    val body = conn.inputStream.bufferedReader().use { reader ->
                        val text = StringBuilder(); val buffer = CharArray(8192)
                        while (true) { val n = reader.read(buffer); if (n < 0) break
                            text.append(buffer, 0, n); check(text.length <= 2_000_000) }
                        text.toString()
                    }
                    val results = JSONObject(body).getJSONArray("results")
                    for (i in 0 until results.length()) {
                        val p = results.getJSONObject(i)
                        val user = p.getJSONObject("user"); val urls = p.getJSONObject("urls")
                        if (p.optString("id").isBlank() || urls.optString("small").isBlank() || urls.optString("regular").isBlank()) continue
                        val compact = JSONObject().put("id", p.getString("id")).put("urls", urls)
                            .put("user", JSONObject().put("name", user.optString("name"))
                                .put("username", user.optString("username")).put("profile_image", user.optJSONObject("profile_image"))
                                .put("links", user.optJSONObject("links")))
                        for (field in listOf("links", "description", "alt_description", "tags"))
                            if (p.has(field) && !p.isNull(field)) compact.put(field, p.get(field))
                        photos.add(compact)
                    }
                } finally { conn.disconnect() }
            }
            coroutineContext.ensureActive()
            store.publish(id, JSONArray(photos.shuffled()), System.currentTimeMillis(), previous, true, recipe, key)
            Result.success()
        } catch (e: CancellationException) { throw e }
        catch (_: Exception) { Result.success() } // persisted one-hour cooldown; next eligible periodic tick retries
    }
    companion object {
        private const val WORK = "MorningCatalogMix"
        internal fun store(context: Context) = MorningMixStore(context.getSharedPreferences("MorningCatalogMix", Context.MODE_PRIVATE))
        fun schedule(context: Context, reset: Boolean = false) {
            if (store(context).recipe() == null) return
            // Local calendar eligibility is re-evaluated each tick, including after timezone/DST changes.
            val now = System.currentTimeMillis()
            val delay = if (reset && store(context).due(now)) 0 else MorningMixSchedule.initialDelay(now)
            val request = PeriodicWorkRequestBuilder<MorningMixWorker>(15, TimeUnit.MINUTES)
                .setInitialDelay(delay, TimeUnit.MILLISECONDS)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(WORK, if (reset) ExistingPeriodicWorkPolicy.CANCEL_AND_REENQUEUE else ExistingPeriodicWorkPolicy.KEEP, request)
        }
    }
}
