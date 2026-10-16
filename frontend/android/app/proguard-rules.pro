# ==============================================================================
# SDD-006-ANDROID-RELEASE-DISTRIBUTION
# Reglas de ofuscación y exclusión R8 / ProGuard para Capacitor e Ionic
# Previene la eliminación reflectiva de plugins nativos, geolocalización y sockets
# ==============================================================================

# --- Capacitor Core y Bridge JavaScript ---
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}
-keep @interface com.getcapacitor.annotation.CapacitorPlugin
-keep @interface com.getcapacitor.PluginMethod
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes SourceFile,LineNumberTable

# --- Plugin Background Geolocation (@capacitor-community/background-geolocation) ---
-keep class com.equimaps.capacitor_background_geolocation.** { *; }
-keepclassmembers class com.equimaps.capacitor_background_geolocation.** { *; }

# --- Google Play Services Location & FusedLocationProviderClient ---
-keep class com.google.android.gms.location.** { *; }
-keep class com.google.android.gms.common.** { *; }
-dontwarn com.google.android.gms.**

# --- Capacitor Native Plugins (Geolocation, StatusBar, Haptics, App, etc.) ---
-keep class com.capacitorjs.plugins.** { *; }
-keepclassmembers class com.capacitorjs.plugins.** { *; }

# --- Socket.io, Engine.io, OkHttp y WebSockets ---
-keep class io.socket.** { *; }
-keepclassmembers class io.socket.** { *; }
-keep class okhttp3.** { *; }
-keepclassmembers class okhttp3.** { *; }
-keep class okio.** { *; }
-dontwarn io.socket.**
-dontwarn okhttp3.**
-dontwarn okio.**

# --- Cordova Plugins Compatibility Bridge ---
-keep class org.apache.cordova.** { *; }
-keep public class * extends org.apache.cordova.CordovaPlugin
