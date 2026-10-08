package com.gorilas.StellarShift

import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/** One atomic snapshot; worker cannot replace a newer manual shuffle or changed recipe. */
internal class MorningMixStore(private val prefs: SharedPreferences) {
    companion object { val lock = Any() }
    fun configure(recipe: String, key: String) = synchronized(lock) {
        val config = JSONObject(recipe)
        require(config.getJSONArray("groups").length() <= 100)
        val old = prefs.getString("recipe", null)
        val changed = old != recipe || prefs.getString("key", null) != key
        if (changed) check(prefs.edit().putString("recipe", recipe).putString("key", key)
            .putLong("retryAfter", 0).commit())
    }
    fun snapshot(): String? = prefs.getString("cache", null)
    fun recipe(): String? = prefs.getString("recipe", null)
    fun key(): String = prefs.getString("key", "") ?: ""
    fun cached(id: String): String? = synchronized(lock) {
        val raw = prefs.getString("cache", null) ?: return@synchronized null
        if (JSONObject(raw).optString("id") == id) raw else null
    }
    fun due(now: Long): Boolean = synchronized(lock) {
        MorningMixSchedule.due(now, prefs.getString("lastDay", null), prefs.getLong("retryAfter", 0))
    }
    fun reserve(now: Long) = synchronized(lock) {
        // Also bounds retries after a process death or a partial HTTP failure.
        check(prefs.edit().putLong("retryAfter", now + 60 * 60 * 1000).commit())
    }
    fun publish(id: String, photos: JSONArray, now: Long, expectedCache: String? = null,
                worker: Boolean = false, expectedRecipe: String? = null, expectedKey: String? = null): Boolean = synchronized(lock) {
        val recipe = prefs.getString("recipe", null) ?: return@synchronized false
        if (JSONObject(recipe).getString("id") != id || photos.length() == 0) return@synchronized false
        if (worker && (recipe != expectedRecipe || key() != expectedKey ||
            prefs.getString("cache", null) != expectedCache)) return@synchronized false
        val raw = JSONObject().put("id", id).put("savedAt", now).put("photos", photos).toString()
        if (raw.length > 2_000_000) return@synchronized false
        val edit = prefs.edit().putString("cache", raw)
        // A successful manual shuffle after 07:00 already supplies today's fresh mix.
        if (now >= MorningMixSchedule.morning(now)) edit.putString("lastDay", MorningMixSchedule.day(now))
        check(edit.commit())
        true
    }
}
