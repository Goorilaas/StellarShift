package com.gorilas.StellarShift

import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/** Єдиний список для JS, шторки й Worker. Зміни та публікація пулу атомарні. */
object BlockedPhotos {
    private const val KEY = "blockedPhotos"
    private const val MIGRATED = "blockedPhotosMigrated"
    private const val SOURCE = "photoPoolSource"

    private fun entries(json: String): LinkedHashMap<String, JSONObject> {
        val result = linkedMapOf<String, JSONObject>()
        val array = JSONArray(json)
        for (i in 0 until array.length()) {
            val item = array.optJSONObject(i) ?: continue
            val id = item.optString("id")
            if (id.isNotBlank()) result[id] = JSONObject().put("id", id)
                .put("small", item.optString("small", item.optString("url")))
        }
        return result
    }

    @Synchronized
    fun migrate(prefs: SharedPreferences, legacy: String): String {
        if (!prefs.getBoolean(MIGRATED, false)) {
            val list = entries(legacy)
            list.putAll(entries(prefs.getString("pendingBlocked", "[]") ?: "[]"))
            list.putAll(entries(prefs.getString(KEY, "[]") ?: "[]"))
            save(prefs, list, migrating = true)
        }
        return prefs.getString(KEY, "[]") ?: "[]"
    }

    @Synchronized
    fun ids(prefs: SharedPreferences): Set<String> {
        val result = entries(prefs.getString(KEY, "[]") ?: "[]").keys.toMutableSet()
        // До першого запуску JS після оновлення враховуємо старий рецепт і шторку.
        if (!prefs.getBoolean(MIGRATED, false)) {
            val recipe = JSONObject(prefs.getString("poolRecipe", "{}") ?: "{}")
                .optJSONArray("blockedIds") ?: JSONArray()
            for (i in 0 until recipe.length()) result.add(recipe.getString(i))
            result.addAll(entries(prefs.getString("pendingBlocked", "[]") ?: "[]").keys)
        }
        return result
    }

    @Synchronized
    fun mutate(prefs: SharedPreferences, operation: String, json: String): String {
        val list = entries(prefs.getString(KEY, "[]") ?: "[]")
        // Snapshot для Undo береться під тим самим lock, що й очищення.
        val removed = if (operation == "clear") JSONArray(list.values).toString() else null
        when (operation) {
            "add" -> list.putAll(entries(json))
            "remove" -> entries(json).keys.forEach { list.remove(it) }
            "clear" -> list.clear()
            else -> error("Unknown blocked-photo operation")
        }
        save(prefs, list)
        return removed ?: JSONArray(list.values).toString()
    }

    private fun save(prefs: SharedPreferences, list: Map<String, JSONObject>, migrating: Boolean = false) {
        val editor = prefs.edit().putString(KEY, JSONArray(list.values).toString())
        if (migrating) editor.putBoolean(MIGRATED, true).remove("pendingBlocked")
        val blocked = if (migrating || prefs.getBoolean(MIGRATED, false)) list.keys else ids(prefs) + list.keys
        val source = JSONArray(prefs.getString(SOURCE, prefs.getString("photoPool", "[]")) ?: "[]")
        updatePool(prefs, editor, source, blocked, reset = false)
        check(editor.commit()) { "Cannot save blocked photos" }
    }

    private fun updatePool(prefs: SharedPreferences, editor: SharedPreferences.Editor,
                           source: JSONArray, blocked: Set<String>, reset: Boolean) {
        val old = JSONArray(prefs.getString("photoPool", "[]") ?: "[]")
        val index = prefs.getInt("poolIndex", 0).coerceAtLeast(0)
        var nextId: String? = null
        if (!reset) for (offset in 0 until old.length()) {
            val id = old.getJSONObject((index + offset) % old.length()).optString("id")
            if (id !in blocked) { nextId = id; break }
        }
        val filtered = JSONArray()
        var nextIndex = 0
        for (i in 0 until source.length()) {
            val item = source.getJSONObject(i)
            if (item.optString("id") in blocked) continue
            if (item.optString("id") == nextId) nextIndex = filtered.length()
            filtered.put(item)
        }
        // Зберігаємо локальне джерело, щоб Undo не потребував Unsplash-запиту.
        editor.putString(SOURCE, source.toString()).putString("photoPool", filtered.toString())
            .putInt("poolIndex", nextIndex)
    }

    @Synchronized
    fun replacePool(prefs: SharedPreferences, source: JSONArray, builtAt: Long) {
        val editor = prefs.edit().putLong("lastPoolBuild", builtAt)
        updatePool(prefs, editor, source, ids(prefs), reset = true)
        check(editor.commit()) { "Cannot save photo pool" }
    }

    @Synchronized
    fun next(prefs: SharedPreferences): JSONObject? {
        val pool = JSONArray(prefs.getString("photoPool", "[]") ?: "[]")
        val blocked = ids(prefs)
        val index = prefs.getInt("poolIndex", 0).coerceAtLeast(0)
        for (offset in 0 until pool.length()) {
            val item = pool.getJSONObject((index + offset) % pool.length())
            if (item.optString("id") !in blocked) return item
        }
        return null
    }

    @Synchronized
    fun advance(prefs: SharedPreferences, id: String) {
        val pool = JSONArray(prefs.getString("photoPool", "[]") ?: "[]")
        for (i in 0 until pool.length()) if (pool.getJSONObject(i).optString("id") == id) {
            prefs.edit().putInt("poolIndex", (i + 1) % pool.length()).apply()
            return
        }
    }
}
