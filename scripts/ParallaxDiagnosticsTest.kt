package com.gorilas.StellarShift

private class Capture {
    var now = 1_000_000_000L
    val lines = mutableListOf<String>()
    val diagnostics = ParallaxDiagnostics({ now }, lines::add)
    fun sample() = lines.last { "event=sample" in it }.split(' ').associate {
        val pair = it.split('=', limit = 2); pair[0] to pair[1]
    }
}
private var passed = 0
private fun test(name: String, body: () -> Unit) { body(); passed++; println("PASS $name") }

fun main() {
    test("no frame/sensor/reload output while hidden") {
        val c = Capture(); val d = c.diagnostics
        repeat(500) { d.frame(c.now); d.sensor(1, 2); d.draw(1, 0, 1, 2, true, true); d.reload(1, true); d.endFrame(true) }
        check(c.lines.isEmpty())
    }
    test("sensor sampling and delivery clocks remain independent; draw and lock costs are separate") {
        val c = Capture(); val d = c.diagnostics
        d.visibility(true)
        d.frame(c.now); d.sensor(10_000_000_000L, 10_002_000_000L)
        d.draw(2_000_000, 1_000_000, 2_000_000, 5_000_000, true, true); d.endFrame(true)
        c.now += 20_000_000
        d.frame(c.now - 12_000_000); d.sensor(10_020_000_000L, 10_062_000_000L)
        d.draw(3_000_000, 1_000_000, 3_000_000, 7_000_000, false, false); d.endFrame(true)
        d.visibility(false)
        val s = c.sample()
        check(s["frames"] == "2" && s["sensors"] == "2" && s["posted"] == "1")
        check(s["frame_gap_ms"] == "8.00/8.00/1")
        check(s["callback_gap_ms"] == "20.00/20.00/1")
        check(s["callback_delay_ms"] == "6.00/12.00/2")
        check(s["sensor_gap_ms"] == "20.00/20.00/1")
        check(s["sensor_arrival_ms"] == "60.00/60.00/1")
        check(s["sensor_age_ms"] == "22.00/42.00/2")
        check(s["render_ms"] == "1.00/1.00/2" && s["post_ms"] == "2.50/3.00/2")
        check(s["hardware_draws"] == "1")
        check(s["lock_ms"] == "2.50/3.00/2" && s["draw_ms"] == "6.00/7.00/2")
    }
    test("30 second capture emits at most fifteen aggregate windows then stops") {
        val c = Capture(); val d = c.diagnostics; d.visibility(true)
        repeat(5000) {
            c.now += 10_000_000
            d.frame(c.now); d.sensor(c.now, c.now); d.draw(1, 0, 1, 2, true, true); d.endFrame(true)
        }
        check(c.lines.count { "event=sample" in it } == 15)
        check(c.lines.count { "event=capture_end" in it } == 1)
        check(c.lines.last().contains("reason=timeout elapsed_ms=30000"))
        check(c.sample()["frames"] == "200")
    }
    test("visibility repeat does not restart capture; hide/show resets clocks and session") {
        val c = Capture(); val d = c.diagnostics; d.visibility(true)
        d.frame(c.now); d.endFrame(false)
        c.now += 10_000_000_000; d.visibility(true)
        d.frame(c.now); d.endFrame(false)
        check(c.sample()["elapsed_ms"] == "10000")
        check(c.sample()["session"] == "1")
        d.visibility(false)
        c.now += 60_000_000_000; d.visibility(true); d.frame(c.now); d.endFrame(false); d.visibility(false)
        check(c.sample()["session"] == "2")
        check(c.sample()["frame_gap_ms"] == "-" && c.sample()["frames"] == "1")
    }
    test("idle frames, duplicate vsync and bitmap reload failures are observable") {
        val c = Capture(); val d = c.diagnostics; d.visibility(true)
        d.frame(c.now); d.endFrame(false)
        d.frame(c.now); d.endFrame(false)
        d.reload(100_000_000, true); d.reload(200_000_000, false)
        d.visibility(false)
        val s = c.sample()
        check(s["same_vsync"] == "1" && s["skipped"] == "2" && s["posted"] == "0")
        check(s["draw_ms"] == "-" && s["sensor_gap_ms"] == "-")
        check(s["reload_ms"] == "150.00/200.00/2" && s["reload_failures"] == "1")
    }
    test("long stall is reported on next frame without producing a backlog of log lines") {
        val c = Capture(); val d = c.diagnostics; d.visibility(true)
        d.frame(c.now); d.endFrame(false)
        c.now += 35_000_000_000; d.frame(c.now); d.endFrame(false)
        check(c.lines.count { "event=sample" in it } == 1)
        check(c.sample()["callback_gap_ms"] == "35000.00/35000.00/1")
        check(c.sample()["window_ms"] == "35000")
        check(c.lines.last().contains("reason=timeout"))
    }
    test("destroy flushes partial capture exactly once and disables subsequent measurements") {
        val c = Capture(); val d = c.diagnostics; d.visibility(true)
        d.frame(c.now); d.endFrame(false); d.destroy()
        c.now += 3_000_000_000; d.frame(c.now); d.endFrame(false); d.visibility(false)
        check(c.lines.count { "event=sample" in it } == 1)
        check(c.lines.count { "event=capture_end" in it } == 1)
        check(c.sample()["reason"] == "destroyed")
    }
    test("timestamp gaps cross report boundaries and negative durations are not counted") {
        val c = Capture(); val d = c.diagnostics; d.visibility(true)
        d.frame(c.now); d.endFrame(false)
        c.now += 2_000_000_000; d.frame(c.now); d.endFrame(false)
        c.now += 100_000_000; d.frame(c.now); d.sensor(100, 90); d.endFrame(false); d.visibility(false)
        check(c.sample()["frame_gap_ms"] == "100.00/100.00/1")
        check(c.sample()["sensor_age_ms"] == "-")
    }
    test("per-window summaries expose a cadence drop after ten seconds instead of averaging the session") {
        val c = Capture(); val d = c.diagnostics; d.visibility(true)
        d.frame(c.now); d.endFrame(false)
        repeat(5) {
            repeat(250) { c.now += 8_000_000; d.frame(c.now); d.endFrame(false) }
        }
        check(c.sample()["elapsed_ms"] == "10000")
        check(c.sample()["frame_gap_ms"] == "8.00/8.00/250")
        repeat(63) { c.now += 32_000_000; d.frame(c.now); d.endFrame(false) }
        check(c.sample()["frame_gap_ms"] == "32.00/32.00/63")
        check(c.sample()["elapsed_ms"] == "12016")
    }
    println("$passed parallax diagnostic tests passed")
}
