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

private var passed = 0
private fun test(name: String, body: () -> Unit) { body(); passed++; println("PASS $name") }
private fun instant(value: String) = java.time.Instant.parse(value).toEpochMilli()
private val zone = java.util.TimeZone.getTimeZone("Europe/Kyiv")
private fun recipe(id: String) = JSONObject().put("id", id).put("groups", JSONArray()).toString()
private fun photos(id: String) = JSONArray().put(JSONObject().put("id", id))
fun main() {
    java.util.TimeZone.setDefault(zone)
    val morning = instant("2026-10-07T04:00:00Z")
    test("local 07:00, one success per calendar day, and retry cooldown") {
        check(!MorningMixSchedule.due(morning - 1, null, 0))
        check(MorningMixSchedule.due(morning, null, 0))
        check(!MorningMixSchedule.due(morning, "2026-10-7", 0))
        check(!MorningMixSchedule.due(morning, null, morning + 1))
        check(MorningMixSchedule.initialDelay(morning - 1) == 1L)
    }
    test("next local morning follows 23/25 hour DST days") {
        check(MorningMixSchedule.initialDelay(instant("2026-03-28T05:00:00Z")) == 23 * 3600000L)
        check(MorningMixSchedule.initialDelay(instant("2026-10-24T04:00:00Z")) == 25 * 3600000L)
    }
    test("timezone change reevaluates local morning") {
        check(MorningMixSchedule.due(morning, null, 0, zone))
        check(!MorningMixSchedule.due(morning, null, 0, java.util.TimeZone.getTimeZone("America/New_York")))
    }
    test("recreation retains snapshot and failed attempt never replaces it") {
        val prefs = preferences(); val store = MorningMixStore(prefs)
        store.configure(recipe("a"), "key")
        check(store.publish("a", photos("old"), morning - 1))
        val before = store.cached("a")
        store.reserve(morning)
        check(!store.due(morning + 1))
        check(store.due(morning + 3600000))
        check(!store.publish("a", JSONArray(), morning))
        val reopened = MorningMixStore(prefs)
        check(reopened.cached("a") == before)
        check(reopened.cached("b") == null)
    }
    test("success after 07:00 suppresses further work until next day") {
        val store = MorningMixStore(preferences()); store.configure(recipe("a"), "key")
        check(store.publish("a", photos("new"), morning))
        check(!store.due(morning + 12 * 3600000))
        check(store.due(morning + 24 * 3600000))
    }
    test("late worker cannot replace a newer manual shuffle") {
        val store = MorningMixStore(preferences()); val config = recipe("a"); store.configure(config, "key")
        store.publish("a", photos("old"), morning - 1); val before = store.snapshot()
        store.publish("a", photos("manual"), morning)
        val manual = store.snapshot()
        check(!store.publish("a", photos("worker"), morning + 1, before, true, config, "key"))
        check(store.snapshot() == manual)
    }
    test("key or category changes reject an in-flight worker") {
        val store = MorningMixStore(preferences()); val config = recipe("a"); store.configure(config, "key")
        store.configure(config, "new-key")
        check(!store.publish("a", photos("old-key"), morning, null, true, config, "key"))
        store.configure(recipe("b"), "new-key")
        check(!store.publish("a", photos("old-category"), morning, null, true, config, "new-key"))
    }
    test("new recipe can replace old recipe snapshot atomically") {
        val store = MorningMixStore(preferences()); store.configure(recipe("a"), "key")
        store.publish("a", photos("old"), morning - 1); val before = store.snapshot()
        val config = recipe("b"); store.configure(config, "key")
        check(store.publish("b", photos("new"), morning, before, true, config, "key"))
        check(store.cached("a") == null); check(store.cached("b") != null)
    }
    test("oversized snapshot leaves old cache intact") {
        val store = MorningMixStore(preferences()); store.configure(recipe("a"), "key")
        store.publish("a", photos("old"), morning); val before = store.snapshot()
        check(!store.publish("a", photos("x".repeat(2_000_001)), morning))
        check(store.snapshot() == before)
    }
    fun setupRotation(): Pair<SharedPreferences, MorningMixStore> {
        val prefs = preferences(mutableMapOf("intervalMinutes" to 30, "activeCollections" to "[]"))
        val store = MorningMixStore(preferences())
        store.configure(JSONObject(recipe("a")).put("rotationMix", true)
            .put("peopleKeywords", JSONArray(listOf("person", "portrait"))).toString(), "key")
        return prefs to store
    }
    fun catalog(vararg ids: String): JSONArray = JSONArray(ids.map { id ->
        JSONObject().put("id", id).put("urls", JSONObject().put("regular", "https://image/$id"))
            .put("user", JSONObject().put("username", id))
            .put("links", JSONObject().put("download_location", "https://tracking/$id"))
    })
    test("new mix replaces old pool in catalog order and preserves tracking") {
        val (prefs, store) = setupRotation()
        BlockedPhotos.replacePool(prefs, photos("old"), morning - 1)
        store.publish("a", catalog("first", "second"), morning)
        val selected = MorningMixRotation.select(prefs, store, true)!!
        check(selected.item.getString("id") == "first")
        check(selected.item.getString("downloadLocation") == "https://tracking/first")
        check(MorningMixRotation.valid(prefs, store, selected, false, morning))
        BlockedPhotos.advance(prefs, "first")
        prefs.edit().putString("mixAppliedToken", selected.token).commit()
        check(MorningMixRotation.select(prefs, store, true) == null)
        check(MorningMixRotation.select(prefs, store, false)!!.item.getString("id") == "second")
        check(MorningMixRotation.select(prefs, MorningMixStore(preferences()), true) == null)
    }
    test("OFF and active collections never adopt the catalog snapshot") {
        val (prefs, store) = setupRotation(); store.publish("a", catalog("new"), morning)
        prefs.edit().putInt("intervalMinutes", 0).commit()
        check(MorningMixRotation.select(prefs, store, true) == null)
        prefs.edit().putInt("intervalMinutes", 30).putString("activeCollections", "[\"collection\"]").commit()
        check(MorningMixRotation.select(prefs, store, true) == null)
        prefs.edit().putString("activeCollections", "[]").commit()
        store.configure(JSONObject(store.recipe()!!).put("rotationMix", false).toString(), "key")
        check(MorningMixRotation.select(prefs, store, true) == null)
    }
    test("hidden first photo is skipped and all-hidden mix leaves old pool intact") {
        val (prefs, store) = setupRotation()
        BlockedPhotos.migrate(prefs, "[]")
        BlockedPhotos.mutate(prefs, "add", photos("first").toString())
        store.publish("a", catalog("first", "second"), morning)
        check(MorningMixRotation.select(prefs, store, true)!!.item.getString("id") == "second")
        val old = prefs.getString("photoPool", null)
        store.publish("a", catalog("first"), morning + 1)
        check(MorningMixRotation.select(prefs, store, true) == null)
        check(prefs.getString("photoPool", null) == old)
    }
    test("failed update leaves previous pool and position intact") {
        val (prefs, store) = setupRotation(); store.publish("a", catalog("a", "b"), morning)
        MorningMixRotation.adopt(prefs, store); BlockedPhotos.advance(prefs, "a")
        val old = prefs.getString("photoPool", null)
        check(!store.publish("a", JSONArray(), morning + 1))
        MorningMixRotation.adopt(prefs, store)
        check(prefs.getString("photoPool", null) == old)
        check(BlockedPhotos.next(prefs)!!.getString("id") == "b")
    }
    test("in-flight download rejected after OFF, source change, new mix or hiding") {
        for (change in listOf("off", "collection", "recipe", "newMix", "hide")) {
            val (prefs, store) = setupRotation(); store.publish("a", catalog("a", "b"), morning)
            val selection = MorningMixRotation.select(prefs, store, true)!!
            when (change) {
                "off" -> prefs.edit().putInt("intervalMinutes", 0).commit()
                "collection" -> prefs.edit().putString("activeCollections", "[\"x\"]").commit()
                "recipe" -> store.configure(JSONObject(store.recipe()!!).put("rotationMix", false).toString(), "key")
                "newMix" -> store.publish("a", catalog("new"), morning + 1)
                "hide" -> BlockedPhotos.mutate(prefs, "add", photos("a").toString())
            }
            check(!MorningMixRotation.valid(prefs, store, selection, false, morning)) { change }
        }
    }
    test("night pause defers first apply without consuming it; end is exclusive") {
        val (prefs, store) = setupRotation(); store.publish("a", catalog("a"), morning)
        prefs.edit().putBoolean("sleepEnabled", true).putInt("sleepStart", 23 * 60).putInt("sleepEnd", 8 * 60).commit()
        val selection = MorningMixRotation.select(prefs, store, true)!!
        check(!MorningMixRotation.valid(prefs, store, selection, false, morning))
        check(MorningMixRotation.valid(prefs, store, selection, true, morning))
        check(MorningMixRotation.valid(prefs, store, selection, false, morning + 3600000))
        check(MorningMixRotation.select(prefs, store, true) != null)
        prefs.edit().putInt("sleepStart", 7 * 60).putInt("sleepEnd", 8 * 60).commit()
        check(MorningMixRotation.sleeping(prefs, morning))
        check(!MorningMixRotation.sleeping(prefs, morning + 3600000))
        prefs.edit().putInt("sleepEnd", 7 * 60).commit()
        check(!MorningMixRotation.sleeping(prefs, morning))
    }
    test("pool matches catalog no-people fallback, dedup and two-per-author cap") {
        val (_, store) = setupRotation()
        val items = catalog(*(0..9).map { "p$it" }.toTypedArray())
        items.getJSONObject(0).put("description", "a portrait")
        for (i in 1..3) items.getJSONObject(i).getJSONObject("user").put("username", "same")
        items.put(items.getJSONObject(4))
        store.publish("a", items, morning)
        val pool = MorningMixRotation.pool(store.snapshot()!!, store.recipe()!!)
        val ids = (0 until pool.length()).map { pool.getJSONObject(it).getString("id") }
        check(ids == listOf("p1", "p2", "p4", "p5", "p6", "p7", "p8", "p9"))
        store.publish("a", JSONArray().put(items.getJSONObject(0)), morning + 1)
        check(MorningMixRotation.pool(store.snapshot()!!, store.recipe()!!).length() == 1)
    }
    test("unsuccessful image download leaves first photo pending, including after store recreation") {
        val prefs = preferences(mutableMapOf("intervalMinutes" to 30))
        val cachePrefs = preferences()
        val store = MorningMixStore(cachePrefs)
        store.configure(JSONObject(recipe("a")).put("rotationMix", true).toString(), "key")
        store.publish("a", catalog("first", "second"), morning)
        val first = MorningMixRotation.select(prefs, store, true)!!
        // No completion/advance: the image transport failed after selection.
        val retry = MorningMixRotation.select(prefs, MorningMixStore(cachePrefs), true)!!
        check(retry.item.getString("id") == first.item.getString("id"))
        BlockedPhotos.advance(prefs, "first")
        prefs.edit().putString("mixAppliedToken", first.token).commit()
        check(MorningMixRotation.select(prefs, MorningMixStore(cachePrefs), true) == null)
        check(BlockedPhotos.next(prefs)!!.getString("id") == "second")
    }
    test("catalog refresh does not invalidate an unrelated collection download") {
        val (prefs, store) = setupRotation()
        prefs.edit().putString("activeCollections", "[\"collection\"]").commit()
        BlockedPhotos.replacePool(prefs, JSONArray().put(JSONObject().put("id", "collection-photo").put("url", "image")), morning)
        val selection = MorningMixRotation.select(prefs, store, false)!!
        store.publish("a", catalog("mix-photo"), morning)
        check(MorningMixRotation.valid(prefs, store, selection, false, morning))
    }
    println("$passed morning mix tests passed")
}
