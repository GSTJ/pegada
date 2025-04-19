import styled, {
  css,
  DefaultTheme as DefaultThemeProps
} from "styled-components/native";

export interface TextProps {
  fontSize?: keyof DefaultThemeProps["typography"]["sizes"];
  color?: keyof DefaultThemeProps["colors"];
  fontWeight?: keyof DefaultThemeProps["typography"]["fontFamily"];
}

export const Text = styled.Text<TextProps>`
  color: ${(props) => {
    const { colors } = props.theme;
    return colors[props.color ?? "text"];
  }};

  font-family: ${(props) => {
    const { fontFamily } = props.theme.typography;
    return fontFamily[props.fontWeight ?? "regular"];
  }};

  font-weight: ${(props) => props.fontWeight ?? "regular"};

  ${(props) => {
    const { sizes } = props.theme.typography;

    const selectedSize = sizes[props.fontSize ?? "md"];

    return css`
      font-size: ${selectedSize.size}px;
    `;
  }}
`;
