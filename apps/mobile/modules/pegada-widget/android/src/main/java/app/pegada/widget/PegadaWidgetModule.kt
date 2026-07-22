package app.pegada.widget

import android.content.Context
import androidx.glance.appwidget.updateAll
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PegadaWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PegadaWidget")

    AsyncFunction("setSnapshot") Coroutine { json: String ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()

      context
        .getSharedPreferences(WidgetSnapshot.PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(WidgetSnapshot.SNAPSHOT_KEY, json)
        .apply()

      // Repaints every placed instance of the widget with the fresh snapshot.
      MatchesWidget().updateAll(context)
    }
  }
}
