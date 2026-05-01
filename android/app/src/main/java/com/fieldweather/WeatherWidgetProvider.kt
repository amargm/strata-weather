package com.fieldweather

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
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
        // Trigger one-shot WorkManager refresh (fetches fresh data if coordinates available)
        WeatherRefreshWorker.refreshNow(context)
    }

    /** Called when the first widget is placed. Schedule periodic background refresh. */
    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d(TAG, "onEnabled — first widget placed, scheduling periodic refresh")
        WeatherRefreshWorker.schedulePeriodic(context)
    }

    /** Called when the last widget is removed. Cancel periodic background refresh. */
    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d(TAG, "onDisabled — last widget removed, cancelling periodic refresh")
        WeatherRefreshWorker.cancelPeriodic(context)
    }

    /** Clean up per-widget config when individual widgets are removed. */
    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        super.onDeleted(context, appWidgetIds)
        for (id in appWidgetIds) {
            WidgetConfigActivity.removeWidgetStyle(context, id)
            Log.d(TAG, "onDeleted — cleaned up config for widget $id")
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
            // Also trigger WorkManager to fetch fresh data
            WeatherRefreshWorker.refreshNow(context)
        }
    }

    companion object {
        private const val TAG = "StrataWidget"
        private const val ACTION_REFRESH = "com.fieldweather.WIDGET_REFRESH"
        const val PREFS_NAME = "weather_widget"

        // Weather code → emoji icon mapping (matches JS constants.ts)
        private val WEATHER_ICONS = mapOf(
            1000 to "☀️", 1001 to "☁️", 1100 to "🌤", 1101 to "⛅", 1102 to "🌥",
            2000 to "🌫", 2100 to "🌫",
            3000 to "💨", 3001 to "💨", 3002 to "💨",
            4000 to "🌦", 4001 to "🌧", 4200 to "🌦", 4201 to "🌧",
            5000 to "❄️", 5001 to "🌨", 5100 to "🌨", 5101 to "❄️",
            6000 to "🧊", 6001 to "🧊", 6200 to "🧊", 6201 to "🧊",
            7000 to "🧊", 7101 to "🧊", 7102 to "🧊",
            8000 to "⛈"
        )

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

        fun refreshWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            try {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val hasData = prefs.contains("temp") && prefs.getLong("updated_at", 0L) > 0
                val style = WidgetConfigActivity.getWidgetStyle(context, appWidgetId)
                val isCompact = style == WidgetConfigActivity.STYLE_COMPACT
                Log.d(TAG, "refreshWidget id=$appWidgetId hasData=$hasData style=$style")

                val layoutId = if (isCompact) R.layout.widget_weather_compact else R.layout.widget_weather
                val views = RemoteViews(context.packageName, layoutId)

                if (hasData) {
                    if (isCompact) {
                        populateCompactFromCache(views, prefs)
                    } else {
                        populateFromCache(views, prefs)
                    }
                } else {
                    if (isCompact) {
                        populateCompactDefaults(views)
                    } else {
                        populateDefaults(views)
                    }
                }

                setClickIntents(context, views, appWidgetId, hasData)
                appWidgetManager.updateAppWidget(appWidgetId, views)
                Log.d(TAG, "Widget $appWidgetId updated successfully")
            } catch (t: Throwable) {
                Log.e(TAG, "Error updating widget $appWidgetId", t)
                try {
                    val views = RemoteViews(context.packageName, R.layout.widget_weather)
                    populateDefaults(views)
                    setClickIntents(context, views, appWidgetId, false)
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                } catch (t2: Throwable) {
                    Log.e(TAG, "Even error state failed", t2)
                }
            }
        }

        /** Truncate location name to max length with ellipsis */
        private fun truncateLocation(name: String, maxLen: Int = 22): String {
            return if (name.length > maxLen) name.take(maxLen - 1) + "…" else name
        }

        private fun populateFromCache(views: RemoteViews, prefs: SharedPreferences) {
            val rawLocation = prefs.getString("location_name", "Unknown") ?: "Unknown"
            views.setTextViewText(R.id.widget_location, truncateLocation(rawLocation))
            views.setTextViewText(R.id.widget_condition,
                prefs.getString("condition_label", "--") ?: "--")

            // Weather icon
            val weatherCode = prefs.getInt("weather_code", 0)
            views.setTextViewText(R.id.widget_icon, WEATHER_ICONS[weatherCode] ?: "🌡")

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

            Log.d(TAG, "Populated from cache: temp=$temp, loc=$rawLocation, code=$weatherCode")
        }

        private fun populateDefaults(views: RemoteViews) {
            views.setTextViewText(R.id.widget_location, "Open app first")
            views.setTextViewText(R.id.widget_condition, "No data yet")
            views.setTextViewText(R.id.widget_icon, "🌡")
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

        private fun populateCompactFromCache(views: RemoteViews, prefs: SharedPreferences) {
            val rawLocation = prefs.getString("location_name", "Unknown") ?: "Unknown"
            views.setTextViewText(R.id.widget_location, truncateLocation(rawLocation))
            views.setTextViewText(R.id.widget_condition,
                prefs.getString("condition_label", "--") ?: "--")

            val weatherCode = prefs.getInt("weather_code", 0)
            views.setTextViewText(R.id.widget_icon, WEATHER_ICONS[weatherCode] ?: "🌡")

            val temp = prefs.getFloat("temp", 0f).roundToInt()
            views.setTextViewText(R.id.widget_temp, "$temp")
            views.setTextViewText(R.id.widget_hi,
                "↑ ${prefs.getFloat("hi_temp", 0f).roundToInt()}°")
            views.setTextViewText(R.id.widget_lo,
                "  ↓ ${prefs.getFloat("lo_temp", 0f).roundToInt()}°")

            val updatedAt = prefs.getLong("updated_at", 0L)
            val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
            views.setTextViewText(R.id.widget_updated,
                "Updated ${timeFormat.format(Date(updatedAt))}")
        }

        private fun populateCompactDefaults(views: RemoteViews) {
            views.setTextViewText(R.id.widget_location, "Open app first")
            views.setTextViewText(R.id.widget_condition, "No data yet")
            views.setTextViewText(R.id.widget_icon, "🌡")
            views.setTextViewText(R.id.widget_temp, "--")
            views.setTextViewText(R.id.widget_hi, "")
            views.setTextViewText(R.id.widget_lo, "")
            views.setTextViewText(R.id.widget_updated, "Tap to open app")
        }

        /** Create a deep-link intent that opens the app at a specific layer */
        private fun makeDeepLinkIntent(context: Context, layer: Int): Intent {
            return Intent(Intent.ACTION_VIEW, Uri.parse("strata://weather/layer/$layer")).apply {
                setPackage(context.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
        }

        private fun setClickIntents(context: Context, views: RemoteViews, appWidgetId: Int, hasData: Boolean) {
            if (hasData) {
                // Tap temp area → Now layer (0)
                val nowIntent = makeDeepLinkIntent(context, 0)
                val pendingNow = PendingIntent.getActivity(
                    context, appWidgetId * 10, nowIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_temp_row, pendingNow)

                // Tap condition/icon → Atmosphere layer (1)
                val atmosIntent = makeDeepLinkIntent(context, 1)
                val pendingAtmos = PendingIntent.getActivity(
                    context, appWidgetId * 10 + 1, atmosIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_icon, pendingAtmos)
                views.setOnClickPendingIntent(R.id.widget_condition, pendingAtmos)

                // Tap humidity cell → Atmosphere layer (1)
                views.setOnClickPendingIntent(R.id.widget_humidity_cell, pendingAtmos)

                // Tap wind cell → Hourly layer (2) for wind detail
                val hourlyIntent = makeDeepLinkIntent(context, 2)
                val pendingHourly = PendingIntent.getActivity(
                    context, appWidgetId * 10 + 2, hourlyIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_wind_cell, pendingHourly)

                // Tap precip cell → Hourly layer (2) for precip outlook
                views.setOnClickPendingIntent(R.id.widget_precip_cell, pendingHourly)

                // Tap UV cell → Science layer (4) for UV detail
                val scienceIntent = makeDeepLinkIntent(context, 4)
                val pendingScience = PendingIntent.getActivity(
                    context, appWidgetId * 10 + 4, scienceIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_uv_cell, pendingScience)

                // Tap widget body (fallback) → Now
                views.setOnClickPendingIntent(R.id.widget_root, pendingNow)
            } else {
                // No data: tap anywhere opens app normally
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                if (launchIntent != null) {
                    val pending = PendingIntent.getActivity(
                        context, 0, launchIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.widget_root, pending)
                }
            }

            // Tap "Updated" → refresh widget (always available)
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
