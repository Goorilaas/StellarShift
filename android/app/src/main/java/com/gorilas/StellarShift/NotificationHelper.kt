package com.gorilas.StellarShift

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.io.File
import java.io.FileOutputStream

/**
 * Нотифікація-компаньйон автозміни: «Зараз на екрані» з фото і діями
 * ❤️ / 🚫 / ⏭ у шторці. Канал тихий (IMPORTANCE_LOW), один фіксований ID —
 * кожен тік оновлює нотифікацію на місці.
 *
 * Локалізовані рядки НЕ зашиті в Kotlin: JS пише переклади у WallpaperPrefs
 * (setNotificationStrings), тут лише читаємо з UA-фолбеками.
 *
 * Поточне фото кешується у filesDir/current_wallpaper.jpg — потрібно для
 * re-post з міткою 💜 після ❤️, а заодно це фундамент v4.0.0 Live Wallpaper
 * (file-based bitmap замість недоступного на Android 14+ системного).
 */
object NotificationHelper {

    private const val CHANNEL_ID = "wallpaper_rotation"
    private const val NOTIF_ID = 4242
    const val CURRENT_FILE = "current_wallpaper.jpg"

    private fun prefs(context: Context) =
        context.getSharedPreferences("WallpaperPrefs", Context.MODE_PRIVATE)

    /** Toggle юзера (default ON) + системний дозвіл разом. */
    fun isEnabled(context: Context): Boolean {
        if (!prefs(context).getBoolean("notifyEnabled", true)) return false
        return NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val name = prefs(context).getString("notifChannelName", null) ?: "Автозміна шпалер"
        val channel = NotificationChannel(CHANNEL_ID, name, NotificationManager.IMPORTANCE_LOW)
        channel.setShowBadge(false)
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(channel)
    }

    private fun scaleTo(src: Bitmap, maxDim: Int): Bitmap {
        val w = src.width
        val h = src.height
        if (w <= maxDim && h <= maxDim) return src
        val scale = maxDim.toFloat() / maxOf(w, h)
        return Bitmap.createScaledBitmap(src, (w * scale).toInt(), (h * scale).toInt(), true)
    }

    /** Кеш поточного фото — для re-post мітки 💜 і майбутнього Live Wallpaper. */
    fun saveCurrentToFile(context: Context, bitmap: Bitmap) {
        try {
            val scaled = scaleTo(bitmap, 1440)
            FileOutputStream(File(context.filesDir, CURRENT_FILE)).use { out ->
                scaled.compress(Bitmap.CompressFormat.JPEG, 88, out)
            }
        } catch (_: Exception) {
            // кеш — best effort
        }
    }

    private fun loadCurrentFromFile(context: Context): Bitmap? = try {
        val f = File(context.filesDir, CURRENT_FILE)
        if (f.exists()) BitmapFactory.decodeFile(f.absolutePath) else null
    } catch (_: Exception) {
        null
    }

    private fun actionIntent(context: Context, action: String, requestCode: Int, id: String, url: String): PendingIntent {
        val intent = Intent(context, NotificationActionReceiver::class.java).apply {
            this.action = action
            putExtra("photoId", id)
            putExtra("photoUrl", url)
        }
        return PendingIntent.getBroadcast(
            context, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /**
     * Постить/оновлює нотифікацію. Згорнуто — largeIcon-тамбнейл,
     * розгорнуто — BigPicture на весь банер.
     */
    fun showApplied(context: Context, bitmap: Bitmap, photoId: String, photoUrl: String, favorited: Boolean = false) {
        if (!isEnabled(context)) return
        try {
            ensureChannel(context)
            val p = prefs(context)
            val title = p.getString("notifTitle", null) ?: "Зараз на екрані"
            val favLabel = p.getString("notifFav", null) ?: "В улюблені"
            val blockLabel = p.getString("notifBlock", null) ?: "Більше ніколи"
            val nextLabel = p.getString("notifNext", null) ?: "Далі"
            val favDone = p.getString("notifFavDone", null) ?: "💜 Додано в улюблені"

            val thumb = scaleTo(bitmap, 256)
            val big = scaleTo(bitmap, 960)

            val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
            val contentPI = PendingIntent.getActivity(
                context, 0, launch,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val builder = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setLargeIcon(thumb)
                .setStyle(
                    NotificationCompat.BigPictureStyle()
                        .bigPicture(big)
                        .bigLargeIcon(null as Bitmap?)
                )
                .setContentIntent(contentPI)
                .setOnlyAlertOnce(true)
                .setOngoing(false)
                .setAutoCancel(false)

            if (favorited) {
                builder.setContentText(favDone)
            } else {
                // Дію ❤️ показуємо тільки поки фото ще не лайкнуте
                builder.addAction(0, favLabel, actionIntent(context, NotificationActionReceiver.ACTION_FAV, 1, photoId, photoUrl))
            }
            builder.addAction(0, blockLabel, actionIntent(context, NotificationActionReceiver.ACTION_BLOCK, 2, photoId, photoUrl))
            builder.addAction(0, nextLabel, actionIntent(context, NotificationActionReceiver.ACTION_NEXT, 3, photoId, photoUrl))

            NotificationManagerCompat.from(context).notify(NOTIF_ID, builder.build())
        } catch (_: Exception) {
            // нотифікація ніколи не ламає apply
        }
    }

    /** Re-post поточної нотифікації з міткою 💜 (фото — з файлового кешу). */
    fun markFavorited(context: Context, photoId: String, photoUrl: String) {
        val bmp = loadCurrentFromFile(context) ?: return
        showApplied(context, bmp, photoId, photoUrl, favorited = true)
    }

    fun cancel(context: Context) {
        try {
            NotificationManagerCompat.from(context).cancel(NOTIF_ID)
        } catch (_: Exception) { }
    }
}
