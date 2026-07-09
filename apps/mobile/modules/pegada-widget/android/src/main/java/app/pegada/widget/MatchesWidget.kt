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
import androidx.glance.ColorFilter
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

// Design tokens mirrored from packages/shared/themes/themes.ts (light/dark):
// primary hsl(333,81%,66%)/hsl(333,58%,59%), background white/black, text
// hsl(222.2,84%,4.9%)/95%-white. Fixed brand colors on purpose, Material
// You dynamic color would wash out the pink.
private val brandPink = ColorProvider(day = Color(0xFFEF62A1), night = Color(0xFFD35A90))
private val brandPinkFaint = ColorProvider(day = Color(0x2EEF62A1), night = Color(0x2ED35A90))
private val widgetBackground = ColorProvider(day = Color(0xFFFFFFFF), night = Color(0xFF000000))
private val primaryText = ColorProvider(day = Color(0xFF020817), night = Color(0xFFF2F2F2))
private val onPink = ColorProvider(day = Color.White, night = Color.White)

// Glance 1.1.1 ceiling, accepted deliberately: no custom typeface in
// TextStyle (system font, Bold at most, sizes compensate for the missing
// ExtraBold), no gradient brushes, no true negative spacing so avatars sit
// side by side instead of overlapping like iOS.

class MatchesWidget : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val snapshot = WidgetSnapshot.load(context)

    // Decode outside the composition; Glance renders RemoteViews, so bitmaps
    // must be ready when the tree is emitted. Downsampled + circle-cropped to
    // stay well under the RemoteViews bitmap memory budget. Slots stay
    // aligned with `dogs`: a failed decode falls back to an initial badge
    // instead of silently collapsing the row.
    val dogs = snapshot?.dogs.orEmpty().take(MAX_AVATARS)
    val avatars = dogs.map { dog -> dog.avatarPath?.let { path -> loadCircularAvatar(path) } }

    provideContent {
      MatchesWidgetContent(snapshot = snapshot, dogs = dogs, avatars = avatars)
    }
  }
}

@Composable
private fun MatchesWidgetContent(
  snapshot: WidgetSnapshot?,
  dogs: List<WidgetDog>,
  avatars: List<Bitmap?>,
) {
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
        .background(widgetBackground)
        .cornerRadius(24.dp)
        .padding(16.dp)
        .clickable(actionStartActivity(openMessages)),
    verticalAlignment = Alignment.CenterVertically,
    horizontalAlignment = Alignment.Start,
  ) {
    BrandHeader()

    Spacer(modifier = GlanceModifier.height(10.dp))

    if (snapshot == null || !snapshot.loggedIn || snapshot.count <= 0) {
      // Placeholder: never written to (fresh install), logged out, or all
      // caught up. The message is pre-localized by JS when a snapshot exists;
      // otherwise fall back to the localized resource string.
      Text(
        text = snapshot?.message?.takeIf { it.isNotEmpty() }
          ?: context.getString(R.string.pegada_widget_placeholder),
        style = TextStyle(color = primaryText, fontSize = 13.sp, fontWeight = FontWeight.Medium),
        maxLines = 3,
      )
      return@Column
    }

    Row(verticalAlignment = Alignment.CenterVertically) {
      dogs.forEachIndexed { index, dog ->
        if (index > 0) {
          Spacer(modifier = GlanceModifier.width(6.dp))
        }
        AvatarBadge(name = dog.name, avatar = avatars.getOrNull(index))
      }

      val overflow = snapshot.count - dogs.size
      if (overflow > 0 && dogs.isNotEmpty()) {
        Spacer(modifier = GlanceModifier.width(6.dp))
        OverflowChip(overflow)
      }

      if (dogs.isEmpty()) {
        // No avatars at all: fall back to the big friendly number. 34sp
        // compensates for Bold being the heaviest weight Glance offers.
        Text(
          text = "${snapshot.count}",
          style = TextStyle(color = brandPink, fontSize = 34.sp, fontWeight = FontWeight.Bold),
        )
      }
    }

    Spacer(modifier = GlanceModifier.height(8.dp))

    Text(
      // The big numeral above already carries the count when there are no
      // avatars to show, so that layout uses the countless copy to avoid
      // showing the count twice.
      text = (if (dogs.isEmpty()) snapshot.messageCountless else null) ?: snapshot.message,
      style = TextStyle(color = primaryText, fontSize = 13.sp, fontWeight = FontWeight.Medium),
      maxLines = 2,
    )
  }
}

// Paw glyph + wordmark, tinted with the brand pink of the current theme.
// The paw lives only here, one paw reference per surface.
@Composable
private fun BrandHeader() {
  Row(verticalAlignment = Alignment.CenterVertically) {
    Image(
      provider = ImageProvider(R.drawable.pegada_widget_paw),
      contentDescription = null,
      colorFilter = ColorFilter.tint(brandPink),
      modifier = GlanceModifier.size(14.dp),
    )
    Spacer(modifier = GlanceModifier.width(5.dp))
    // Lowercase on purpose: the app's logo wordmark is "pegada".
    Text(
      text = "pegada",
      style = TextStyle(color = brandPink, fontSize = 14.sp, fontWeight = FontWeight.Bold),
    )
  }
}

// Circular avatar on a background-colored ring (Glance has no stroke-border
// primitive, so the ring is an outer box 4dp larger than the image). Dogs
// without a usable photo get a brand-tinted initial instead of vanishing.
@Composable
private fun AvatarBadge(name: String, avatar: Bitmap?) {
  Box(
    modifier = GlanceModifier.size(44.dp).cornerRadius(22.dp).background(widgetBackground),
    contentAlignment = Alignment.Center,
  ) {
    if (avatar != null) {
      Image(
        provider = ImageProvider(avatar),
        contentDescription = null,
        contentScale = ContentScale.Crop,
        modifier = GlanceModifier.size(40.dp).cornerRadius(20.dp),
      )
    } else {
      Box(
        modifier = GlanceModifier.size(40.dp).cornerRadius(20.dp).background(brandPinkFaint),
        contentAlignment = Alignment.Center,
      ) {
        Text(
          text = name.take(1).uppercase(),
          style = TextStyle(color = brandPink, fontSize = 17.sp, fontWeight = FontWeight.Bold),
        )
      }
    }
  }
}

// "+N" coin, same size as the avatars so the overflow reads as one more
// member of the pack.
@Composable
private fun OverflowChip(count: Int) {
  Box(
    modifier = GlanceModifier.size(44.dp).cornerRadius(22.dp).background(brandPink),
    contentAlignment = Alignment.Center,
  ) {
    Text(
      text = "+$count",
      style = TextStyle(color = onPink, fontSize = 14.sp, fontWeight = FontWeight.Bold),
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
