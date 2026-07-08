package app.pegada.widget

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.color.ColorProvider
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.ContentScale
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle

class MatchesWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = MatchesWidget()
}

private const val MESSAGES_DEEP_LINK = "pegada://messages"
private const val MAX_AVATARS = 3
private const val AVATAR_TARGET_PX = 144

private val brandPink = Color(0xFFEE61A1)
private val background = ColorProvider(day = Color.White, night = Color(0xFF16151A))
private val primaryText = ColorProvider(day = Color(0xFF1C1B1F), night = Color(0xFFF3F1F6))
private val brandText = ColorProvider(day = brandPink, night = brandPink)

class MatchesWidget : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val snapshot = WidgetSnapshot.load(context)

    // Decode outside the composition; Glance renders RemoteViews, so bitmaps
    // must be ready when the tree is emitted. Downsampled + circle-cropped to
    // stay well under the RemoteViews bitmap memory budget.
    val avatars =
      snapshot
        ?.dogs
        .orEmpty()
        .take(MAX_AVATARS)
        .mapNotNull { dog -> dog.avatarPath?.let { path -> loadCircularAvatar(path) } }

    provideContent {
      MatchesWidgetContent(snapshot = snapshot, avatars = avatars)
    }
  }
}

@Composable
private fun MatchesWidgetContent(snapshot: WidgetSnapshot?, avatars: List<Bitmap>) {
  val context = LocalContext.current

  val openMessages =
    Intent(Intent.ACTION_VIEW, Uri.parse(MESSAGES_DEEP_LINK)).apply {
      setPackage(context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

  Column(
    modifier =
      GlanceModifier
        .fillMaxSize()
        .background(background)
        .cornerRadius(24.dp)
        .padding(16.dp)
        .clickable(actionStartActivity(openMessages)),
    verticalAlignment = Alignment.CenterVertically,
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    Text(
      text = "Pegada",
      style = TextStyle(color = brandText, fontSize = 14.sp, fontWeight = FontWeight.Bold),
    )

    Spacer(modifier = GlanceModifier.height(10.dp))

    if (snapshot == null || !snapshot.loggedIn || snapshot.count <= 0) {
      // Placeholder: never written to (fresh install), logged out, or all
      // caught up. The message is pre-localized by JS when a snapshot exists;
      // otherwise fall back to the localized resource string.
      Text(text = "🐾", style = TextStyle(fontSize = 28.sp))
      Spacer(modifier = GlanceModifier.height(8.dp))
      Text(
        text = snapshot?.message?.takeIf { it.isNotEmpty() }
          ?: context.getString(R.string.pegada_widget_placeholder),
        style = TextStyle(color = primaryText, fontSize = 13.sp),
        maxLines = 2,
      )
      return@Column
    }

    Row(verticalAlignment = Alignment.CenterVertically) {
      avatars.forEachIndexed { index, avatar ->
        if (index > 0) {
          Spacer(modifier = GlanceModifier.width(6.dp))
        }
        Image(
          provider = ImageProvider(avatar),
          contentDescription = null,
          contentScale = ContentScale.Crop,
          modifier = GlanceModifier.size(44.dp).cornerRadius(22.dp),
        )
      }

      val overflow = snapshot.count - avatars.size
      if (overflow > 0 && avatars.isNotEmpty()) {
        Spacer(modifier = GlanceModifier.width(6.dp))
        Box(
          modifier =
            GlanceModifier
              .size(44.dp)
              .cornerRadius(22.dp)
              .background(ColorProvider(day = brandPink, night = brandPink)),
          contentAlignment = Alignment.Center,
        ) {
          Text(
            text = "+$overflow",
            style =
              TextStyle(
                color = ColorProvider(day = Color.White, night = Color.White),
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
              ),
          )
        }
      }

      if (avatars.isEmpty()) {
        Text(
          text = "${snapshot.count}",
          style = TextStyle(color = brandText, fontSize = 32.sp, fontWeight = FontWeight.Bold),
        )
      }
    }

    Spacer(modifier = GlanceModifier.height(10.dp))

    Text(
      text = snapshot.message,
      style = TextStyle(color = primaryText, fontSize = 13.sp),
      maxLines = 2,
    )
  }
}

private fun loadCircularAvatar(path: String): Bitmap? {
  val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
  BitmapFactory.decodeFile(path, bounds)
  if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

  var sampleSize = 1
  while (minOf(bounds.outWidth, bounds.outHeight) / (sampleSize * 2) >= AVATAR_TARGET_PX) {
    sampleSize *= 2
  }

  val options = BitmapFactory.Options().apply { inSampleSize = sampleSize }
  val bitmap = BitmapFactory.decodeFile(path, options) ?: return null

  return bitmap.circleCropped()
}

private fun Bitmap.circleCropped(): Bitmap {
  val size = minOf(width, height)
  val output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)

  val canvas = Canvas(output)
  val paint = Paint(Paint.ANTI_ALIAS_FLAG)
  canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint)

  paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
  canvas.drawBitmap(this, (size - width) / 2f, (size - height) / 2f, paint)

  return output
}
