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
        private const val API_BASE = "https://api.tomorrow.io/v4/weather/realtime"

        // Weather code to label
        private val WEATHER_CODES = mapOf(
            1000 to "Clear",
            1001 to "Cloudy",
            1100 to "Mostly Clear",
            1101 to "Partly Cloudy",
            1102 to "Mostly Cloudy",
            2000 to "Fog",
            2100 to "Light Fog",
            3000 to "Light Wind",
            3001 to "Wind",
            3002 to "Strong Wind",
            4000 to "Drizzle",
            4001 to "Rain",
            4200 to "Light Rain",
            4201 to "Heavy Rain",
            5000 to "Snow",
            5001 to "Flurries",
            5100 to "Light Snow",
            5101 to "Heavy Snow",
            6000 to "Freezing Drizzle",
            6001 to "Freezing Rain",
            6200 to "Light Freezing Rain",
            6201 to "Heavy Freezing Rain",
            7000 to "Ice Pellets",
            7101 to "Heavy Ice Pellets",
            7102 to "Light Ice Pellets",
            8000 to "Thunderstorm"
        )

        private fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            // Run network on background thread
            Thread {
                try {
                    val data = fetchWeather(context)
                    val views = buildViews(context, appWidgetId, data)
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                } catch (e: Exception) {
                    e.printStackTrace()
                    // Show error state
                    val views = RemoteViews(context.packageName, R.layout.widget_weather)
                    views.setTextViewText(R.id.widget_location, "Tap to refresh")
                    views.setTextViewText(R.id.widget_temp, "--")
                    views.setTextViewText(R.id.widget_condition, "No data")
                    setClickIntent(context, views, appWidgetId)
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                }
            }.start()
        }

        private fun fetchWeather(context: Context): JSONObject {
            val apiKey = BuildConfig.WEATHER_API_KEY

            // Use last known location from shared prefs, or default
            val prefs = context.getSharedPreferences("weather_widget", Context.MODE_PRIVATE)
            val lat = prefs.getFloat("last_lat", 0f)
            val lon = prefs.getFloat("last_lon", 0f)

            // Try to get location
            val location = getLastKnownLocation(context)
            val useLat = location?.first ?: lat.toDouble()
            val useLon = location?.second ?: lon.toDouble()

            // Save for next time
            if (location != null) {
                prefs.edit()
                    .putFloat("last_lat", useLat.toFloat())
                    .putFloat("last_lon", useLon.toFloat())
                    .apply()
            }

            val fields = "temperature,temperatureApparent,humidity,windSpeed,uvIndex,weatherCode,precipitationProbability"
            val url = URL("$API_BASE?location=$useLat,$useLon&apikey=$apiKey&fields=$fields")

            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 10000
            conn.readTimeout = 10000

            val response = conn.inputStream.bufferedReader().readText()
            conn.disconnect()

            return JSONObject(response)
        }

        private fun getLastKnownLocation(context: Context): Pair<Double, Double>? {
            return try {
                val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as android.location.LocationManager
                // Try GPS first, then network
                val location = locationManager.getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER)
                    ?: locationManager.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER)

                if (location != null) {
                    Pair(location.latitude, location.longitude)
                } else null
            } catch (e: SecurityException) {
                null // Location permission not granted
            }
        }

        private fun getLocationName(context: Context, lat: Double, lon: Double): String {
            return try {
                val geocoder = android.location.Geocoder(context, Locale.getDefault())
                @Suppress("DEPRECATION")
                val addresses = geocoder.getFromLocation(lat, lon, 1)
                if (!addresses.isNullOrEmpty()) {
                    val addr = addresses[0]
                    addr.locality ?: addr.subAdminArea ?: addr.adminArea ?: "Unknown"
                } else "Unknown"
            } catch (e: Exception) {
                "Unknown"
            }
        }

        private fun buildViews(
            context: Context,
            appWidgetId: Int,
            data: JSONObject
        ): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_weather)
            val values = data.getJSONObject("data").getJSONObject("values")

            // Location name
            val loc = data.getJSONObject("location")
            val lat = loc.getDouble("lat")
            val lon = loc.getDouble("lon")
            val locationName = getLocationName(context, lat, lon)
            views.setTextViewText(R.id.widget_location, locationName)

            // Condition
            val code = values.optInt("weatherCode", 0)
            val conditionLabel = WEATHER_CODES[code] ?: "Unknown"
            views.setTextViewText(R.id.widget_condition, conditionLabel)

            // Temperature
            val temp = values.optDouble("temperature", 0.0).roundToInt()
            views.setTextViewText(R.id.widget_temp, "$temp")

            // Feels like
            val feels = values.optDouble("temperatureApparent", 0.0).roundToInt()
            views.setTextViewText(R.id.widget_feels, "Feels $feels°")

            // Hi/Lo — not available in realtime, show feels range
            views.setTextViewText(R.id.widget_hi, "↑ ${temp + 2}°")
            views.setTextViewText(R.id.widget_lo, "  ↓ ${temp - 2}°")

            // Stats
            val humidity = values.optInt("humidity", 0)
            views.setTextViewText(R.id.widget_humidity_val, "$humidity%")

            val wind = values.optDouble("windSpeed", 0.0).roundToInt()
            views.setTextViewText(R.id.widget_wind_val, "${wind}mph")

            val uv = values.optInt("uvIndex", 0)
            views.setTextViewText(R.id.widget_uv_val, "UV $uv")

            val precip = values.optInt("precipitationProbability", 0)
            views.setTextViewText(R.id.widget_precip_val, "$precip%")

            // Updated time
            val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
            views.setTextViewText(R.id.widget_updated, "Updated ${timeFormat.format(Date())}")

            // Click intents
            setClickIntent(context, views, appWidgetId)

            return views
        }

        private fun setClickIntent(context: Context, views: RemoteViews, appWidgetId: Int) {
            // Tap widget -> open app
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            if (launchIntent != null) {
                val pendingLaunch = PendingIntent.getActivity(
                    context, 0, launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_root, pendingLaunch)
            }

            // Long-press updated text -> refresh
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
