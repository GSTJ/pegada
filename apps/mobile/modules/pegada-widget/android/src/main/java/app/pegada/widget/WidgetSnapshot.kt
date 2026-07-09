package app.pegada.widget

import android.content.Context
import org.json.JSONObject

data class WidgetDog(
  val name: String,
  val avatarPath: String?,
)

/**
 * The JSON contract written by JS. Keep in sync with
 * `modules/pegada-widget/index.ts`.
 *
 * [messageCountless] mirrors [message] without the leading count (e.g.
 * "matches waiting for your reply"); layouts that already render the count
 * as its own numeral use this instead so the count isn't shown twice. Null
 * whenever [message] isn't the "waiting for reply" variant.
 */
data class WidgetSnapshot(
  val loggedIn: Boolean,
  val count: Int,
  val message: String,
  val messageCountless: String?,
  val dogs: List<WidgetDog>,
) {
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
                name = dog.optString("name"),
                avatarPath = dog.optString("avatar").takeIf { it.isNotEmpty() },
              ),
            )
          }
        }
      }

      return WidgetSnapshot(
        loggedIn = obj.optBoolean("loggedIn", false),
        count = obj.optInt("count", 0),
        message = obj.optString("message"),
        messageCountless = obj.optString("messageCountless").takeIf { it.isNotEmpty() },
        dogs = dogs,
      )
    }
  }
}
