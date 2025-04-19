let minimumStrokeSize = 1;

// Running on React Native
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore-next-line -- React Native doesn't have a navigator object
if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
  // Requiring the StyleSheet directly from react-native won't break here

  minimumStrokeSize = require("react-native").StyleSheet.hairlineWidth;
}

export { minimumStrokeSize };
