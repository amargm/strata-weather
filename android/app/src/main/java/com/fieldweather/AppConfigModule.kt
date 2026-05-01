package com.fieldweather

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

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
        weatherCode: Int,
        conditionLabel: String,
        lat: Double,
        lon: Double
    ) {
        val prefs = reactApplicationContext.getSharedPreferences("weather_widget", Context.MODE_PRIVATE)
        prefs.edit()
            .putString("location_name", locationName)
            .putFloat("temp", temp.toFloat())
            .putFloat("feels_like", feelsLike.toFloat())
            .putFloat("hi_temp", hiTemp.toFloat())
            .putFloat("lo_temp", loTemp.toFloat())
            .putFloat("humidity", humidity.toFloat())
            .putFloat("wind_speed", windSpeed.toFloat())
            .putFloat("uv_index", uvIndex.toFloat())
            .putFloat("precip_prob", precipProb.toFloat())
            .putInt("weather_code", weatherCode)
            .putString("condition_label", conditionLabel)
            .putFloat("last_lat", lat.toFloat())
            .putFloat("last_lon", lon.toFloat())
            .putLong("updated_at", System.currentTimeMillis())
            .apply()

        // Trigger widget update
        val intent = Intent(reactApplicationContext, WeatherWidgetProvider::class.java)
        intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        val widgetManager = AppWidgetManager.getInstance(reactApplicationContext)
        val ids = widgetManager.getAppWidgetIds(
            ComponentName(reactApplicationContext, WeatherWidgetProvider::class.java)
        )
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        reactApplicationContext.sendBroadcast(intent)
    }
}
