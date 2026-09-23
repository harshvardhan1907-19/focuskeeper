package com.focuskeeper.app;

import android.app.Activity;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;

@CapacitorPlugin(name = "Focus")
public class FocusPlugin extends Plugin {

    private Long currentSessionId = null;
    private String lastApp = "";

    @PluginMethod
    public void startFocusMode(PluginCall call) {
        currentSessionId = call.getLong("sessionId");
        startAppMonitoring();
        call.resolve();
    }

    @PluginMethod
    public void stopFocusMode(PluginCall call) {
        currentSessionId = null;
        call.resolve();
    }

    private void startAppMonitoring() {
        // In production, use a background service to monitor app usage
        // For simplicity, this is a placeholder
        new Thread(() -> {
            while (currentSessionId != null) {
                try {
                    Thread.sleep(5000); // Check every 5 seconds
                    checkForegroundApp();
                } catch (InterruptedException e) {
                    break;
                }
            }
        }).start();
    }

    private void checkForegroundApp() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            UsageStatsManager usm = (UsageStatsManager) getContext().getSystemService(Context.USAGE_STATS_SERVICE);
            long time = System.currentTimeMillis();
            List<UsageStats> stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, time - 1000 * 60 * 10, time);

            if (stats != null && !stats.isEmpty()) {
                String currentApp = stats.get(0).getPackageName();
                if (!currentApp.equals(lastApp) && !currentApp.equals("com.focuskeeper.app")) {
                    // App switched!
                    lastApp = currentApp;
                    notifyAppSwitch(currentApp);
                }
            }
        }
    }

    private void notifyAppSwitch(String appName) {
        if (currentSessionId != null) {
            // Send notification to the webview
            JSObject data = new JSObject();
            data.put("sessionId", currentSessionId);
            data.put("appName", appName);

            getBridge().evaluateJavascript(
                    "window.onAppSwitch(" + data.toString() + ");",
                    null);
        }
    }
}