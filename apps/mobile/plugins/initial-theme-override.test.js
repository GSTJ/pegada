// @ts-nocheck
const {
  applyIOSThemeOverride,
  applyAndroidThemeOverride,
} = require("./initial-theme-override");

const appDelegateFixture = () => ({
  language: "swift",
  contents: `
class AppDelegate: ... {
  func application(...) -> Bool {
    window = UIWindow(frame: UIScreen.main.bounds)
    return true
  }
}
`,
});

const mainApplicationFixture = () => ({
  language: "kt",
  contents: `package app.pegada

import android.app.Application

class MainApplication : Application(), ReactApplication {
  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
`,
});

describe("initial theme override / iOS", () => {
  it("injects the UserDefaults override right after the window is created", () => {
    const contents = applyIOSThemeOverride(appDelegateFixture());

    expect(contents).toContain(
      'UserDefaults.standard.string(forKey: "pegadaThemeOverride")',
    );
    expect(contents).toContain("window?.overrideUserInterfaceStyle");
    expect(contents.indexOf("window = UIWindow")).toBeLessThan(
      contents.indexOf("overrideUserInterfaceStyle"),
    );
  });

  it("refuses a non-Swift AppDelegate rather than silently passing", () => {
    expect(() =>
      applyIOSThemeOverride({ language: "objc", contents: "" }),
    ).toThrow(/expected a Swift AppDelegate/);
  });
});

describe("initial theme override / Android", () => {
  it("imports AppCompatDelegate and reads the SharedPreferences override", () => {
    const contents = applyAndroidThemeOverride(mainApplicationFixture());

    expect(contents).toContain(
      "import androidx.appcompat.app.AppCompatDelegate",
    );
    expect(contents).toContain(
      'getSharedPreferences("pegada_theme_override", Context.MODE_PRIVATE)',
    );
    expect(contents).toContain('.getString("pegadaThemeOverride", null)');
  });

  it("maps dark/light/system to the matching AppCompatDelegate night mode", () => {
    const contents = applyAndroidThemeOverride(mainApplicationFixture());

    expect(contents).toContain('"dark" -> AppCompatDelegate.MODE_NIGHT_YES');
    expect(contents).toContain('"light" -> AppCompatDelegate.MODE_NIGHT_NO');
    expect(contents).toContain(
      "else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM",
    );
  });

  it("runs the override right after super.onCreate(), before anything else", () => {
    const contents = applyAndroidThemeOverride(mainApplicationFixture());

    expect(contents.indexOf("super.onCreate()")).toBeLessThan(
      contents.indexOf("setDefaultNightMode"),
    );
    expect(contents.indexOf("setDefaultNightMode")).toBeLessThan(
      contents.indexOf("loadReactNative"),
    );
  });

  it("refuses a non-Kotlin MainApplication rather than silently passing", () => {
    expect(() =>
      applyAndroidThemeOverride({ language: "java", contents: "" }),
    ).toThrow(/expected a Kotlin MainApplication/);
  });
});
