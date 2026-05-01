package com.fieldweather

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.RadioButton

/**
 * Configuration activity shown when user adds a widget.
 * Lets the user pick between "Full" and "Compact" layouts.
 * Saves the choice per widget ID in SharedPreferences.
 */
class WidgetConfigActivity : Activity() {

    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // If the user backs out, cancel the widget
        setResult(RESULT_CANCELED)

        // Get the widget ID from the intent
        appWidgetId = intent?.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            Log.e(TAG, "No valid widget ID — finishing")
            finish()
            return
        }

        setContentView(R.layout.widget_config)

        val radioFull = findViewById<RadioButton>(R.id.radio_full)
        val radioCompact = findViewById<RadioButton>(R.id.radio_compact)

        // Mutual exclusion (since we're not using RadioGroup)
        radioFull.setOnCheckedChangeListener { _, checked ->
            if (checked) radioCompact.isChecked = false
        }
        radioCompact.setOnCheckedChangeListener { _, checked ->
            if (checked) radioFull.isChecked = false
        }

        // Make the row clickable too
        findViewById<android.view.View>(R.id.config_style_full).setOnClickListener {
            radioFull.isChecked = true
        }
        findViewById<android.view.View>(R.id.config_style_compact).setOnClickListener {
            radioCompact.isChecked = true
        }

        // Confirm button
        findViewById<android.view.View>(R.id.config_confirm).setOnClickListener {
            val style = if (radioCompact.isChecked) STYLE_COMPACT else STYLE_FULL
            saveWidgetStyle(appWidgetId, style)

            // Trigger initial widget render
            val appWidgetManager = AppWidgetManager.getInstance(this)
            WeatherWidgetProvider.refreshWidget(this, appWidgetManager, appWidgetId)

            // Schedule periodic refresh (safe to call multiple times — KEEP policy)
            WeatherRefreshWorker.schedulePeriodic(this)

            // Trigger one-shot to populate data if coordinates available
            WeatherRefreshWorker.refreshNow(this)

            // Return success
            val resultValue = Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            setResult(RESULT_OK, resultValue)
            finish()
        }

        Log.d(TAG, "Config activity opened for widget $appWidgetId")
    }

    private fun saveWidgetStyle(widgetId: Int, style: String) {
        val prefs = getSharedPreferences(CONFIG_PREFS, Context.MODE_PRIVATE)
        prefs.edit().putString("widget_style_$widgetId", style).commit()
        Log.d(TAG, "Saved style=$style for widget $widgetId")
    }

    companion object {
        private const val TAG = "StrataWidgetConfig"
        const val CONFIG_PREFS = "widget_config"
        const val STYLE_FULL = "full"
        const val STYLE_COMPACT = "compact"

        /** Get the configured style for a widget, defaulting to full. */
        fun getWidgetStyle(context: Context, widgetId: Int): String {
            val prefs = context.getSharedPreferences(CONFIG_PREFS, Context.MODE_PRIVATE)
            return prefs.getString("widget_style_$widgetId", STYLE_FULL) ?: STYLE_FULL
        }

        /** Clean up prefs when a widget is removed. */
        fun removeWidgetStyle(context: Context, widgetId: Int) {
            val prefs = context.getSharedPreferences(CONFIG_PREFS, Context.MODE_PRIVATE)
            prefs.edit().remove("widget_style_$widgetId").apply()
        }
    }
}
