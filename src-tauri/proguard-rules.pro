# ==============================================================================
# ProGuard / R8 Rules for K-Planner (Tauri v2 + Android)
# ==============================================================================

# --- Tauri Core & JNI Bridge ---
-keep class app.tauri.** {
    @app.tauri.JniMethod public <methods>;
    native <methods>;
    *;
}
-keepclasseswithmembernames class * {
    native <methods>;
}
-keepclassmembers class * {
    @app.tauri.annotation.** <methods>;
}
-keep @app.tauri.annotation.TauriPlugin public class * {
    @app.tauri.annotation.Command public <methods>;
    @app.tauri.annotation.PermissionCallback <methods>;
    @app.tauri.annotation.ActivityCallback <methods>;
    @app.tauri.annotation.Permission <methods>;
    public <init>(...);
    *;
}
-keep @app.tauri.annotation.InvokeArg public class * {
    *;
}

# --- Tauri JSON Serialization & Data Structures ---
-keep class app.tauri.plugin.JSArray {
    public <init>(...);
    *;
}
-keep class app.tauri.plugin.JSObject {
    public <init>(...);
    public put(...);
    *;
}
-keepclassmembers class org.json.JSONArray {
    public put(...);
    *;
}
-keepclassmembers class org.json.JSONObject {
    public put(...);
    *;
}

# --- Tauri Plugins (Haptics, Notification, Opener) ---
-keep class app.tauri.plugin.opener.** { *; }
-keep class app.tauri.plugin.haptics.** { *; }
-keep class app.tauri.plugin.notification.** { *; }
-keep class com.betza.kplanner.** { *; }

# --- Jackson & Kotlin Reflection ---
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-keepattributes SourceFile,LineNumberTable
-keep @com.fasterxml.jackson.databind.annotation.JsonDeserialize public class * { *; }
-keep @com.fasterxml.jackson.databind.annotation.JsonSerialize public class * { *; }
-keep class * extends com.fasterxml.jackson.databind.JsonDeserializer { *; }
-keep class * extends com.fasterxml.jackson.databind.JsonSerializer { *; }

# --- Android WebKit JS Bridge & Interfaces ---
-keepclassmembers class * extends android.webkit.WebViewClient { *; }
-keepclassmembers class * extends android.webkit.WebChromeClient { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# --- Suppress non-critical warnings ---
-dontwarn app.tauri.**
-dontwarn okio.**
-dontwarn org.bouncycastle.**
