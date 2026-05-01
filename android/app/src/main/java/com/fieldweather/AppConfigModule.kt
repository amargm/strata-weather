package com.fieldweather

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AppConfigModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "AppConfig"

    override fun getConstants(): Map<String, Any> {
        return mapOf(
            "WEATHER_API_KEY" to BuildConfig.WEATHER_API_KEY
        )
    }

    @ReactMethod
    fun saveWidgetData(
        locationName: String,
        temp: Double,
        feelsLike: Double,
        hiTemp: Double,
        loTemp: Double,
        humidity: Double,
        windSpeed: Double,
        uvIndex: Double,
        precipProb: Double,
        weatherCode: Double,
        conditionLabel: String,
        lat: Double,
        lon: Double
    ) {
        try {
            Log.d(TAG, "saveWidgetData called: temp=$temp, loc=$locationName")

            val prefs = reactApplicationContext.getSharedPreferences(
                WeatherWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE
            )
            val committed = prefs.edit()
                .putString("location_name", locationName)
                .putFloat("temp", temp.toFloat())
                .putFloat("feels_like", feelsLike.toFloat())
                .putFloat("hi_temp", hiTemp.toFloat())
                .putFloat("lo_temp", loTemp.toFloat())
                .putFloat("humidity", humidity.toFloat())
                .putFloat("wind_speed", windSpeed.toFloat())
                .putFloat("uv_index", uvIndex.toFloat())
                .putFloat("precip_prob", precipProb.toFloat())
                .putInt("weather_code", weatherCode.toInt())
                .putString("condition_label", conditionLabel)
                .putFloat("last_lat", lat.toFloat())
                .putFloat("last_lon", lon.toFloat())
                .putLong("updated_at", System.currentTimeMillis())
                .commit()  // synchronous write — guarantees data is on disk before widget reads

            Log.d(TAG, "SharedPreferences committed=$committed")

            // Directly update all widgets — no broadcast needed
            WeatherWidgetProvider.refreshAllWidgets(reactApplicationContext)

            Log.d(TAG, "Widget refresh triggered")
        } catch (t: Throwable) {
            Log.e(TAG, "saveWidgetData failed", t)
        }
    }

    companion object {
        private const val TAG = "StrataAppConfig"
    }
}
