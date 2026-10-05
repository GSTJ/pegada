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
import androidx.annotation.DrawableRes
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.ColorFilter
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
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

private const val MESSAGES_DEEP_LINK = "pegada:///messages"
private const val SWIPE_DEEP_LINK = "pegada:///swipe"
private const val MAX_AVATARS = 3
private const val AVATAR_TARGET_PX = 144

// Design tokens mirrored from packages/shared/themes/themes.ts (light/dark):
// primary hsl(333,81%,66%)/hsl(333,58%,59%), background white/black, text
// hsl(222.2,84%,4.9%)/95%-white. Fixed brand colors on purpose, Material
// You dynamic color would wash out the pink.
private val brandPink = ColorProvider(day = Color(0xFFEF62A1), night = Color(0xFFD35A90))
private val brandPinkFaint = ColorProvider(day = Color(0x2EEF62A1), night = Color(0x2ED35A90))
private val brandSurface = ColorProvider(day = Color(0xFFFDECF4), night = Color(0xFF26101A))
private val widgetBackground = ColorProvider(day = Color(0xFFFFFFFF), night = Color(0xFF000000))
private val primaryText = ColorProvider(day = Color(0xFF020817), night = Color(0xFFF2F2F2))
private val secondaryText = ColorProvider(day = Color(0xFF5B5F6C), night = Color(0xFF999999))

// Glance 1.1.1 ceiling, accepted deliberately: no custom typeface in
// TextStyle (system font, Bold at most, sizes compensate for the missing
// ExtraBold), no gradient brushes, no true negative spacing so avatars sit
// side by side instead of overlapping like iOS.

class MatchesWidget : GlanceAppWidget() {
  // Recompose for the widget's actual dimensions so the declared 140dp
  // minimum gets a compact layout instead of clipping the avatar row.
  override val sizeMode = SizeMode.Exact

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
  val size = LocalSize.current
  val compact = size.width < 226.dp || size.height < 140.dp
  val wide = size.width >= 350.dp && size.height >= 140.dp
  val isAttention =
    snapshot?.loggedIn == true &&
      snapshot.resolvedState == WidgetSnapshotState.ATTENTION &&
      snapshot.count > 0
  val usesWideLayout = isAttention && wide
  // A one-dog widget keeps the full surface tappable. Per-dog targets only
  // earn the loss of the root action when there is a real choice to make.
  val usesPerDogTargets =
    usesWideLayout && dogs.size > 1 && dogs.all { dogDeepLink(it) != null }

  val rootModifier =
    GlanceModifier
      .fillMaxSize()
      .background(widgetBackground)
      .cornerRadius(24.dp)
      .padding(if (compact) 10.dp else 16.dp)

  // RemoteViews does not define useful parent/child click precedence. The
  // wide populated layout therefore has no root click target: every visible
  // dog owns a separate PendingIntent instead.
  val containerModifier =
    if (usesPerDogTargets) {
      rootModifier
    } else {
      rootModifier.clickable(actionStartActivity(openIntent(context, widgetDeepLink(snapshot))))
    }

  Column(
    modifier = containerModifier,
    verticalAlignment = Alignment.CenterVertically,
    horizontalAlignment = Alignment.Start,
  ) {
    if (usesWideLayout) {
      WideMatchesContent(
        context = context,
        snapshot = snapshot,
        dogs = dogs,
        avatars = avatars,
        usesPerDogTargets = usesPerDogTargets,
      )
      return@Column
    }

    BrandHeader()

    Spacer(modifier = GlanceModifier.height(if (compact) 4.dp else 10.dp))

    if (!isAttention) {
      EmptyStateContent(
        context = context,
        snapshot = snapshot,
        dogs = dogs,
        avatars = avatars,
        compact = compact,
        wide = wide,
      )
      return@Column
    }

    val dog = dogs.firstOrNull()
    if (dog == null) {
      Text(
        text = snapshot.message,
        style = TextStyle(color = primaryText, fontSize = 13.sp, fontWeight = FontWeight.Medium),
        maxLines = 3,
      )
      return@Column
    }

    Row(verticalAlignment = Alignment.CenterVertically) {
      AvatarBadge(
        name = dog.name,
        avatar = avatars.firstOrNull(),
        size = if (compact) 40.dp else 52.dp,
      )
      Spacer(modifier = GlanceModifier.width(if (compact) 8.dp else 10.dp))
      Column {
        Text(
          text = dog.prompt ?: snapshot.primary ?: snapshot.message,
          style =
            TextStyle(
              color = primaryText,
              fontSize = if (compact) 13.sp else 15.sp,
              fontWeight = FontWeight.Bold,
            ),
          maxLines = 2,
        )
        Spacer(modifier = GlanceModifier.height(2.dp))
        snapshot.secondary?.let { secondary ->
          Text(
            text = secondary,
            style =
              TextStyle(
                color = secondaryText,
                fontSize = if (compact) 11.sp else 12.sp,
                fontWeight = FontWeight.Medium,
              ),
            maxLines = 2,
          )
        }
      }
    }
  }
}

private fun widgetDeepLink(snapshot: WidgetSnapshot?): Uri {
  if (snapshot?.loggedIn == true) {
    if (snapshot.resolvedState != WidgetSnapshotState.ATTENTION || snapshot.count <= 0) {
      return Uri.parse(SWIPE_DEEP_LINK)
    }

    val heroDog = snapshot.dogs.firstOrNull()
    if (heroDog != null) return dogDeepLink(heroDog) ?: Uri.parse(MESSAGES_DEEP_LINK)
  }

  return Uri.parse(MESSAGES_DEEP_LINK)
}

private fun dogDeepLink(dog: WidgetDog): Uri? {
  val matchId = dog.matchId ?: return null
  val dogId = dog.dogId ?: return null

  return Uri.parse("pegada:///chat/${Uri.encode(matchId)}")
    .buildUpon()
    .appendQueryParameter("dogId", dogId)
    .build()
}

private fun openIntent(context: Context, destination: Uri) =
  Intent(Intent.ACTION_VIEW, destination).apply {
    setPackage(context.packageName)
    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
  }

@Composable
private fun EmptyStateContent(
  context: Context,
  snapshot: WidgetSnapshot?,
  dogs: List<WidgetDog>,
  avatars: List<Bitmap?>,
  compact: Boolean,
  wide: Boolean,
) {
  val primary =
    snapshot?.primary
      ?: snapshot?.message?.takeIf { it.isNotEmpty() }
      ?: context.getString(R.string.pegada_widget_placeholder_primary)
  val secondary =
    snapshot?.secondary
      ?: if (snapshot == null) {
        context.getString(R.string.pegada_widget_placeholder_secondary)
      } else {
        null
      }
  val state = snapshot?.resolvedState

  Row(verticalAlignment = Alignment.CenterVertically) {
    if (state == WidgetSnapshotState.CAUGHT_UP && dogs.isNotEmpty()) {
      CaughtUpFaces(dogs = dogs, avatars = avatars, compact = compact, wide = wide)
    } else {
      val icon =
        when (state) {
          WidgetSnapshotState.SIGNED_OUT -> R.drawable.pegada_widget_account
          WidgetSnapshotState.NO_MATCHES -> R.drawable.pegada_widget_paw
          else -> R.drawable.pegada_widget_open
        }
      StatusBadge(icon = icon, size = if (compact) 42.dp else 56.dp)
    }

    Spacer(modifier = GlanceModifier.width(if (compact) 9.dp else 14.dp))

    Column {
      Text(
        text = primary,
        style =
          TextStyle(
            color = primaryText,
            fontSize = if (compact) 14.sp else if (wide) 18.sp else 16.sp,
            fontWeight = FontWeight.Bold,
          ),
        maxLines = 2,
      )
      if (secondary != null) {
        Spacer(modifier = GlanceModifier.height(2.dp))
        Text(
          text = secondary,
          style =
            TextStyle(
              color = secondaryText,
              fontSize = if (compact) 11.sp else 12.sp,
              fontWeight = FontWeight.Medium,
            ),
          maxLines = 2,
        )
      }
    }
  }
}

@Composable
private fun StatusBadge(@DrawableRes icon: Int, size: Dp) {
  Box(
    modifier = GlanceModifier.size(size).cornerRadius(size / 2).background(brandSurface),
    contentAlignment = Alignment.Center,
  ) {
    Image(
      provider = ImageProvider(icon),
      contentDescription = null,
      // The blush circle carries the brand color; the text token keeps the
      // symbol legible in light and dark widgets.
      colorFilter = ColorFilter.tint(primaryText),
      modifier = GlanceModifier.size(size * 0.46f),
    )
  }
}

@Composable
private fun CaughtUpFaces(
  dogs: List<WidgetDog>,
  avatars: List<Bitmap?>,
  compact: Boolean,
  wide: Boolean,
) {
  val visibleCount = if (compact) 1 else if (wide) 3 else 2
  val heroSize = if (compact) 42.dp else 56.dp
  val supportSize = if (compact) 30.dp else 38.dp

  Row(verticalAlignment = Alignment.CenterVertically) {
    dogs.take(visibleCount).forEachIndexed { index, dog ->
      if (index > 0) {
        Spacer(modifier = GlanceModifier.width(4.dp))
      }
      AvatarBadge(
        name = dog.name,
        avatar = avatars.getOrNull(index),
        size = if (index == 0) heroSize else supportSize,
      )
    }
  }
}

@Composable
private fun WideMatchesContent(
  context: Context,
  snapshot: WidgetSnapshot,
  dogs: List<WidgetDog>,
  avatars: List<Bitmap?>,
  usesPerDogTargets: Boolean,
) {
  val heroDog = dogs.firstOrNull()

  Row(verticalAlignment = Alignment.CenterVertically) {
    if (heroDog != null) {
      val heroDestination = dogDeepLink(heroDog)
      val heroModifier =
        if (usesPerDogTargets && heroDestination != null) {
          GlanceModifier.clickable(
            actionStartActivity(openIntent(context, heroDestination)),
          )
        } else {
          GlanceModifier
        }

      Row(modifier = heroModifier, verticalAlignment = Alignment.CenterVertically) {
        AvatarBadge(name = heroDog.name, avatar = avatars.firstOrNull(), size = 64.dp)
        Spacer(modifier = GlanceModifier.width(12.dp))

        Column(modifier = GlanceModifier.width(128.dp)) {
          BrandHeader()
          Text(
            text = heroDog.prompt ?: snapshot.primary ?: snapshot.message,
            style = TextStyle(color = primaryText, fontSize = 16.sp, fontWeight = FontWeight.Bold),
            maxLines = 2,
          )
          snapshot.secondary?.let { secondary ->
            Text(
              text = secondary,
              style =
                TextStyle(color = secondaryText, fontSize = 12.sp, fontWeight = FontWeight.Medium),
              maxLines = 2,
            )
          }
        }
      }
    }

    Spacer(modifier = GlanceModifier.width(12.dp))

    Row(verticalAlignment = Alignment.Top) {
      dogs.drop(1).take(2).forEachIndexed { index, dog ->
        if (index > 0) {
          Spacer(modifier = GlanceModifier.width(6.dp))
        }
        val dogDestination = dogDeepLink(dog)
        val dogModifier =
          GlanceModifier
            .width(48.dp)
            .let { modifier ->
              if (usesPerDogTargets && dogDestination != null) {
                modifier.clickable(actionStartActivity(openIntent(context, dogDestination)))
              } else {
                modifier
              }
            }

        Column(
          modifier = dogModifier,
          horizontalAlignment = Alignment.CenterHorizontally,
        ) {
          AvatarBadge(name = dog.name, avatar = avatars.getOrNull(index + 1), size = 44.dp)
          Spacer(modifier = GlanceModifier.height(4.dp))
          Text(
            text = dog.name,
            style = TextStyle(color = primaryText, fontSize = 11.sp, fontWeight = FontWeight.Medium),
            maxLines = 1,
          )
        }
      }
    }
  }
}

@Composable
private fun BrandHeader() {
  val context = LocalContext.current

  // Lowercase on purpose: the app's logo wordmark is "pegada".
  Text(
    text = context.getString(R.string.pegada_widget_wordmark),
    style = TextStyle(color = brandPink, fontSize = 14.sp, fontWeight = FontWeight.Bold),
  )
}

// Circular avatar on a background-colored ring (Glance has no stroke-border
// primitive, so the ring is an outer box 4dp larger than the image). Dogs
// without a usable photo get a brand-tinted initial instead of vanishing.
@Composable
private fun AvatarBadge(name: String, avatar: Bitmap?, size: Dp) {
  val innerSize = size - 4.dp

  Box(
    modifier = GlanceModifier.size(size).cornerRadius(size / 2).background(widgetBackground),
    contentAlignment = Alignment.Center,
  ) {
    if (avatar != null) {
      Image(
        provider = ImageProvider(avatar),
        contentDescription = null,
        contentScale = ContentScale.Crop,
        modifier = GlanceModifier.size(innerSize).cornerRadius(innerSize / 2),
      )
    } else {
      Box(
        modifier =
          GlanceModifier.size(innerSize).cornerRadius(innerSize / 2).background(brandPinkFaint),
        contentAlignment = Alignment.Center,
      ) {
        Text(
          text = name.take(1).uppercase(),
          style =
            TextStyle(
              color = brandPink,
              fontSize = if (size < 40.dp) 13.sp else 17.sp,
              fontWeight = FontWeight.Bold,
            ),
        )
      }
    }
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
