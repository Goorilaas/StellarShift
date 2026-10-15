package com.gorilas.StellarShift

import android.content.SharedPreferences
import org.json.JSONObject

/** Identities written only by successful installs, independent of notification permissions. */
object CurrentWallpaper {
    private const val KEY = "currentWallpaperV1"
    fun snapshot(prefs: SharedPreferences): String = prefs.getString(KEY, "{}") ?: "{}"

    fun record(prefs: SharedPreferences, id: String, target: String, homeId: Int, lockId: Int) {
        val state = JSONObject(snapshot(prefs))
        val screens = when (target) { "home" -> listOf("home"); "lock" -> listOf("lock"); else -> listOf("home", "lock") }
        for (screen in screens) {
            if (id.isBlank()) state.remove(screen)
            else state.put(screen, JSONObject().put("id", id)
                .put("wallpaperId", if (screen == "home") homeId else lockId)
                .put("mirrorHomeId", if (screen == "lock" && lockId == -1) homeId else null))
        }
        // Also changes when the same photo is explicitly reinstalled on a live surface.
        state.put("revision", state.optLong("revision") + 1)
        check(prefs.edit().putString(KEY, state.toString()).commit()) { "Cannot save wallpaper identity" }
    }

    fun replacementTarget(prefs: SharedPreferences, id: String, homeId: Int, lockId: Int,
                          expected: String? = null): String? {
        if (id !in BlockedPhotos.ids(prefs)) return null
        if (expected != null && snapshot(prefs) != expected) return null
        return matchingTarget(prefs, id, homeId, lockId)
    }

    fun matchingTarget(prefs: SharedPreferences, id: String, homeId: Int, lockId: Int): String? {
        if (id.isBlank()) return null
        val state = JSONObject(snapshot(prefs))
        fun matches(screen: String, actual: Int): Boolean {
            val entry = state.optJSONObject(screen) ?: return false
            return entry.optString("id") == id && entry.optInt("wallpaperId", Int.MIN_VALUE) == actual &&
                (screen != "lock" || actual != -1 || entry.optInt("mirrorHomeId", Int.MIN_VALUE) == homeId)
        }
        val home = matches("home", homeId)
        val lock = matches("lock", lockId)
        return if (home && lock) "both" else if (home) "home" else if (lock) "lock" else null
    }
}
