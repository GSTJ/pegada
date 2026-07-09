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
 * Android side of the "live status" surface: a countdown notification for the
 * daily like limit.
 *
 * - Android 16+ (API 36, Baklava point release with Live Updates): posted as a
 *   promoted ongoing notification with `Notification.ProgressStyle`, which the
 *   system surfaces as a Live Update (status-bar chip + always-on lock-screen
 *   card) when the device supports it.
 * - Older versions: a plain, dismissable notification with a native
 *   chronometer countdown (auto-updating, no app process needed).
 *
 * Both variants auto-dismiss when the countdown ends via `setTimeoutAfter`.
 */
class PegadaLiveStatusModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("PegadaLiveStatus")

    Function("isSupported") {
      NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    AsyncFunction("startLikeCountdown") { options: LiveStatusCountdownOptions ->
      postCountdown(options)
    }

    AsyncFunction("endLikeCountdown") {
      NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    }
  }

  private fun postCountdown(options: LiveStatusCountdownOptions) {
    val manager = NotificationManagerCompat.from(context)
    // Notification permission is requested by the app's regular push flow;
    // if the user said no, quietly do nothing.
    if (!manager.areNotificationsEnabled()) return

    val now = System.currentTimeMillis()
    val endMillis = options.endTimeMillis.toLong()
    if (endMillis <= now) return
    val startMillis = options.startTimeMillis.toLong().coerceAtMost(now)

    ensureChannel(options.channelName)

    val notification =
      if (supportsLiveUpdates()) {
        buildPromotedNotification(options, startMillis, endMillis, now)
      } else {
        buildFallbackNotification(options, endMillis, now)
      }

    manager.notify(NOTIFICATION_ID, notification)
  }

  /**
   * Live Update (Android 16+): promoted ongoing notification with determinate
   * ProgressStyle across the 24h window plus a chronometer countdown.
   */
  private fun buildPromotedNotification(
    options: LiveStatusCountdownOptions,
    startMillis: Long,
    endMillis: Long,
    now: Long,
  ): Notification {
    val total = (endMillis - startMillis).coerceAtLeast(1L)
    val elapsed = (now - startMillis).coerceIn(0L, total)
    // 24h in ms overflows nothing: fits comfortably in Int.
    val progressStyle =
      Notification.ProgressStyle()
        .setStyledByProgress(false)
        .setProgressSegments(
          listOf(Notification.ProgressStyle.Segment(total.toInt()).setColor(BRAND_COLOR)),
        )
        .setProgress(elapsed.toInt())

    return Notification.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(options.title)
      .setContentText(options.body)
      .setContentIntent(buildContentIntent(options.deepLink))
      .setStyle(progressStyle)
      .setColor(BRAND_COLOR)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(true)
      .setWhen(endMillis)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setTimeoutAfter(endMillis - now)
      .setRequestPromotedOngoing(true)
      .build()
  }

  /**
   * Pre-Android-16 fallback: a regular, dismissable notification whose
   * chronometer counts down natively without waking the app.
   */
  private fun buildFallbackNotification(
    options: LiveStatusCountdownOptions,
    endMillis: Long,
    now: Long,
  ): Notification {
    return NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(options.title)
      .setContentText(options.body)
      .setContentIntent(buildContentIntent(options.deepLink))
      .setColor(BRAND_COLOR)
      .setOngoing(false)
      .setOnlyAlertOnce(true)
      .setShowWhen(true)
      .setWhen(endMillis)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setTimeoutAfter(endMillis - now)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .build()
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
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channel =
      NotificationChannel(
        CHANNEL_ID,
        channelName.ifEmpty { CHANNEL_ID },
        NotificationManager.IMPORTANCE_DEFAULT,
      ).apply {
        setSound(null, null)
        enableVibration(false)
      }
    manager.createNotificationChannel(channel)
  }

  /**
   * Live Updates (promoted notifications) shipped in the Android 16 minor
   * release: API 36.1 / `VERSION_CODES_FULL.BAKLAVA_1`. The plain API 36
   * android.jar doesn't even have `setRequestPromotedOngoing`, hence the
   * `SDK_INT_FULL` gate (safe: `SDK_INT_FULL` itself exists since API 36,
   * and `BAKLAVA_1` is a compile-time constant that gets inlined).
   */
  private fun supportsLiveUpdates(): Boolean {
    if (Build.VERSION.SDK_INT < 36) return false
    if (Build.VERSION.SDK_INT_FULL < Build.VERSION_CODES_FULL.BAKLAVA_1) return false

    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    return manager.canPostPromotedNotifications()
  }

  companion object {
    private const val CHANNEL_ID = "live-status"
    private const val NOTIFICATION_ID = 0x1157 // "LIST", live status
    private val BRAND_COLOR = Color.parseColor("#EE61A1")
  }
}
