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
    println("$passed morning mix tests passed")
}
