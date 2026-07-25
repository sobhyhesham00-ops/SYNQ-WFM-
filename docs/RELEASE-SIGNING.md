# Signing the driver app for Google Play

Play requires an **Android App Bundle (.aab)** signed with an **upload key**.
This repo ships source-only (the `android/` scaffold is generated at build time),
so signing is wired via a keystore you create once + CI secrets.

## 1 · Create an upload keystore (once, keep it safe)

```bash
keytool -genkey -v -keystore elkaptin-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Answer the prompts and pick a strong password. **Back this file up** — lose it
and you can't ship updates (unless you're enrolled in Play App Signing with a
reset option). Never commit it.

## 2 · Add it to GitHub as secrets

```bash
base64 -w0 elkaptin-upload.jks > keystore.b64   # macOS: base64 -i elkaptin-upload.jks
```

In the repo → Settings → Secrets and variables → Actions, add:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | contents of `keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | the store password |
| `ANDROID_KEY_PASSWORD` | the key password (often the same) |
| `ANDROID_KEY_ALIAS` | `upload` |

## 3 · Build the AAB (internal test)

Actions → **Build driver AAB** → Run workflow, with your backend `api_base` /
`ws_base`. Download the `el-kaptin-driver-aab` artifact. This AAB is signed with
Flutter's default debug key — enough to upload to an **internal test** track and
confirm the bundle is valid, **but not for production**.

## 4 · Production signing (when you're ready to submit)

Because the `android/` scaffold is generated at build time, wire the upload key
into the generated Gradle before the production build. Do this locally (or in a
fork of the workflow that commits the scaffold): create `android/key.properties`
from the secrets in step 2, then add the matching snippet below.

Recent Flutter uses the Kotlin DSL (`build.gradle.kts`); older uses Groovy
(`build.gradle`):

**Groovy (`build.gradle`):**
```gradle
android {
    signingConfigs {
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
    buildTypes { release { signingConfig signingConfigs.release } }
}
```

**Kotlin DSL (`build.gradle.kts`):**
```kotlin
android {
    signingConfigs {
        create("release") {
            storeFile = file(System.getenv("ANDROID_KEYSTORE_PATH"))
            storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias = System.getenv("ANDROID_KEY_ALIAS")
            keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
    buildTypes { getByName("release") { signingConfig = signingConfigs.getByName("release") } }
}
```

## 5 · Play App Signing

When you upload the first AAB, enrol in **Play App Signing** (recommended):
Google holds the real app-signing key; you only manage the upload key above. If
the upload key is ever lost, Google can help you reset it.
