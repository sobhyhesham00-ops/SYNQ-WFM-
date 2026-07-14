# Native platform setup

The Dart/Flutter application code in `lib/` is complete. To produce runnable
Android/iOS binaries you need the platform scaffolding. Generate it once with:

```bash
flutter create --platforms=android,ios --org eg.dargak .
```

This creates `android/` and `ios/` **without touching** `lib/`, `pubspec.yaml`,
`test/` or `assets/`. Then apply the permission blocks below (they are required
by the payment, contacts, sharing and PDF features).

---

## Android — `android/app/src/main/AndroidManifest.xml`

Add inside `<manifest>` (above `<application>`):

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Needed on Android 11+ so url_launcher/share can resolve these apps -->
<queries>
    <intent>
        <action android:name="android.intent.action.VIEW" />
        <data android:scheme="https" />
    </intent>
    <intent>
        <action android:name="android.intent.action.SENDTO" />
        <data android:scheme="whatsapp" />
    </intent>
    <package android:name="com.whatsapp" />
    <package android:name="com.whatsapp.w4b" />
    <!-- InstaPay / IPN app -->
    <package android:name="eg.gov.cbe.ipn" />
</queries>
```

Set `minSdkVersion 21` (or higher) in `android/app/build.gradle` for
`flutter_secure_storage` and `hive` compatibility.

---

## iOS — `ios/Runner/Info.plist`

Add these keys inside the root `<dict>`:

```xml
<key>NSContactsUsageDescription</key>
<string>Dargak links debts to your phone contacts so you can chase payments.</string>

<key>LSApplicationQueriesSchemes</key>
<array>
    <string>whatsapp</string>
    <string>https</string>
</array>
```

`flutter_secure_storage` on iOS requires enabling **Keychain Sharing** capability
(Xcode ▸ Signing & Capabilities) if you target extensions; the default app target
works out of the box.

---

## Fonts

Typography uses **Cairo** via `google_fonts`, which downloads and caches the font
at runtime. For fully offline first-launch typography, bundle the Cairo `.ttf`
files under `assets/fonts/` and declare them in `pubspec.yaml`, then switch
`GoogleFonts.cairoTextTheme` for a bundled `TextTheme`.
