package com.gorilas.StellarShift

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

/**
 * Дії нотифікації-компаньйона. Застосунок може бути не запущений, тож:
 * - ❤️ і 🚫 пишуться у pending-буфери (pendingFavorites / pendingBlocked)
 *   у WallpaperPrefs — JS зливає їх у свої стори на focus Settings
 *   (той самий патерн, що pendingHistory);
 * - 🚫 додатково ОДРАЗУ видаляє фото з native-пулу і перемикає шпалеру —
 *   «гидота» зникає з екрана негайно, не чекаючи відкриття застосунку;
 * - ⏭ просто перемикає на наступну (applyNext сам оновить нотифікацію).
 */
class NotificationActionReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_FAV = "com.gorilas.StellarShift.NOTIF_FAV"
        const val ACTION_BLOCK = "com.gorilas.StellarShift.NOTIF_BLOCK"
        const val ACTION_NEXT = "com.gorilas.StellarShift.NOTIF_NEXT"

        /** Додає {id,url} у pending-буфер, ігноруючи дублікати по id. Ліміт 50. */
        private fun appendPending(prefs: SharedPreferences, key: String, id: String, url: String) {
            try {
                val arr = JSONArray(prefs.getString(key, "[]"))
                for (i in 0 until arr.length()) {
                    if (arr.getJSONObject(i).optString("id") == id) return // вже там
                }
                arr.put(JSONObject().put("id", id).put("url", url))
                val trimmed = if (arr.length() > 50) {
                    JSONArray().also { t -> for (i in arr.length() - 50 until arr.length()) t.put(arr.get(i)) }
                } else arr
                prefs.edit().putString(key, trimmed.toString()).apply()
            } catch (_: Exception) { }
        }

        /** Прибирає фото з photoPool, щоб ротація його більше не показала. */
        private fun removeFromPool(prefs: SharedPreferences, id: String) {
            try {
                val pool = JSONArray(prefs.getString("photoPool", "[]"))
                val next = JSONArray()
                for (i in 0 until pool.length()) {
                    val item = pool.getJSONObject(i)
                    if (item.optString("id") != id) next.put(item)
                }
                prefs.edit().putString("photoPool", next.toString()).apply()
            } catch (_: Exception) { }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        val photoId = intent.getStringExtra("photoId") ?: return
        val photoUrl = intent.getStringExtra("photoUrl") ?: ""
        val action = intent.action ?: return
        val pendingResult = goAsync()

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val prefs = context.getSharedPreferences("WallpaperPrefs", Context.MODE_PRIVATE)
                when (action) {
                    ACTION_NEXT -> {
                        WallpaperWorker.applyNext(context)
                    }
                    ACTION_BLOCK -> {
                        appendPending(prefs, "pendingBlocked", photoId, photoUrl)
                        removeFromPool(prefs, photoId)
                        // Гидота зникає з екрана негайно. Порожній пул — прибираємо нотифікацію.
                        val applied = WallpaperWorker.applyNext(context)
                        if (!applied) NotificationHelper.cancel(context)
                    }
                    ACTION_FAV -> {
                        appendPending(prefs, "pendingFavorites", photoId, photoUrl)
                        // Підтвердження в шторці: мітка 💜, кнопка ❤️ зникає
                        NotificationHelper.markFavorited(context, photoId, photoUrl)
                    }
                }
            } catch (_: Exception) {
                // дії з шторки — best effort
            } finally {
                pendingResult.finish()
            }
        }
    }
}
