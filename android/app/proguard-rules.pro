# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# StellarShift native modules — referenced by reflection from
# AndroidManifest (BootReceiver), WorkManager (WallpaperWorker), and
# the React Native bridge (WallpaperModule + WallpaperPackage).
# Without this rule R8 would rename them and instantiation would fail.
-keep class com.gorilas.StellarShift.** { *; }

# WorkManager — CoroutineWorker / Worker subclasses are instantiated by
# reflection. Keep all classes that extend the base Worker types.
-keep public class * extends androidx.work.Worker
-keep public class * extends androidx.work.CoroutineWorker
-keep public class * extends androidx.work.ListenableWorker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}

# Kotlin metadata — required for Kotlin reflection (coroutines, data
# classes). Reanimated already keeps its own; this is for our code.
-keep class kotlin.Metadata { *; }
-keepattributes RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations,RuntimeVisibleTypeAnnotations

# Sentry — preserve stack-trace markers so native crash reports stay
# readable. JS-side mapping is handled separately via source maps upload.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
