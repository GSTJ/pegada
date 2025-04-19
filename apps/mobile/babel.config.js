module.exports = (api) => {
  api.cache(true);
  const isTestEnv = process.env.NODE_ENV === "test";

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "babel-plugin-styled-components",
      "react-native-reanimated/plugin" // NOTE: this plugin MUST be last
    ]
  };
};
