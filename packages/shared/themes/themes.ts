import { minimumStrokeSize } from "./minimumStrokeSize";

export enum Font {
  GilroyLight = "Gilroy-Light",
  GilroyMedium = "Gilroy-Medium",
  GilroyBold = "Gilroy-Bold",
  GilroySemiBold = "Gilroy-SemiBold",
  GilroyExtraBold = "Gilroy-ExtraBold",
  GilroyRegular = "Gilroy-Regular"
}

const BASE_SPACING = 4;

export const DefaultConfigs = {
  radii: {
    sm: 6,
    md: 12,
    lg: 24,
    xl: 32,
    round: 9999
  },
  // https://tailwindcss.com/docs/space
  spacing: {
    0.5: BASE_SPACING * 0.5,
    1: BASE_SPACING * 1,
    1.5: BASE_SPACING * 1.5,
    2: BASE_SPACING * 2,
    2.5: BASE_SPACING * 2.5,
    3: BASE_SPACING * 3,
    3.5: BASE_SPACING * 3.5,
    4: BASE_SPACING * 4,
    5: BASE_SPACING * 5,
    6: BASE_SPACING * 6,
    7: BASE_SPACING * 7,
    8: BASE_SPACING * 8,
    9: BASE_SPACING * 9,
    10: BASE_SPACING * 10,
    11: BASE_SPACING * 11,
    12: BASE_SPACING * 12,
    14: BASE_SPACING * 14,
    16: BASE_SPACING * 16,
    20: BASE_SPACING * 20,
    24: BASE_SPACING * 24,
    28: BASE_SPACING * 28,
    32: BASE_SPACING * 32
  },
  stroke: {
    sm: minimumStrokeSize,
    md: minimumStrokeSize * 2,
    lg: minimumStrokeSize * 3,
    xl: minimumStrokeSize * 4,
    xxl: minimumStrokeSize * 5
  },
  typography: {
    fontFamily: {
      light: Font.GilroyLight,
      medium: Font.GilroyMedium,
      regular: Font.GilroyRegular,
      semibold: Font.GilroySemiBold,
      bold: Font.GilroyBold,
      black: Font.GilroyExtraBold
    },

    sizes: {
      xxxl: {
        size: 38
      },
      xxl: {
        size: 32
      },
      xl: {
        size: 24
      },
      lg: {
        size: 18
      },
      md: {
        size: 16
      },
      sm: {
        size: 15
      },
      xs: {
        size: 14
      },
      xxs: {
        size: 11
      }
    }
  }
} as const;

export const LightTheme = {
  ...DefaultConfigs,
  dark: false,
  colors: {
    transparent: "transparent",

    black: "hsl(0, 0%, 0%)",

    white: "hsl(0, 0%, 100%)",

    premium: "hsl(47, 100%, 55%)",

    primary: "hsl(333, 81%, 66%)",

    secondary: "hsl(333, 81%, 95%)",

    background: "hsl(0, 0%, 100%)",

    text: "hsl(222.2, 84%, 4.9%)",

    subtitle: "hsl(222.2, 10%, 39%)",

    card: "hsl(0, 0%, 97.5%)",

    placeholder: "hsl(215.4, 16.3%, 65%)",

    accent: "hsl(210, 40%, 96.1%)",

    destructive: "hsl(0, 85%, 60%)",

    border: "hsl(214.3, 31.8%, 91.4%)",

    input: "hsl(0, 0%, 98%)"
  }
};

export const DarkTheme: typeof LightTheme = {
  ...DefaultConfigs,
  dark: true,
  colors: {
    transparent: "transparent",

    black: "hsl(0, 0%, 0%)",

    white: "hsl(0, 0%, 100%)",

    premium: "hsl(47, 100%, 55%)",

    primary: "hsl(333, 58%, 59%)",

    secondary: "hsl(333, 58%, 5%)",

    background: "hsl(0, 0%, 0%)", // Black

    text: "hsl(0, 0%, 95%)", // Almost White, for readability on a black background

    subtitle: "hsl(0, 0%, 60%)",

    card: "hsl(0, 0%, 15%)", // Slightly lighter black for distinction

    placeholder: "hsl(0, 0%, 50%)", // Gray color for placeholders

    accent: "hsl(0, 0%, 20%)", // Dark gray for accentuation

    destructive: "hsl(0, 95%, 70%)", // Keeping the same red for destructive actions

    border: "hsl(0, 0%, 12%)", // Dark gray border for separation

    input: "hsl(0, 0%, 7%)" // Slightly lighter black for inputs
  }
};

export const DefaultTheme = LightTheme;
