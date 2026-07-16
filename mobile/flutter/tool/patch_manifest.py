#!/usr/bin/env python3
"""Overlay El Kaptin's Android permissions + foreground service onto the
AndroidManifest.xml that `flutter create` generates.

We patch the generated manifest instead of committing a full one so we never
fight per-Flutter-version differences in the <activity> block — we only add the
permissions and the flutter_background_service "location" service. Idempotent:
a marker comment stops it re-inserting on repeat runs.
"""
import re
import sys

MARKER = "<!-- el-kaptin-permissions -->"

PERMISSIONS = f"""    {MARKER}
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <!-- Android 10+: keep tracking while backgrounded. -->
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <!-- Android 14+: typed foreground-service permission. -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <!-- Send the driver to the OEM battery/autostart allow-list screen. -->
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
"""

SERVICE = """
        <!-- el-kaptin-service -->
        <!-- flutter_background_service's foreground service, typed "location"
             so tracking survives a locked screen / Google Maps in front. -->
        <service
            android:name="id.flutter.flutter_background_service.BackgroundService"
            android:foregroundServiceType="location"
            android:exported="false"
            tools:replace="android:foregroundServiceType,android:exported" />
"""


def main(path: str) -> None:
    with open(path, encoding="utf-8") as fh:
        xml = fh.read()

    if MARKER in xml:
        print("   manifest already patched — skipping")
        return

    # Ensure the tools namespace is available (needed for tools:replace).
    if "xmlns:tools" not in xml:
        xml = xml.replace(
            "xmlns:android=\"http://schemas.android.com/apk/res/android\"",
            "xmlns:android=\"http://schemas.android.com/apk/res/android\"\n"
            "    xmlns:tools=\"http://schemas.android.com/tools\"",
            1,
        )

    # Permissions: right after the opening <manifest ...> tag.
    xml, n = re.subn(r"(<manifest\b[^>]*>\n)", r"\1" + PERMISSIONS, xml, count=1)
    if n != 1:
        sys.exit("could not find <manifest> opening tag")

    # A friendly launcher label (flutter create defaults it to the project name).
    xml = re.sub(r'android:label="[^"]*"', 'android:label="El Kaptin"', xml, count=1)

    # Service: just before </application>.
    xml, n = re.subn(r"(\n\s*</application>)", SERVICE + r"\1", xml, count=1)
    if n != 1:
        sys.exit("could not find </application> tag")

    with open(path, "w", encoding="utf-8") as fh:
        fh.write(xml)
    print("   permissions + foreground service injected")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: patch_manifest.py <path-to-AndroidManifest.xml>")
    main(sys.argv[1])
