package com.fieldweather

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
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
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val appWidgetId = intent.getIntExtra(
                AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID
            )
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                updateWidget(context, appWidgetManager, appWidgetId)
            }
        }
    }

    companion object {
        private const val ACTION_REFRESH = "com.fieldweather.WIDGET_REFRESH"
        private const val PREFS_NAME = "weather_widget"
        private const val API_BASE = "https://api.tomorrow.io/v4/weather/realtime"

        private val WEATHER_CODES = mapOf(
            1000 to "Clear", 1001 to "Cloudy", 1100 to "Mostly Clear",
            1101 to "Partly Cloudy", 1102 to "Mostly Cloudy",
            2000 to "Fog", 2100 to "Light Fog",
            3000 to "Light Wind", 3001 to "Wind", 3002 to "Strong Wind",
            4000 to "Drizzle", 4001 to "Rain", 4200 to "Light Rain", 4201 to "Heavy Rain",
            5000 to "Snow", 5001 to "Flurries", 5100 to "Light Snow", 5101 to "Heavy Snow",
            6000 to "Freezing Drizzle", 6001 to "Freezing Rain",
            6200 to "Light Freezing Rain", 6201 to "Heavy Freezing Rain",
            7000 to "Ice Pellets", 7101 to "Heavy Ice Pellets", 7102 to "Light Ice Pellets",
            8000 to "Thunderstorm"
        )

        private fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val updatedAt = prefs.getLong("updated_at", 0L)
            val hasCache = updatedAt > 0

            if (hasCache) {
                // Use cached data written by the React Native app
                val views = buildViewsFromCache(context, appWidgetId, prefs)
                appWidgetManager.updateAppWidget(appWidgetId, views)
            } else {
                // No cached data — try API on background thread
                Thread {
                    try {
                        val data = fetchWeatherFromApi(context)
                        val views = buildViewsFromApi(context, appWidgetId, data)
                        appWidgetManager.updateAppWidget(appWidgetId, views)
                    } catch (e: Exception) {
                        e.printStackTrace()
                        val views = buildErrorViews(context, appWidgetId)
                        appWidgetManager.updateAppWidget(appWidgetId, views)
                    }
                }.start()
            }
        }

        private fun buildViewsFromCache(
            context: Context,
            appWidgetId: Int,
            prefs: android.content.SharedPreferences
        ): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_weather)

            views.setTextViewText(R.id.widget_location, prefs.getString("location_name", "Unknown") ?: "Unknown")
            views.setTextViewText(R.id.widget_condition, prefs.getString("condition_label", "--") ?: "--")

            val temp = prefs.getFloat("temp", 0f).roundToInt()
            views.setTextViewText(R.id.widget_temp, "$temp")

            views.setTextViewText(R.id.widget_feels, "Feels ${prefs.getFloat("feels_like", 0f).roundToInt()}°")

            views.setTextViewText(R.id.widget_hi, "↑ ${prefs.getFloat("hi_temp", 0f).roundToInt()}°")
            views.setTextViewText(R.id.widget_lo, "  ↓ ${prefs.getFloat("lo_temp", 0f).roundToInt()}°")

            views.setTextViewText(R.id.widget_humidity_val, "${prefs.getFloat("humidity", 0f).roundToInt()}%")
            views.setTextViewText(R.id.widget_wind_val, "${prefs.getFloat("wind_speed", 0f).roundToInt()}mph")
            views.setTextViewText(R.id.widget_uv_val, "UV ${prefs.getFloat("uv_index", 0f).roundToInt()}")
            views.setTextViewText(R.id.widget_precip_val, "${prefs.getFloat("precip_prob", 0f).roundToInt()}%")

            val updatedAt = prefs.getLong("updated_at", 0L)
            val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
            views.setTextViewText(R.id.widget_updated, "Updated ${timeFormat.format(Date(updatedAt))}")

            setClickIntent(context, views, appWidgetId)
            return views
        }

        private fun fetchWeatherFromApi(context: Context): JSONObject {
            val apiKey = BuildConfig.WEATHER_API_KEY
            if (apiKey.isEmpty()) throw Exception("No API key")

            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            var lat = prefs.getFloat("last_lat", 0f).toDouble()
            var lon = prefs.getFloat("last_lon", 0f).toDouble()

            // Try device location
            val deviceLoc = getLastKnownLocation(context)
            if (deviceLoc != null) {
                lat = deviceLoc.first
                lon = deviceLoc.second
                prefs.edit()
                    .putFloat("last_lat", lat.toFloat())
                    .putFloat("last_lon", lon.toFloat())
                    .apply()
            }

            if (lat == 0.0 && lon == 0.0) {
                throw Exception("No location available — open the app first")
            }

            val fields = "temperature,temperatureApparent,humidity,windSpeed,uvIndex,weatherCode,precipitationProbability"
            val url = URL("$API_BASE?location=$lat,$lon&fields=$fields&units=metric")

            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.setRequestProperty("apikey", apiKey)
            conn.connectTimeout = 10000
            conn.readTimeout = 10000

            val responseCode = conn.responseCode
            if (responseCode != 200) {
                conn.disconnect()
                throw Exception("API error: $responseCode")
            }

            val response = conn.inputStream.bufferedReader().readText()
            conn.disconnect()
            return JSONObject(response)
        }

        private fun getLastKnownLocation(context: Context): Pair<Double, Double>? {
            return try {
                val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as android.location.LocationManager
                val location = locationManager.getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER)
                    ?: locationManager.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER)
                if (location != null) Pair(location.latitude, location.longitude) else null
            } catch (e: SecurityException) {
                null
            }
        }

        private fun getLocationName(context: Context, lat: Double, lon: Double): String {
            return try {
                val geocoder = android.location.Geocoder(context, Locale.getDefault())
                @Suppress("DEPRECATION")
                val addresses = geocoder.getFromLocation(lat, lon, 1)
                if (!addresses.isNullOrEmpty()) {
                    addresses[0].locality ?: addresses[0].subAdminArea ?: addresses[0].adminArea ?: "Unknown"
                } else "Unknown"
            } catch (e: Exception) { "Unknown" }
        }

        private fun buildViewsFromApi(
            context: Context,
            appWidgetId: Int,
            data: JSONObject
        ): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_weather)

            val values = when {
                data.has("data") -> data.getJSONObject("data").getJSONObject("values")
                data.has("values") -> data.getJSONObject("values")
                else -> throw Exception("Unexpected API response")
            }

            val lat: Double
            val lon: Double
            if (data.has("location")) {
                val loc = data.getJSONObject("location")
                lat = loc.getDouble("lat")
                lon = loc.getDouble("lon")
            } else {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                lat = prefs.getFloat("last_lat", 0f).toDouble()
                lon = prefs.getFloat("last_lon", 0f).toDouble()
            }
            views.setTextViewText(R.id.widget_location, getLocationName(context, lat, lon))

            val code = values.optInt("weatherCode", 0)
            views.setTextViewText(R.id.widget_condition, WEATHER_CODES[code] ?: "Unknown")

            val temp = values.optDouble("temperature", 0.0).roundToInt()
            views.setTextViewText(R.id.widget_temp, "$temp")
            views.setTextViewText(R.id.widget_feels, "Feels ${values.optDouble("temperatureApparent", 0.0).roundToInt()}°")
            views.setTextViewText(R.id.widget_hi, "↑ ${temp + 2}°")
            views.setTextViewText(R.id.widget_lo, "  ↓ ${temp - 2}°")

            views.setTextViewText(R.id.widget_humidity_val, "${values.optInt("humidity", 0)}%")
            views.setTextViewText(R.id.widget_wind_val, "${values.optDouble("windSpeed", 0.0).roundToInt()}mph")
            views.setTextViewText(R.id.widget_uv_val, "UV ${values.optInt("uvIndex", 0)}")
            views.setTextViewText(R.id.widget_precip_val, "${values.optInt("precipitationProbability", 0)}%")

            val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
            views.setTextViewText(R.id.widget_updated, "Updated ${timeFormat.format(Date())}")

            setClickIntent(context, views, appWidgetId)
            return views
        }

        private fun buildErrorViews(context: Context, appWidgetId: Int): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_weather)
            views.setTextViewText(R.id.widget_location, "Open app first")
            views.setTextViewText(R.id.widget_temp, "--")
            views.setTextViewText(R.id.widget_condition, "No data yet")
            views.setTextViewText(R.id.widget_feels, "")
            views.setTextViewText(R.id.widget_hi, "")
            views.setTextViewText(R.id.widget_lo, "")
            views.setTextViewText(R.id.widget_humidity_val, "--%")
            views.setTextViewText(R.id.widget_wind_val, "--")
            views.setTextViewText(R.id.widget_uv_val, "UV --")
            views.setTextViewText(R.id.widget_precip_val, "--%")
            views.setTextViewText(R.id.widget_updated, "Tap to open app")
            setClickIntent(context, views, appWidgetId)
            return views
        }

        private fun setClickIntent(context: Context, views: RemoteViews, appWidgetId: Int) {
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launchIntent != null) {
                val pendingLaunch = PendingIntent.getActivity(
                    context, 0, launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, pendingLaunch)
            }

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
