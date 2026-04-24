/**
 * Capacitor config — wraps the responsive Next.js web app as a native
 * iOS shell for App Store submission. MVP-1 ships as a "reader app"
 * pattern (guideline 3.1.3(a)): login + Free tier read-only content;
 * paid subscription happens on the web. StoreKit2 IAP integration
 * lands in MVP-2 after iOS conversion data is in.
 *
 * Install + build (requires macOS + Xcode for `cap add ios`):
 *   npm install --save @capacitor/core
 *   npm install --save-dev @capacitor/cli @capacitor/ios
 *   npx cap add ios
 *   npm run build && npx cap sync
 *   npx cap open ios   # open in Xcode for signing/TestFlight/submit
 *
 * `server.url` points at production fintrest.ai so the native shell
 * loads the live web app — updates deploy without a binary rebuild.
 * TrueApp mode (static bundle) is an MVP-2 option once content
 * stabilizes and we want offline/App-Thinning benefits.
 *
 * NOTE: typed loosely with JSDoc instead of importing from
 * '@capacitor/cli' so the web project doesn't need to carry Capacitor
 * as a typecheck dependency. The CLI reads this file at runtime and
 * validates the shape itself.
 *
 * @type {{
 *   appId: string;
 *   appName: string;
 *   webDir: string;
 *   server?: { url: string; cleartext?: boolean };
 *   ios?: { contentInset?: string; scrollEnabled?: boolean };
 *   plugins?: Record<string, unknown>;
 * }}
 */
const config = {
  appId: "ai.fintrest.app",
  appName: "Fintrest",
  webDir: "out",

  server: {
    url: "https://fintrest.ai",
    cleartext: false,
  },

  ios: {
    contentInset: "automatic",
    scrollEnabled: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#1E63B8",
      androidScaleType: "CENTER_CROP",
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#1E63B8",
    },
  },
};

export default config;
