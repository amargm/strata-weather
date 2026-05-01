package com.fieldweather

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
    override fun getMainComponentName(): String = "StrataWeather"

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.AppTheme)
        super.onCreate(savedInstanceState)
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        ReactActivityDelegateWrapper(this, BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
            object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
                override fun getLaunchOptions(): Bundle? {
                    val bundle = Bundle()
                    // Parse deep-link: strata://weather/layer/{N}
                    intent?.data?.let { uri ->
                        if (uri.scheme == "strata" && uri.host == "weather") {
                            val segments = uri.pathSegments
                            if (segments.size >= 2 && segments[0] == "layer") {
                                val layer = segments[1].toIntOrNull() ?: 0
                                bundle.putInt("initialLayer", layer)
                            }
                        }
                    }
                    return if (bundle.isEmpty) null else bundle
                }
            })
}
