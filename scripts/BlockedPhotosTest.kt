package com.gorilas.StellarShift

import android.content.SharedPreferences
import java.lang.reflect.Proxy
import org.json.JSONArray
import org.json.JSONObject

// Реальна Android-логіка зі сховищем у пам’яті; без мережі чи пристрою.
private fun preferences(data: MutableMap<String, Any> = mutableMapOf()): SharedPreferences {
    fun editor(): SharedPreferences.Editor {
        val changes = mutableMapOf<String, Any?>()
        return Proxy.newProxyInstance(SharedPreferences.Editor::class.java.classLoader,
            arrayOf(SharedPreferences.Editor::class.java)) { proxy, method, args ->
            when {
                method.name.startsWith("put") -> { changes[args[0] as String] = args[1]; proxy }
                method.name == "remove" -> { changes[args[0] as String] = null; proxy }
                method.name == "commit" || method.name == "apply" -> {
                    changes.forEach { (key, value) -> if (value == null) data.remove(key) else data[key] = value }
                    if (method.name == "commit") true else null
                }
                else -> error(method.name)
            }
        } as SharedPreferences.Editor
    }
    return Proxy.newProxyInstance(SharedPreferences::class.java.classLoader,
        arrayOf(SharedPreferences::class.java)) { _, method, args ->
        when {
            method.name == "edit" -> editor()
            method.name.startsWith("get") -> data[args[0] as String] ?: args[1]
            else -> error(method.name)
        }
    } as SharedPreferences
}

private fun photos(vararg ids: String): JSONArray = JSONArray(ids.map {
    JSONObject().put("id", it).put("url", "https://images.example/$it?w=1000")
})
private fun pool(prefs: SharedPreferences): List<String> {
    val array = JSONArray(prefs.getString("photoPool", "[]"))
    return (0 until array.length()).map { array.getJSONObject(it).getString("id") }
}
private var passed = 0
private fun test(name: String, body: () -> Unit) { body(); passed++; println("PASS $name") }

fun main() {
    test("migration merges legacy, queued shade actions, and new native blocks exactly once") {
        val data = mutableMapOf<String, Any>("poolRecipe" to """{"blockedIds":["legacy"]}""",
            "pendingBlocked" to photos("queued").toString())
        val prefs = preferences(data)
        BlockedPhotos.replacePool(prefs, photos("legacy", "queued", "shade", "ok"), 1)
        check(pool(prefs) == listOf("shade", "ok"))
        BlockedPhotos.mutate(prefs, "add", photos("shade").toString())
        BlockedPhotos.migrate(prefs, photos("legacy").toString())
        check(BlockedPhotos.ids(prefs) == setOf("legacy", "queued", "shade"))
        check(pool(prefs) == listOf("ok"))
        check("pendingBlocked" !in data)
        BlockedPhotos.mutate(prefs, "remove", photos("legacy").toString())
        val reopened = preferences(data)
        BlockedPhotos.migrate(reopened, photos("legacy").toString())
        check("legacy" !in BlockedPhotos.ids(reopened)) // ні старий рецепт, ні AsyncStorage не повертають блок
        check("legacy" in pool(reopened))
    }
    test("block preserves next photo; undo restores from local source; all-blocked pool is safe") {
        val prefs = preferences()
        BlockedPhotos.migrate(prefs, "[]")
        BlockedPhotos.replacePool(prefs, photos("a", "b", "c"), 42)
        prefs.edit().putInt("poolIndex", 2).apply()
        BlockedPhotos.mutate(prefs, "add", photos("a").toString())
        check(pool(prefs) == listOf("b", "c"))
        check(BlockedPhotos.next(prefs)?.getString("id") == "c")
        BlockedPhotos.mutate(prefs, "remove", photos("a").toString())
        check(pool(prefs) == listOf("a", "b", "c"))
        check(BlockedPhotos.next(prefs)?.getString("id") == "c")
        BlockedPhotos.advance(prefs, "c")
        check(BlockedPhotos.next(prefs)?.getString("id") == "a")
        BlockedPhotos.mutate(prefs, "add", photos("a", "b", "c").toString())
        check(BlockedPhotos.next(prefs) == null)
        BlockedPhotos.mutate(prefs, "clear", "[]")
        check(pool(prefs) == listOf("a", "b", "c"))
        check(prefs.getLong("lastPoolBuild", 0) == 42L)
    }
    test("late rebuild uses latest blocks; undo-clear preserves newer shade blocks") {
        val prefs = preferences()
        BlockedPhotos.migrate(prefs, "[]")
        val response = photos("a", "b", "c") // мережа почалася до блокування
        BlockedPhotos.mutate(prefs, "add", photos("a").toString())
        BlockedPhotos.replacePool(prefs, response, 1)
        check(pool(prefs) == listOf("b", "c"))
        val snapshot = BlockedPhotos.mutate(prefs, "clear", "[]")
        check(JSONArray(snapshot).getJSONObject(0).getString("id") == "a")
        BlockedPhotos.mutate(prefs, "add", photos("b").toString())
        BlockedPhotos.mutate(prefs, "add", snapshot)
        check(BlockedPhotos.ids(prefs) == setOf("a", "b"))
        check(pool(prefs) == listOf("c"))
    }
    test("parallel app/shade mutations retain every block, including beyond old 50-item limit") {
        val prefs = preferences()
        BlockedPhotos.migrate(prefs, "[]")
        val threads = (0 until 4).map { worker -> Thread {
            repeat(20) { BlockedPhotos.mutate(prefs, "add", photos("$worker-$it").toString()) }
        }.also { it.start() } }
        threads.forEach { it.join() }
        check(BlockedPhotos.ids(prefs).size == 80)
    }
    test("legacy installs are unknown; only a tracked matching photo is replaced") {
        val prefs = preferences()
        BlockedPhotos.migrate(prefs, "[]")
        BlockedPhotos.mutate(prefs, "add", photos("a", "b").toString())
        check(CurrentWallpaper.replacementTarget(prefs, "a", 1, 2) == null)
        CurrentWallpaper.record(prefs, "a", "both", 1, 2)
        check(CurrentWallpaper.replacementTarget(prefs, "a", 1, 2) == "both")
        check(CurrentWallpaper.replacementTarget(prefs, "b", 1, 2) == null)
    }
    test("home and lock retain independent identities across restart") {
        val data = mutableMapOf<String, Any>()
        val prefs = preferences(data)
        BlockedPhotos.migrate(prefs, "[]")
        CurrentWallpaper.record(prefs, "a", "both", 1, 2)
        CurrentWallpaper.record(prefs, "b", "lock", 1, 3)
        BlockedPhotos.mutate(prefs, "add", photos("a", "b").toString())
        val reopened = preferences(data)
        check(CurrentWallpaper.replacementTarget(reopened, "a", 1, 3) == "home")
        check(CurrentWallpaper.replacementTarget(reopened, "b", 1, 3) == "lock")
    }
    test("Undo cancels a pending replacement without changing current identity or pool index") {
        val prefs = preferences()
        BlockedPhotos.migrate(prefs, "[]")
        CurrentWallpaper.record(prefs, "a", "home", 1, 2)
        BlockedPhotos.replacePool(prefs, photos("a", "b"), 1)
        BlockedPhotos.mutate(prefs, "add", photos("a").toString())
        val expected = CurrentWallpaper.snapshot(prefs)
        check(CurrentWallpaper.replacementTarget(prefs, "a", 1, 2, expected) == "home")
        BlockedPhotos.mutate(prefs, "remove", photos("a").toString())
        check(CurrentWallpaper.replacementTarget(prefs, "a", 1, 2, expected) == null)
        check(CurrentWallpaper.snapshot(prefs) == expected)
        check(BlockedPhotos.next(prefs)?.getString("id") == "b")
    }
    test("duplicate successful replacement cannot advance again; live reinstall invalidates a pending snapshot") {
        val prefs = preferences()
        BlockedPhotos.migrate(prefs, "[]")
        BlockedPhotos.mutate(prefs, "add", photos("a").toString())
        CurrentWallpaper.record(prefs, "a", "home", 10, -1)
        val old = CurrentWallpaper.snapshot(prefs)
        CurrentWallpaper.record(prefs, "a", "home", 10, -1)
        check(CurrentWallpaper.replacementTarget(prefs, "a", 10, -1, old) == null)
        CurrentWallpaper.record(prefs, "b", "home", 10, -1)
        check(CurrentWallpaper.replacementTarget(prefs, "a", 10, -1) == null)
    }
    test("external wallpaper changes invalidate only affected screens") {
        val prefs = preferences()
        BlockedPhotos.migrate(prefs, "[]")
        BlockedPhotos.mutate(prefs, "add", photos("a").toString())
        CurrentWallpaper.record(prefs, "a", "both", 1, 2)
        check(CurrentWallpaper.replacementTarget(prefs, "a", 9, 2) == "lock")
        check(CurrentWallpaper.replacementTarget(prefs, "a", 9, 8) == null)
    }
    test("empty remaining pool keeps identity and block, allowing later retry without enabling rotation") {
        val prefs = preferences()
        BlockedPhotos.migrate(prefs, "[]")
        prefs.edit().putInt("intervalMinutes", 0).commit()
        CurrentWallpaper.record(prefs, "a", "home", 1, 2)
        BlockedPhotos.replacePool(prefs, photos("a"), 1)
        BlockedPhotos.mutate(prefs, "add", photos("a").toString())
        val expected = CurrentWallpaper.snapshot(prefs)
        check(BlockedPhotos.next(prefs) == null)
        check(CurrentWallpaper.replacementTarget(prefs, "a", 1, 2, expected) == "home")
        BlockedPhotos.replacePool(prefs, photos("a", "b"), 2)
        check(BlockedPhotos.next(prefs)?.getString("id") == "b")
        check(prefs.getInt("intervalMinutes", -1) == 0)
    }
    test("mirrored lock identity follows the system wallpaper and rejects external home changes") {
        val prefs = preferences()
        BlockedPhotos.migrate(prefs, "[]")
        BlockedPhotos.mutate(prefs, "add", photos("a").toString())
        CurrentWallpaper.record(prefs, "a", "both", 10, -1)
        check(CurrentWallpaper.replacementTarget(prefs, "a", 10, -1) == "both")
        check(CurrentWallpaper.replacementTarget(prefs, "a", 11, -1) == null)
        check(CurrentWallpaper.replacementTarget(prefs, "a", 10, 12) == "home")
    }

    test("hiding an inactive source preserves current pool, active sources and OFF") {
        val data = mutableMapOf<String, Any>("activeCollections" to "[\"b\"]", "photoPool" to photos("keep").toString())
        val prefs = preferences(data)
        HiddenCollections.mutate(prefs, "collection:a", JSONArray("[\"a\"]"), false, "")
        check(pool(prefs) == listOf("keep")); check(HiddenCollections.active(prefs).toString() == "[\"b\"]")
        check(prefs.getInt("intervalMinutes", 0) == 0)
    }
    test("removing one active source clears stale pool but keeps rotation enabled") {
        val prefs = preferences(mutableMapOf("activeCollections" to "[\"a\",\"b\"]", "intervalMinutes" to 30, "photoPool" to photos("old").toString()))
        HiddenCollections.mutate(prefs, "collection:a", JSONArray("[\"a\"]"), false, "remove")
        check(HiddenCollections.active(prefs).toString() == "[\"b\"]"); check(pool(prefs).isEmpty())
        check(prefs.getInt("intervalMinutes", 0) == 30); check(prefs.getLong("lastPoolBuild", -1) == 0L)
    }
    test("last source requires explicit choice; stale confirmation changes nothing") {
        val prefs = preferences(mutableMapOf("activeCollections" to "[\"a\"]", "intervalMinutes" to 30, "photoPool" to photos("old").toString()))
        for (choice in listOf("", "remove")) {
            check(runCatching { HiddenCollections.mutate(prefs, "collection:a", JSONArray("[\"a\"]"), false, choice) }.isFailure)
            check(HiddenCollections.hidden(prefs).length() == 0); check(pool(prefs) == listOf("old"))
        }
    }
    test("pause commits hidden parent, all removed active children and OFF together") {
        val prefs = preferences(mutableMapOf("activeCollections" to "[\"a\",\"b\"]", "intervalMinutes" to 30))
        val state = JSONObject(HiddenCollections.mutate(prefs, "mood:space", JSONArray("[\"a\",\"b\"]"), false, "pause"))
        check(state.getJSONArray("active").length() == 0); check(state.getBoolean("paused"))
        check(prefs.getInt("intervalMinutes", 99) == 0)
        check(state.getJSONObject("hidden").has("mood:space"))
    }
    test("categories choice preserves recipe and interval without old source fallback") {
        val prefs = preferences(mutableMapOf("activeCollections" to "[\"a\"]", "intervalMinutes" to 30, "poolRecipe" to "chosen", "photoPool" to photos("old").toString()))
        HiddenCollections.mutate(prefs, "collection:a", JSONArray("[\"a\"]"), false, "categories")
        check(HiddenCollections.active(prefs).length() == 0); check(pool(prefs).isEmpty())
        check(prefs.getString("poolRecipe", "") == "chosen"); check(prefs.getInt("intervalMinutes", 0) == 30)
    }
    test("restore parent preserves independently hidden children and never enables rotation") {
        val prefs = preferences(mutableMapOf("activeCollections" to "[\"b\"]", "intervalMinutes" to 30))
        HiddenCollections.mutate(prefs, "collection:a", JSONArray("[\"a\"]"), false, "")
        HiddenCollections.mutate(prefs, "mood:space", JSONArray("[\"a\",\"b\"]"), false, "pause")
        HiddenCollections.mutate(prefs, "mood:space", JSONArray(), true, "")
        check(HiddenCollections.hidden(prefs).has("collection:a"))
        check(!HiddenCollections.hidden(prefs).has("mood:space"))
        check(HiddenCollections.active(prefs).length() == 0); check(prefs.getInt("intervalMinutes", 99) == 0)
    }
    test("hidden sources cannot be activated by stale JS or duplicate source ids") {
        val prefs = preferences()
        HiddenCollections.mutate(prefs, "mood:space", JSONArray("[\"a\",\"b\"]"), false, "")
        check(HiddenCollections.filtered(prefs, JSONArray("[\"a\",\"c\",\"b\",\"c\"]")).toString() == "[\"c\"]")
    }
    test("visibility survives restart, retains unknown ids, restoration does not touch favorites or names") {
        val data = mutableMapOf<String, Any>("favorites" to "saved", "names" to "custom")
        HiddenCollections.mutate(preferences(data), "mood:future", JSONArray("[\"unknown\"]"), false, "")
        val reloaded = preferences(data)
        check(HiddenCollections.hidden(reloaded).has("mood:future"))
        HiddenCollections.mutate(reloaded, "mood:future", JSONArray(), true, "")
        check(data["favorites"] == "saved"); check(data["names"] == "custom")
    }
    println("$passed native tests passed")
}
