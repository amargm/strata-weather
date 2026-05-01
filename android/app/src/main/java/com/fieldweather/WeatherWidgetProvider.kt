package com.fieldweather

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.util.Log
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.roundToInt

class WeatherWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d(TAG, "onUpdate called for ${appWidgetIds.size} widget(s)")
        for (appWidgetId in appWidgetIds) {
            refreshWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        Log.d(TAG, "onReceive action=${intent.action}")
        if (intent.action == ACTION_REFRESH) {
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(ComponentName(context, WeatherWidgetProvider::class.java))
            Log.d(TAG, "WIDGET_REFRESH → updating ${ids.size} widget(s)")
            for (id in ids) {
                refreshWidget(context, mgr, id)
            }
        }
    }

    companion object {
        private const val TAG = "StrataWidget"
        private const val ACTION_REFRESH = "com.fieldweather.WIDGET_REFRESH"
        const val PREFS_NAME = "weather_widget"

        /**
         * Public entry point so AppConfigModule can call this directly
         * after writing SharedPreferences — no broadcast needed.
         */
        fun refreshAllWidgets(context: Context) {
            try {
                val mgr = AppWidgetManager.getInstance(context)
                val ids = mgr.getAppWidgetIds(
                    ComponentName(context, WeatherWidgetProvider::class.java)
                )
                Log.d(TAG, "refreshAllWidgets: ${ids.size} widget(s) on screen")
                for (id in ids) {
                    refreshWidget(context, mgr, id)
                }
            } catch (t: Throwable) {
                Log.e(TAG, "refreshAllWidgets failed", t)
            }
        }

        private fun refreshWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            try {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val hasData = prefs.contains("temp") && prefs.getLong("updated_at", 0L) > 0
                Log.d(TAG, "refreshWidget id=$appWidgetId hasData=$hasData")

                val views = RemoteViews(context.packageName, R.layout.widget_weather)

                if (hasData) {
                    populateFromCache(views, prefs)
                } else {
                    populateDefaults(views)
                }

                setClickIntents(context, views, appWidgetId)
                appWidgetManager.updateAppWidget(appWidgetId, views)
                Log.d(TAG, "Widget $appWidgetId updated successfully")
            } catch (t: Throwable) {
                Log.e(TAG, "Error updating widget $appWidgetId", t)
                // Last-resort: try to show error state
                try {
                    val views = RemoteViews(context.packageName, R.layout.widget_weather)
                    populateDefaults(views)
                    setClickIntents(context, views, appWidgetId)
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                } catch (t2: Throwable) {
                    Log.e(TAG, "Even error state failed", t2)
                }
            }
        }

        private fun populateFromCache(views: RemoteViews, prefs: SharedPreferences) {
            views.setTextViewText(R.id.widget_location,
                prefs.getString("location_name", "Unknown") ?: "Unknown")
            views.setTextViewText(R.id.widget_condition,
                prefs.getString("condition_label", "--") ?: "--")

            val temp = prefs.getFloat("temp", 0f).roundToInt()
            views.setTextViewText(R.id.widget_temp, "$temp")
            views.setTextViewText(R.id.widget_feels,
                "Feels ${prefs.getFloat("feels_like", 0f).roundToInt()}°")
            views.setTextViewText(R.id.widget_hi,
                "↑ ${prefs.getFloat("hi_temp", 0f).roundToInt()}°")
            views.setTextViewText(R.id.widget_lo,
                "  ↓ ${prefs.getFloat("lo_temp", 0f).roundToInt()}°")
            views.setTextViewText(R.id.widget_humidity_val,
                "${prefs.getFloat("humidity", 0f).roundToInt()}%")
            views.setTextViewText(R.id.widget_wind_val,
                "${prefs.getFloat("wind_speed", 0f).roundToInt()}mph")
            views.setTextViewText(R.id.widget_uv_val,
                "UV ${prefs.getFloat("uv_index", 0f).roundToInt()}")
            views.setTextViewText(R.id.widget_precip_val,
                "${prefs.getFloat("precip_prob", 0f).roundToInt()}%")

            val updatedAt = prefs.getLong("updated_at", 0L)
            val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
            views.setTextViewText(R.id.widget_updated,
                "Updated ${timeFormat.format(Date(updatedAt))}")

            Log.d(TAG, "Populated from cache: temp=$temp, loc=${prefs.getString("location_name", "?")}")
        }

        private fun populateDefaults(views: RemoteViews) {
            views.setTextViewText(R.id.widget_location, "Open app first")
            views.setTextViewText(R.id.widget_condition, "No data yet")
            views.setTextViewText(R.id.widget_temp, "--")
            views.setTextViewText(R.id.widget_feels, "")
            views.setTextViewText(R.id.widget_hi, "")
            views.setTextViewText(R.id.widget_lo, "")
            views.setTextViewText(R.id.widget_humidity_val, "--%")
            views.setTextViewText(R.id.widget_wind_val, "--")
            views.setTextViewText(R.id.widget_uv_val, "UV --")
            views.setTextViewText(R.id.widget_precip_val, "--%")
            views.setTextViewText(R.id.widget_updated, "Tap to open app")
            Log.d(TAG, "Populated defaults (no cached data)")
        }

        private fun setClickIntents(context: Context, views: RemoteViews, appWidgetId: Int) {
            // Tap widget body → open app
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launchIntent != null) {
                val pending = PendingIntent.getActivity(
                    context, 0, launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, pending)
            }

            // Tap "Updated" → refresh widget
            val refreshIntent = Intent(context, WeatherWidgetProvider::class.java).apply {
                action = ACTION_REFRESH
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            val pendingRefresh = PendingIntent.getBroadcast(
                context, appWidgetId, refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_updated, pendingRefresh)
        }
    }
}
