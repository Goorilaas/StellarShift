#!/usr/bin/env bash
# Run after the Android build has populated the Gradle dependency cache.
set -euo pipefail
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
cache_dir="${GRADLE_USER_HOME:-$HOME/.gradle}/caches/modules-2/files-2.1"
sdk_dir="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
jar_path() { find "$cache_dir/$1/$2/$3" -name "$2-$3.jar" -print -quit; }
stdlib="$(jar_path org.jetbrains.kotlin kotlin-stdlib 2.1.20)"
json="$(jar_path org.json json 20180813)"
compiler="$(jar_path org.jetbrains.kotlin kotlin-compiler-embeddable 2.1.20)"
compiler+=":$stdlib:$(jar_path org.jetbrains.kotlin kotlin-reflect 2.1.20)"
compiler+=":$(jar_path org.jetbrains.kotlinx kotlinx-coroutines-core-jvm 1.8.0)"
compiler+=":$(jar_path org.jetbrains annotations 13.0)"
compiler+=":$(jar_path org.jetbrains.intellij.deps trove4j 1.0.20200330)"
classpath="$stdlib:$json:$sdk_dir/platforms/android-36/android.jar"
test_dir="$(mktemp -d)"
trap 'rm -rf "$test_dir"' EXIT
java_bin="${JAVA_HOME:+$JAVA_HOME/bin/}java"
"$java_bin" -cp "$compiler" org.jetbrains.kotlin.cli.jvm.K2JVMCompiler \
    -no-stdlib -no-reflect -classpath "$classpath" -d "$test_dir" \
    "$project_dir/android/app/src/main/java/com/gorilas/StellarShift/BlockedPhotos.kt" \
    "$project_dir/scripts/BlockedPhotosTest.kt"
"$java_bin" -cp "$test_dir:$classpath" com.gorilas.StellarShift.BlockedPhotosTestKt
