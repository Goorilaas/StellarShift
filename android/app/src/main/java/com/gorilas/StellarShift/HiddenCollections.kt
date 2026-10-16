package com.gorilas.StellarShift

import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/** Visibility and removal from rotation commit together; restoring never activates a source. */
object HiddenCollections {
    private const val KEY = "hiddenCollectionsV1"
    fun hidden(prefs: SharedPreferences) = JSONObject(prefs.getString(KEY, "{}") ?: "{}")
    fun active(prefs: SharedPreferences) = JSONArray(prefs.getString("activeCollections", "[]") ?: "[]")
    fun filtered(prefs: SharedPreferences, requested: JSONArray): JSONArray {
        val hidden = hidden(prefs)
        val excluded = mutableSetOf<String>()
        hidden.keys().forEach { key -> val ids = hidden.getJSONArray(key); for (i in 0 until ids.length()) excluded.add(ids.getString(i)) }
        val result = JSONArray(); val seen = mutableSetOf<String>()
        for (i in 0 until requested.length()) { val id = requested.getString(i); if (id !in excluded && seen.add(id)) result.put(id) }
        return result
    }
    fun state(prefs: SharedPreferences): String = JSONObject()
        .put("hidden", hidden(prefs)).put("active", filtered(prefs, active(prefs)))
        .put("paused", prefs.getBoolean("pausedByCollectionHide", false)).toString()

    fun mutate(prefs: SharedPreferences, key: String, ids: JSONArray, restore: Boolean, choice: String): String {
        require(key.startsWith("mood:") || key.startsWith("collection:"))
        val hidden = hidden(prefs)
        if (restore) {
            hidden.remove(key)
            check(prefs.edit().putString(KEY, hidden.toString()).commit())
            return state(prefs)
        }
        val removed = (0 until ids.length()).map { ids.getString(it) }.toSet()
        val current = active(prefs)
        val remaining = JSONArray()
        for (i in 0 until current.length()) if (current.getString(i) !in removed) remaining.put(current.getString(i))
        val affected = current.length() != remaining.length()
        // The UI confirms the actual consequence, checked again against the live source list.
        if (affected) require(if (remaining.length() == 0) choice == "categories" || choice == "pause" else choice == "remove") { "Rotation changed; confirm again" }
        hidden.put(key, ids)
        val edit = prefs.edit().putString(KEY, hidden.toString()).putString("activeCollections", remaining.toString())
        if (affected) {
            // Never fall back to photos from a hidden source when rebuilding fails/offline.
            edit.putString("photoPool", "[]").putInt("poolIndex", 0)
                .putLong("lastPoolBuild", 0L).putLong("lastPoolAttempt", 0L)
                .remove("mixPoolToken").remove("mixAppliedToken")
            if (choice == "pause") edit.putInt("intervalMinutes", 0).putBoolean("pausedByCollectionHide", true)
        }
        check(edit.commit())
        return state(prefs)
    }
}
