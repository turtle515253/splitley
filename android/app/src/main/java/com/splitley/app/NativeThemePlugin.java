package com.splitley.app;

import android.content.Intent;
import android.graphics.Color;
import android.provider.Settings;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Sets the status bar color and icon style from the web app's theme.
 * Needed because @capacitor/status-bar's setBackgroundColor is a no-op on
 * Android 15+, while Window.setStatusBarColor still works as long as the app
 * opts out of edge-to-edge (targetSdk 35 + windowOptOutEdgeToEdgeEnforcement).
 */
@CapacitorPlugin(name = "NativeTheme")
public class NativeThemePlugin extends Plugin {

    @PluginMethod
    public void setStatusBar(PluginCall call) {
        String color = call.getString("color", "#FAF9F7");
        Boolean lightIcons = call.getBoolean("lightIcons", false);
        getActivity().runOnUiThread(() -> {
            try {
                Window window = getActivity().getWindow();
                window.setStatusBarColor(Color.parseColor(color));
                WindowInsetsControllerCompat controller =
                    WindowCompat.getInsetsController(window, window.getDecorView());
                controller.setAppearanceLightStatusBars(!lightIcons);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        });
    }

    /** Opens the system notification settings screen for this app. */
    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }
}
