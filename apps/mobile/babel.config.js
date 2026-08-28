module.exports = (api) => {
  api.cache(true);

  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins: [
      // NOTE: this plugin MUST be first — it has to see the untouched
      // StyleSheet.create calls before react-compiler (pulled in by
      // babel-preset-expo) rewrites the components around them.
      ["react-native-unistyles/plugin", { root: "src" }],
      "react-native-reanimated/plugin", // NOTE: this plugin MUST be last
    ],
  };
};
