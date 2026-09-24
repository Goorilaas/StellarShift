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
    println("$passed native tests passed")
}
