package com.fieldweather

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
}
