package com.gorilas.StellarShift

import android.content.Context
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.FileObserver
import android.service.wallpaper.WallpaperService
import android.view.Choreographer
import android.view.SurfaceHolder
import java.io.File
import kotlin.math.abs
import kotlin.math.max

/**
 * Жива шпалера StellarShift: tilt parallax поверх поточного фото ротації.
 *
 * Звідки фото: filesDir/current_wallpaper.jpg — його пише КОЖЕН apply
 * (тік автозміни, «Змінити зараз», ручне встановлення, дії з шторки).
 * Системний bitmap на Android 14+ недоступний (знахідка R&D) — файл наш.
 *
 * Гаряче оновлення: FileObserver на файлі → crossfade ~600мс на нове фото.
 * Автозміна/шторка/тихі години працюють без змін — двигун просто бачить файл.
 *
 * Рендер: Choreographer (vsync) — фікс 120Гц-шиммера з R&D. Малюємо тільки
 * коли є рух (tilt не доїхав до цілі / йде fade / перезавантаження) —
 * у спокої кадри пропускаються, батарея не гріється.
 *
 * Інтенсивність: prefs lwIntensity (px зсуву, default 60), слухач змін —
 * крутиться наживо навіть при відкритому preview.
 */
class LiveWallpaperService : WallpaperService() {

    override fun onCreateEngine(): Engine = ParallaxEngine()

    private inner class ParallaxEngine : Engine(), SensorEventListener,
        SharedPreferences.OnSharedPreferenceChangeListener {

        private val prefs: SharedPreferences by lazy {
            getSharedPreferences("WallpaperPrefs", Context.MODE_PRIVATE)
        }
        private val sensorManager by lazy { getSystemService(SENSOR_SERVICE) as SensorManager }
        private val accelerometer by lazy { sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) }
        private val choreographer by lazy { Choreographer.getInstance() }

        private var visible = false
        private var surfaceWidth = 0
        private var surfaceHeight = 0

        private var currentBitmap: Bitmap? = null
        private var prevBitmap: Bitmap? = null      // для crossfade
        private var fadeStartMs = 0L
        private val fadeDurationMs = 600L
        @Volatile private var pendingReload = false

        // sensor → target, кадровий цикл → offset (рівне згладжування, R&D-тюнинг)
        private var targetX = 0f
        private var targetY = 0f
        private var offsetX = 0f
        private var offsetY = 0f
        private var maxShift = 60f
        private val smoothing = 0.15f
        private var needsRedraw = true

        private val fadePaint = Paint()
        private var fileObserver: FileObserver? = null

        private val frameCallback = object : Choreographer.FrameCallback {
            override fun doFrame(frameTimeNanos: Long) {
                if (!visible) return
                if (pendingReload) {
                    pendingReload = false
                    reloadBitmap(withFade = true)
                }
                offsetX += (targetX - offsetX) * smoothing
                offsetY += (targetY - offsetY) * smoothing
                val moving = abs(targetX - offsetX) > 0.3f || abs(targetY - offsetY) > 0.3f
                if (!moving) { offsetX = targetX; offsetY = targetY }
                val fading = fadeStartMs > 0L
                if (moving || fading || needsRedraw) {
                    drawFrame()
                    needsRedraw = false
                }
                choreographer.postFrameCallback(this)
            }
        }

        // ── lifecycle ──

        override fun onSurfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
            super.onSurfaceChanged(holder, format, width, height)
            surfaceWidth = width
            surfaceHeight = height
            needsRedraw = true
        }

        override fun onVisibilityChanged(isVisible: Boolean) {
            visible = isVisible
            if (isVisible) {
                maxShift = prefs.getInt("lwIntensity", 60).toFloat()
                prefs.registerOnSharedPreferenceChangeListener(this)
                // файл міг змінитись поки нас не було видно — перечитуємо без fade
                reloadBitmap(withFade = false)
                startFileObserver()
                accelerometer?.let {
                    sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
                }
                needsRedraw = true
                choreographer.postFrameCallback(frameCallback)
            } else {
                choreographer.removeFrameCallback(frameCallback)
                sensorManager.unregisterListener(this)
                stopFileObserver()
                prefs.unregisterOnSharedPreferenceChangeListener(this)
            }
        }

        override fun onDestroy() {
            super.onDestroy()
            choreographer.removeFrameCallback(frameCallback)
            sensorManager.unregisterListener(this)
            stopFileObserver()
            prefs.unregisterOnSharedPreferenceChangeListener(this)
            currentBitmap = null
            prevBitmap = null
        }

        // ── вхідні події ──

        override fun onSensorChanged(event: SensorEvent) {
            if (event.sensor.type != Sensor.TYPE_ACCELEROMETER) return
            // ±3 м/с² → повний зсув; знак X інверсний (нахил вправо → фото вліво)
            targetX = -clamp(event.values[0] / 3f, -1f, 1f) * maxShift
            targetY = clamp(event.values[1] / 3f, -1f, 1f) * maxShift
        }

        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

        override fun onSharedPreferenceChanged(p: SharedPreferences?, key: String?) {
            if (key == "lwIntensity") {
                maxShift = prefs.getInt("lwIntensity", 60).toFloat()
                needsRedraw = true
            }
        }

        // ── файл ──

        private fun currentFile(): File = File(filesDir, NotificationHelper.CURRENT_FILE)

        private fun startFileObserver() {
            stopFileObserver()
            val f = currentFile()
            fileObserver = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                object : FileObserver(f, CLOSE_WRITE or MOVED_TO) {
                    override fun onEvent(event: Int, path: String?) { pendingReload = true }
                }
            } else {
                @Suppress("DEPRECATION")
                object : FileObserver(f.absolutePath, CLOSE_WRITE or MOVED_TO) {
                    override fun onEvent(event: Int, path: String?) { pendingReload = true }
                }
            }
            fileObserver?.startWatching()
        }

        private fun stopFileObserver() {
            fileObserver?.stopWatching()
            fileObserver = null
        }

        private fun reloadBitmap(withFade: Boolean) {
            try {
                val f = currentFile()
                if (!f.exists()) return
                val fresh = BitmapFactory.decodeFile(f.absolutePath) ?: return
                if (withFade && currentBitmap != null) {
                    prevBitmap = currentBitmap
                    fadeStartMs = System.currentTimeMillis()
                }
                currentBitmap = fresh
                needsRedraw = true
            } catch (_: Exception) {
                // лишаємось на старому фото
            }
        }

        // ── рендер ──

        private fun drawFrame() {
            val holder = surfaceHolder
            var canvas: Canvas? = null
            try {
                canvas = holder.lockCanvas() ?: return
                canvas.drawColor(Color.rgb(10, 10, 26)) // бренд-фон #0a0a1a
                val cur = currentBitmap
                if (cur != null && surfaceWidth > 0 && surfaceHeight > 0) {
                    val fading = fadeStartMs > 0L
                    if (fading) {
                        val t = (System.currentTimeMillis() - fadeStartMs).toFloat() / fadeDurationMs
                        if (t >= 1f) {
                            fadeStartMs = 0L
                            prevBitmap = null
                            drawCover(canvas, cur, 255)
                        } else {
                            prevBitmap?.let { drawCover(canvas, it, 255) }
                            drawCover(canvas, cur, (t * 255).toInt())
                        }
                    } else {
                        drawCover(canvas, cur, 255)
                    }
                }
            } finally {
                if (canvas != null) {
                    try { holder.unlockCanvasAndPost(canvas) } catch (_: IllegalStateException) { }
                }
            }
        }

        /** Cover-скейл з полями 2*maxShift, зсув по offsetX/Y, опційна alpha для fade. */
        private fun drawCover(canvas: Canvas, bmp: Bitmap, alpha: Int) {
            val srcW = bmp.width.toFloat()
            val srcH = bmp.height.toFloat()
            val scale = max(
                (surfaceWidth + 2 * maxShift) / srcW,
                (surfaceHeight + 2 * maxShift) / srcH
            )
            val drawW = (srcW * scale).toInt()
            val drawH = (srcH * scale).toInt()
            val left = ((surfaceWidth - drawW) / 2 + offsetX).toInt()
            val top = ((surfaceHeight - drawH) / 2 + offsetY).toInt()
            fadePaint.alpha = alpha
            canvas.drawBitmap(bmp, null, Rect(left, top, left + drawW, top + drawH), fadePaint)
        }

        private fun clamp(v: Float, lo: Float, hi: Float): Float =
            if (v < lo) lo else if (v > hi) hi else v
    }
}
