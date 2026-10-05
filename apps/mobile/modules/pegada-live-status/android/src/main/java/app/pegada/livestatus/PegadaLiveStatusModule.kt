package app.pegada.livestatus

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class LiveStatusCountdownOptions : Record {
  @Field val title: String = ""
  @Field val body: String = ""
  // iOS-only (stale Live Activity label), accepted for a shared JS call shape.
  @Field val readyLabel: String = ""
  @Field val startTimeMillis: Double = 0.0
  @Field val endTimeMillis: Double = 0.0
  @Field val deepLink: String = ""
  @Field val channelName: String = ""
}

/**
 * Quiet, dismissible countdown for the daily like limit on Android 8+. A
 * like-refill wait does not meet Android's promoted Live Update criteria
 * (ongoing, user-initiated and time-sensitive), so the system notification
 * stays at low importance and auto-dismisses at the reset time.
 */
class PegadaLiveStatusModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("PegadaLiveStatus")

    Function("isSupported") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
        NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    AsyncFunction("startLikeCountdown") { options: LiveStatusCountdownOptions ->
      postCountdown(options)
    }

    AsyncFunction("endLikeCountdown") {
      NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
      preferences.edit().remove(PREF_END_TIME).apply()
    }

    AsyncFunction("reconcileLikeCountdown") {
      reconcileCountdown()
    }
  }

  private val preferences
    get() = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  private fun postCountdown(options: LiveStatusCountdownOptions): Boolean {
    // Notification timeout cleanup and channels both require Android 8.
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false

    val manager = NotificationManagerCompat.from(context)
    // Notification permission is requested by the app's regular push flow;
    // if the user said no, quietly do nothing.
    if (!manager.areNotificationsEnabled()) return false

    val now = System.currentTimeMillis()
    val endMillis = options.endTimeMillis.toLong()
    if (endMillis <= now) return false

    ensureChannel(options.channelName)
    val notification = buildCountdownNotification(options, endMillis, now)
    try {
      manager.notify(NOTIFICATION_ID, notification)
    } catch (_: SecurityException) {
      // Notification permission can be revoked between the check above and
      // posting. Keep a settings change from crashing a blocked swipe.
      return false
    }
    preferences.edit().putLong(PREF_END_TIME, endMillis).apply()
    return true
  }

  private fun buildCountdownNotification(
    options: LiveStatusCountdownOptions,
    endMillis: Long,
    now: Long,
  ): Notification {
    return NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_like_status)
      .setContentTitle(options.title)
      .setContentText(options.body)
      .setContentIntent(buildContentIntent(options.deepLink))
      .setColor(BRAND_COLOR)
      .setOngoing(false)
      .setAutoCancel(true)
      .setCategory(NotificationCompat.CATEGORY_STATUS)
      .setSilent(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(true)
      .setWhen(endMillis)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setTimeoutAfter(endMillis - now)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()
  }

  private fun reconcileCountdown(): Double? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      preferences.edit().remove(PREF_END_TIME).apply()
      return null
    }

    val endMillis = preferences.getLong(PREF_END_TIME, 0L)
    if (endMillis > System.currentTimeMillis()) return endMillis.toDouble()

    NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    preferences.edit().remove(PREF_END_TIME).apply()
    return null
  }

  private fun buildContentIntent(deepLink: String): PendingIntent? {
    if (deepLink.isEmpty()) return null
    val intent =
      Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply {
        setPackage(context.packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
    return PendingIntent.getActivity(
      context,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun ensureChannel(channelName: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channel =
      NotificationChannel(
        CHANNEL_ID,
        channelName.ifEmpty { CHANNEL_ID },
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        setSound(null, null)
        enableVibration(false)
      }
    manager.createNotificationChannel(channel)
  }

  companion object {
    private const val CHANNEL_ID = "live-status"
    private const val NOTIFICATION_ID = 0x1157 // "LIST", live status
    private const val PREFS_NAME = "pegada-live-status"
    private const val PREF_END_TIME = "like-limit-end-time"
    private val BRAND_COLOR = Color.parseColor("#EE61A1")
  }
}
