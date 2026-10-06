package com.gorilas.StellarShift

import java.util.Locale

/** Temporary, aggregate-only capture. Called on the wallpaper's main thread. */
internal class ParallaxDiagnostics(
    private val clock: () -> Long = System::nanoTime,
    private val emit: (String) -> Unit,
) {
    private var visible = false
    private var capturing = false
    private var session = 0
    private var started = 0L
    private var windowStarted = 0L
    private var lastFrame = -1L
    private var lastCallback = -1L
    private var lastSensor = -1L
    private var lastArrival = -1L
    private var frames = 0
    private var sensors = 0
    private var skipped = 0
    private var posted = 0
    private var sameVsync = 0
    private var reloadFailures = 0
    private val frameGap = Samples()
    private val callbackGap = Samples()
    private val callbackDelay = Samples()
    private val sensorGap = Samples()
    private val sensorArrival = Samples()
    private val sensorAge = Samples()
    private val drawTime = Samples()
    private val lockTime = Samples()
    private val reloadTime = Samples()
    private val samples = listOf(frameGap, callbackGap, callbackDelay, sensorGap, sensorArrival,
        sensorAge, drawTime, lockTime, reloadTime)

    fun visibility(value: Boolean) {
        if (value == visible) {
            event("visibility_repeat", "visible=$value")
            return
        }
        visible = value
        if (value) {
            session++
            started = clock()
            windowStarted = started
            lastFrame = -1L; lastCallback = -1L; lastSensor = -1L; lastArrival = -1L
            resetWindow()
            capturing = true
            event("visible", "capture_ms=30000")
        } else {
            finish("hidden")
            event("hidden")
        }
    }

    fun event(name: String, details: String = "") {
        emit("session=$session event=$name $details")
    }

    fun frame(vsyncNs: Long) {
        if (!capturing) return
        val now = clock()
        frames++
        if (lastFrame >= 0) {
            frameGap.add(vsyncNs - lastFrame)
            if (vsyncNs == lastFrame) sameVsync++
        }
        if (lastCallback >= 0) callbackGap.add(now - lastCallback)
        callbackDelay.add(now - vsyncNs)
        lastFrame = vsyncNs
        lastCallback = now
    }

    // Sensor timestamps and arrivalNs both use elapsedRealtimeNanos, not nanoTime.
    fun sensor(timestampNs: Long, arrivalNs: Long) {
        if (!capturing) return
        sensors++
        if (lastSensor >= 0) sensorGap.add(timestampNs - lastSensor)
        if (lastArrival >= 0) sensorArrival.add(arrivalNs - lastArrival)
        sensorAge.add(arrivalNs - timestampNs)
        lastSensor = timestampNs
        lastArrival = arrivalNs
    }

    fun draw(lockNs: Long, totalNs: Long, didPost: Boolean) {
        if (!capturing) return
        lockTime.add(lockNs)
        drawTime.add(totalNs)
        if (didPost) posted++
    }

    fun reload(durationNs: Long, success: Boolean) {
        if (!capturing) return
        reloadTime.add(durationNs)
        if (!success) reloadFailures++
    }

    fun endFrame(drew: Boolean) {
        if (!capturing) return
        if (!drew) skipped++
        val now = clock()
        if (now - started >= 30_000_000_000L) finish("timeout", now)
        else if (now - windowStarted >= 2_000_000_000L) report(now, "window")
    }

    fun destroy() {
        finish("destroyed")
        event("destroyed")
    }

    private fun finish(reason: String, now: Long = clock()) {
        if (!capturing) return
        if (frames > 0 || sensors > 0 || reloadTime.count > 0) report(now, reason)
        capturing = false
        event("capture_end", "reason=$reason elapsed_ms=${(now - started) / 1_000_000}")
    }

    private fun report(now: Long, reason: String) {
        emit("session=$session event=sample reason=$reason elapsed_ms=${(now - started) / 1_000_000}" +
            " window_ms=${(now - windowStarted) / 1_000_000} frames=$frames sensors=$sensors" +
            " skipped=$skipped posted=$posted same_vsync=$sameVsync reload_failures=$reloadFailures" +
            " frame_gap_ms=${frameGap.summary()} callback_gap_ms=${callbackGap.summary()}" +
            " callback_delay_ms=${callbackDelay.summary()} sensor_gap_ms=${sensorGap.summary()}" +
            " sensor_arrival_ms=${sensorArrival.summary()} sensor_age_ms=${sensorAge.summary()}" +
            " lock_ms=${lockTime.summary()} draw_ms=${drawTime.summary()} reload_ms=${reloadTime.summary()}")
        resetWindow()
        windowStarted = now
    }

    private fun resetWindow() {
        frames = 0; sensors = 0; skipped = 0; posted = 0; sameVsync = 0; reloadFailures = 0
        samples.forEach { it.clear() }
    }

    private class Samples {
        var count = 0
            private set
        private var sum = 0L
        private var max = 0L
        fun add(ns: Long) {
            if (ns < 0) return
            count++; sum += ns; max = maxOf(max, ns)
        }
        fun clear() { count = 0; sum = 0L; max = 0L }
        // mean/max/count; '-' explicitly means no observations.
        fun summary(): String = if (count == 0) "-" else
            String.format(Locale.ROOT, "%.2f/%.2f/%d", sum.toDouble() / count / 1_000_000,
                max.toDouble() / 1_000_000, count)
    }
}
