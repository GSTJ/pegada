const restrictedImports = [
  {
    name: "react-native",
    importNames: [
      "TouchableOpacity",
      "TouchableHighlight",
      "TouchableNativeFeedback"
    ],
    message:
      "Please do not import Touchables from react-native. Use `import { PressableArea } from @/components/PressableArea` instead."
  },
  {
    name: "react-native",
    importNames: ["TouchableOpacityProps"],
    message:
      "Please do not import Touchables from react-native. Use `import { PressableAreaProps } from @/components/PressableArea` instead."
  },
  {
    name: "react-native",
    importNames: ["Image"],
    message:
      "Please do not import Image from react-native. Use `import { Image } from @/components/Image` instead."
  },
  {
    name: "react-native",
    importNames: ["ImageBackground"],
    message:
      "Please do not import ImageBackground from react-native. Use `import { ImageBackground } from @/components/ImageBackground` instead."
  },
  {
    name: "react-native",
    importNames: ["TouchableWithoutFeedback"],
    message:
      "Please do not import TouchableWithoutFeedback. Use `import { Pressable } from react-native` instead."
  },
  {
    name: "react-native-gesture-handler",
    importNames: [
      "TouchableWithoutFeedback",
      "TouchableOpacity",
      "TouchableHighlight",
      "TouchableNativeFeedback"
    ],
    message:
      "Please do not import Touchables from react-native-gesture-handler. Use `import { PressableArea } from @/components/PressableArea` instead."
  },
  {
    name: "react-native-gesture-handler",
    importNames: ["TouchableWithoutFeedback"],
    message:
      "Please do not import TouchableWithoutFeedback from react-native-gesture-handler. Use `import { Pressable } from react-native` instead."
  },
  {
    name: "react-native-gesture-handler",
    message:
      "Please do not import ScrollView from react-native-gesture-handler. Import from react-native instead.",
    importNames: ["ScrollView", "FlatList", "SectionList"]
  }
];

/** no-restricted-imports can't support different messages for the same package */
const restrictedImportsRules = restrictedImports.map((restrictedImport) => {
  const importNames = restrictedImport.importNames.map((importName) => {
    return `ImportDeclaration[source.value='${restrictedImport.name}'] > ImportSpecifier[imported.name='${importName}']`;
  });

  return {
    selector: importNames.join(", "),
    message: restrictedImport.message
  };
});

/** @type {import("eslint").Linter.Config} */
const config = {
  rules: {
    "no-restricted-syntax": [
      "error",
      "ForInStatement",
      "LabeledStatement",
      "WithStatement",
      ...restrictedImportsRules
    ],
    "no-restricted-imports": ["error", { patterns: [".*"] }],
    "no-console": "error",
    "no-void": 0,
    "import/no-duplicates": "error",
    "import/no-anonymous-default-export": "off",
    "import/order": "off",
    "import/no-mutable-exports": "off",
    "line-comment-position": "off",
    "unused-imports/no-unused-imports": "error",
    "prefer-arrow-functions/prefer-arrow-functions": [
      "error",
      {
        classPropertiesAllowed: false,
        disallowPrototype: false,
        returnStyle: "unchanged",
        singleReturnOnly: false
      }
    ]
  },
  plugins: [
    "unused-imports",
    "import",
    "prefer-arrow-functions",
    "@typescript-eslint",
    "eslint-comments"
  ],
  ignorePatterns: [
    "**/dist/**",
    "**/node_modules/**",
    "**/coverage/**",
    "**/.turbo/**",
    "**/eslint/**"
  ]
};

module.exports = config;
