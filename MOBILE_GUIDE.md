# Mobile Deployment Guide: Split Sphere

This guide explains how to turn your web game into a native Android and iOS app using **Capacitor**.

## Prerequisites

You need to install the following tools on your computer (not in the web editor):

1.  **Node.js** (LTS version)
2.  **Android Studio** (for Android)
3.  **Xcode** (for iOS, requires a Mac)

---

## Step 1: Download Your Project

1.  Download the entire project folder from the web editor.
2.  Open a terminal in the project folder.
3.  Install dependencies:
    ```bash
    npm install
    ```

## Step 2: Build the Web App

Before wrapping it, you must build the production version of your React app:

```bash
npm run build
```

This creates a `dist` folder containing your game.

## Step 3: Add Native Platforms

Run these commands to create the Android and iOS projects:

```bash
npx cap add android
npx cap add ios
```

## Step 4: Sync Changes

Whenever you update your game code (React/JS), run this command to copy the new build to the native projects:

```bash
npm run build
npx cap sync
```

## Step 5: Run on Android (Google Play Store)

1.  Open the project in Android Studio:
    ```bash
    npx cap open android
    ```
2.  Wait for Gradle to sync (this may take a few minutes).
3.  **Test:** Connect your Android phone via USB (enable Developer Mode) or create an Emulator. Click the green "Run" (Play) button in Android Studio.
4.  **Build for Store:**
    *   Go to **Build > Generate Signed Bundle / APK**.
    *   Select **Android App Bundle**.
    *   Create a new Key Store (keep this file safe! You need it to update the app later).
    *   Finish the wizard to generate your `.aab` file.
5.  **Upload:** Go to the [Google Play Console](https://play.google.com/console), create a new app, and upload your `.aab` file to the "Production" track.

## Step 6: Run on iOS (Apple App Store)

1.  Open the project in Xcode:
    ```bash
    npx cap open ios
    ```
2.  **Test:** Select a Simulator (e.g., iPhone 15) and click the "Play" button.
3.  **Build for Store:**
    *   Select "Any iOS Device (arm64)" as the target.
    *   Go to **Product > Archive**.
    *   Once the archive is complete, the Organizer window will open.
    *   Click **Distribute App** and follow the prompts to upload to **App Store Connect**.

---

## Troubleshooting

*   **White Screen on Launch:** Ensure your `capacitor.config.ts` has `webDir: 'dist'`.
*   **Back Button Closes App:** You may need to add the `@capacitor/app` plugin to handle the hardware back button on Android.

## Customizing Icons & Splash Screen

To generate app icons and splash screens automatically:

1.  Install the assets tool:
    ```bash
    npm install @capacitor/assets --save-dev
    ```
2.  Place your logo in `assets/logo.png` and `assets/splash.png`.
3.  Run:
    ```bash
    npx capacitor-assets generate
    ```
