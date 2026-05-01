package com.fieldweather

import android.content.Context
import android.util.Log
import androidx.work.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit
import kotlin.math.roundToInt

/**
 * WorkManager worker that fetches weather data independently of the RN app.
 * This allows the widget to refresh even if the user hasn't opened the app in days.
 *
 * Uses the last known lat/lon from SharedPreferences (saved by AppConfigModule).
 * Falls back gracefully if no coordinates are available yet.
 */
class WeatherRefreshWorker(
    context: Context,
    params: WorkerParameters
) : Worker(context, params) {

    override fun doWork(): Result {
        Log.d(TAG, "WeatherRefreshWorker starting")

        val prefs = applicationContext.getSharedPreferences(
            WeatherWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE
        )

        // Need coordinates from a previous app session
        val lat = prefs.getFloat("last_lat", 0f)
        val lon = prefs.getFloat("last_lon", 0f)
        if (lat == 0f && lon == 0f) {
            Log.w(TAG, "No cached coordinates — skipping refresh (app must be opened first)")
            // Still update widgets with whatever is cached (or defaults)
            WeatherWidgetProvider.refreshAllWidgets(applicationContext)
            return Result.success()
        }

        val apiKey = BuildConfig.WEATHER_API_KEY
        if (apiKey.isBlank()) {
            Log.e(TAG, "No API key configured")
            return Result.failure()
        }

        return try {
            val weather = fetchCurrentWeather(apiKey, lat.toDouble(), lon.toDouble())
            if (weather != null) {
                saveToPrefs(prefs, weather)
                WeatherWidgetProvider.refreshAllWidgets(applicationContext)
                Log.d(TAG, "Widget refresh complete — temp=${weather.temp}")
                Result.success()
            } else {
                Log.w(TAG, "API returned null data — keeping stale cache")
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Fetch failed: ${e.message}", e)
            // Don't clear existing cache on failure — stale data > no data
            Result.retry()
        }
    }

    private fun fetchCurrentWeather(apiKey: String, lat: Double, lon: Double): WeatherResult? {
        val fields = listOf(
            "temperature", "temperatureApparent", "humidity",
            "windSpeed", "uvIndex", "precipitationProbability", "weatherCode"
        ).joinToString(",")

        val url = URL(
            "https://api.tomorrow.io/v4/timelines" +
            "?location=$lat,$lon" +
            "&fields=$fields" +
            "&timesteps=current" +
            "&units=metric"
        )

        val conn = url.openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "GET"
            conn.setRequestProperty("apikey", apiKey)
            conn.setRequestProperty("Accept", "application/json")
            conn.connectTimeout = 15_000
            conn.readTimeout = 15_000

            val code = conn.responseCode
            if (code != 200) {
                Log.e(TAG, "API returned HTTP $code")
                return null
            }

            val body = conn.inputStream.bufferedReader().readText()
            return parseResponse(body)
        } finally {
            conn.disconnect()
        }
    }

    private fun parseResponse(body: String): WeatherResult? {
        return try {
            val json = JSONObject(body)
            val intervals = json
                .getJSONObject("data")
                .getJSONArray("timelines")
                .getJSONObject(0)
                .getJSONArray("intervals")
                .getJSONObject(0)
                .getJSONObject("values")

            WeatherResult(
                temp = intervals.getDouble("temperature").toFloat(),
                feelsLike = intervals.getDouble("temperatureApparent").toFloat(),
                humidity = intervals.getDouble("humidity").toFloat(),
                windSpeed = intervals.getDouble("windSpeed").toFloat(),
                uvIndex = intervals.getDouble("uvIndex").toFloat(),
                precipProb = intervals.getDouble("precipitationProbability").toFloat(),
                weatherCode = intervals.getInt("weatherCode")
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse API response: ${e.message}", e)
            null
        }
    }

    private fun saveToPrefs(prefs: android.content.SharedPreferences, w: WeatherResult) {
        // Map weather code to condition label (subset matching constants.ts)
        val conditionLabel = CONDITION_LABELS[w.weatherCode] ?: "Unknown"

        prefs.edit()
            .putFloat("temp", w.temp)
            .putFloat("feels_like", w.feelsLike)
            .putFloat("humidity", w.humidity)
            .putFloat("wind_speed", w.windSpeed)
            .putFloat("uv_index", w.uvIndex)
            .putFloat("precip_prob", w.precipProb)
            .putInt("weather_code", w.weatherCode)
            .putString("condition_label", conditionLabel)
            .putLong("updated_at", System.currentTimeMillis())
            // Keep existing location_name, hi_temp, lo_temp — we only fetch current
            .commit()
    }

    private data class WeatherResult(
        val temp: Float,
        val feelsLike: Float,
        val humidity: Float,
        val windSpeed: Float,
        val uvIndex: Float,
        val precipProb: Float,
        val weatherCode: Int
    )

    companion object {
        private const val TAG = "StrataRefreshWorker"
        const val WORK_NAME = "strata_widget_refresh"

        // Condition labels matching constants.ts WEATHER_CODES
        private val CONDITION_LABELS = mapOf(
            1000 to "Clear", 1001 to "Cloudy",
            1100 to "Mostly Clear", 1101 to "Partly Cloudy", 1102 to "Mostly Cloudy",
            2000 to "Fog", 2100 to "Light Fog",
            3000 to "Light Wind", 3001 to "Wind", 3002 to "Strong Wind",
            4000 to "Drizzle", 4001 to "Rain", 4200 to "Light Rain", 4201 to "Heavy Rain",
            5000 to "Snow", 5001 to "Flurries", 5100 to "Light Snow", 5101 to "Heavy Snow",
            6000 to "Freezing Drizzle", 6001 to "Freezing Rain",
            6200 to "Light Freezing Rain", 6201 to "Heavy Freezing Rain",
            7000 to "Ice Pellets", 7101 to "Heavy Ice Pellets", 7102 to "Light Ice Pellets",
            8000 to "Thunderstorm"
        )

        /**
         * Schedule periodic refresh every 30 minutes.
         * Uses KEEP policy — won't duplicate if already scheduled.
         */
        fun schedulePeriodic(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = PeriodicWorkRequestBuilder<WeatherRefreshWorker>(
                30, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 5, TimeUnit.MINUTES)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
            Log.d(TAG, "Periodic refresh scheduled (30min)")
        }

        /** Cancel periodic refresh (when all widgets removed). */
        fun cancelPeriodic(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
            Log.d(TAG, "Periodic refresh cancelled")
        }

        /** One-shot immediate refresh. */
        fun refreshNow(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = OneTimeWorkRequestBuilder<WeatherRefreshWorker>()
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueue(request)
            Log.d(TAG, "One-shot refresh enqueued")
        }
    }
}
