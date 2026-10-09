package com.gorilas.StellarShift

import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest

/** Catalog and rotation consume the same ordered, filtered selection; no API calls. */
internal object MorningMixRotation {
    fun enabled(prefs: SharedPreferences, store: MorningMixStore): Boolean =
        prefs.getInt("intervalMinutes", 0) > 0 &&
            JSONArray(prefs.getString("activeCollections", "[]")).length() == 0 &&
            JSONObject(store.recipe() ?: "{}").optBoolean("rotationMix", false)

    fun token(raw: String): String = MessageDigest.getInstance("SHA-256")
        .digest(raw.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }

    // The same no-people fallback (8 photos), dedup and author cap as readMorningMix.
    fun pool(raw: String, recipe: String): JSONArray {
        val entry = JSONObject(raw)
        val config = JSONObject(recipe)
        if (entry.getString("id") != config.getString("id")) return JSONArray()
        val photos = entry.getJSONArray("photos")
        val keywords = config.optJSONArray("peopleKeywords") ?: JSONArray()
        val words = (0 until keywords.length()).map { keywords.getString(it).lowercase() }
        val all = (0 until photos.length()).map { photos.getJSONObject(it) }
        val filtered = all.filter { p ->
            val tags = p.optJSONArray("tags") ?: JSONArray()
            val text = ((0 until tags.length()).map { tags.getJSONObject(it).optString("title") } +
                listOf(p.optString("description"), p.optString("alt_description"))).joinToString(" ").lowercase()
            words.none { text.contains(it) }
        }
        val selected = if (filtered.size >= 8) filtered else all
        val seen = mutableSetOf<String>(); val authors = mutableMapOf<String, Int>()
        val result = JSONArray()
        for (p in selected) {
            val id = p.optString("id"); val url = p.optJSONObject("urls")?.optString("regular") ?: ""
            val author = p.optJSONObject("user")?.optString("username") ?: ""
            if (id.isBlank() || url.isBlank() || id in seen || (author.isNotBlank() && (authors[author] ?: 0) >= 2)) continue
            seen.add(id); authors[author] = (authors[author] ?: 0) + 1
            val item = JSONObject().put("id", id).put("url", url)
            p.optJSONObject("links")?.optString("download_location")?.takeIf { it.isNotBlank() }
                ?.let { item.put("downloadLocation", it) }
            result.put(item)
        }
        return result
    }

    fun adopt(prefs: SharedPreferences, store: MorningMixStore): String? = synchronized(BlockedPhotos) {
        if (!enabled(prefs, store)) return@synchronized null
        val raw = store.snapshot() ?: return@synchronized null
        val token = token(raw)
        if (prefs.getString("mixPoolToken", null) == token) return@synchronized token
        val pool = pool(raw, store.recipe() ?: return@synchronized null)
        val blocked = BlockedPhotos.ids(prefs)
        if ((0 until pool.length()).none { pool.getJSONObject(it).getString("id") !in blocked }) return@synchronized null
        BlockedPhotos.replacePool(prefs, pool, System.currentTimeMillis(), token)
        token
    }

    data class Selection(val item: JSONObject, val token: String?, val source: List<String?>, val pool: String?)

    fun select(prefs: SharedPreferences, store: MorningMixStore, onlyPending: Boolean): Selection? = synchronized(BlockedPhotos) {
        val token = adopt(prefs, store)
        if (onlyPending && (token == null || prefs.getString("mixAppliedToken", null) == token)) return@synchronized null
        val item = BlockedPhotos.next(prefs) ?: return@synchronized null
        Selection(item, token, source(prefs, store), prefs.getString("photoPool", "[]"))
    }

    fun sleeping(prefs: SharedPreferences, now: Long = System.currentTimeMillis()): Boolean {
        if (!prefs.getBoolean("sleepEnabled", false)) return false
        val start = prefs.getInt("sleepStart", 0); val end = prefs.getInt("sleepEnd", 420)
        val cal = java.util.Calendar.getInstance().apply { timeInMillis = now }
        val minute = cal.get(java.util.Calendar.HOUR_OF_DAY) * 60 + cal.get(java.util.Calendar.MINUTE)
        return if (start <= end) minute in start until end else minute >= start || minute < end
    }

    fun valid(prefs: SharedPreferences, store: MorningMixStore, selection: Selection,
              manual: Boolean, now: Long = System.currentTimeMillis()): Boolean =
        source(prefs, store) == selection.source && prefs.getString("photoPool", "[]") == selection.pool &&
            (manual || (prefs.getInt("intervalMinutes", 0) > 0 && !sleeping(prefs, now))) &&
            selection.item.getString("id") !in BlockedPhotos.ids(prefs)

    // Reject a download/rebuild started before OFF, source change, or a new catalog snapshot.
    fun source(prefs: SharedPreferences, store: MorningMixStore): List<String?> = listOf(
        prefs.getString("poolRecipe", null), prefs.getString("activeCollections", "[]"),
        (prefs.getInt("intervalMinutes", 0) > 0).toString(),
        if (enabled(prefs, store)) store.recipe() else null,
        if (enabled(prefs, store)) store.snapshot() else null)
}
