package app.pegada.widget

import android.content.Context
import org.json.JSONObject

data class WidgetDog(
  val matchId: String?,
  val dogId: String?,
  val name: String,
  val avatarPath: String?,
  val prompt: String?,
)

enum class WidgetSnapshotState(val wireValue: String) {
  ATTENTION("attention"),
  CAUGHT_UP("caughtUp"),
  NO_MATCHES("noMatches"),
  SIGNED_OUT("signedOut");

  companion object {
    fun fromWireValue(value: String): WidgetSnapshotState? = entries.firstOrNull {
      it.wireValue == value
    }
  }
}

/**
 * The JSON contract written by JS. Keep in sync with
 * `modules/pegada-widget/index.ts`.
 */
data class WidgetSnapshot(
  val state: WidgetSnapshotState?,
  val loggedIn: Boolean,
  val count: Int,
  val primary: String?,
  val secondary: String?,
  val message: String,
  val dogs: List<WidgetDog>,
) {
  val resolvedState: WidgetSnapshotState
    get() =
      state
        ?: when {
          !loggedIn -> WidgetSnapshotState.SIGNED_OUT
          count > 0 -> WidgetSnapshotState.ATTENTION
          else -> WidgetSnapshotState.CAUGHT_UP
        }

  companion object {
    const val PREFS_NAME = "pegada_widget"
    const val SNAPSHOT_KEY = "matchesWidgetSnapshot"

    fun load(context: Context): WidgetSnapshot? {
      val json =
        context
          .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
          .getString(SNAPSHOT_KEY, null) ?: return null

      // A malformed snapshot should render the placeholder, never crash the
      // widget host.
      return runCatching { parse(json) }.getOrNull()
    }

    private fun parse(json: String): WidgetSnapshot {
      val obj = JSONObject(json)

      val dogsJson = obj.optJSONArray("dogs")
      val dogs = buildList {
        if (dogsJson != null) {
          for (index in 0 until dogsJson.length()) {
            val dog = dogsJson.getJSONObject(index)
            add(
              WidgetDog(
                matchId = dog.optNullableString("matchId"),
                dogId = dog.optNullableString("dogId"),
                name = dog.optString("name"),
                avatarPath = dog.optNullableString("avatar"),
                prompt = dog.optNullableString("prompt"),
              ),
            )
          }
        }
      }

      return WidgetSnapshot(
        state = obj.optNullableString("state")?.let(WidgetSnapshotState::fromWireValue),
        loggedIn = obj.optBoolean("loggedIn", false),
        count = obj.optInt("count", 0),
        primary = obj.optNullableString("primary"),
        secondary = obj.optNullableString("secondary"),
        message = obj.optString("message"),
        dogs = dogs,
      )
    }
  }
}

private fun JSONObject.optNullableString(key: String): String? =
  if (isNull(key)) null else optString(key).takeIf(String::isNotEmpty)
