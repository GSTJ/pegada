module.exports = (api) => {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "babel-plugin-styled-components",
      "react-native-reanimated/plugin", // NOTE: this plugin MUST be last
    ],
  };
};
