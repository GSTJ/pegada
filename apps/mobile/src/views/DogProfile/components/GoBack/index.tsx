import * as React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import ArrowDown from "@/assets/images/ArrowDown.svg";
import { type BlurEffectPolicy, useResolvedBlurSurfaceMode } from "@/components/BlurView";
import Glassmorphism from "@/components/Glassmorphism";
import { Container, Content } from "./styles";

const EFFECT_PRESSED_STYLE = { transform: [{ scale: 0.96 }] };

type GoBackProps = React.ComponentProps<typeof Container> & {
  blurEffectPolicy?: BlurEffectPolicy;
};

const GoBack = ({ blurEffectPolicy = "stable", ...props }: GoBackProps) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const surfaceMode = useResolvedBlurSurfaceMode(blurEffectPolicy);
  const shouldRenderLiquidGlass = surfaceMode === "glass";
  const shouldAvoidEffectOpacity = shouldRenderLiquidGlass || surfaceMode === "legacy";

  return (
    <Container
      accessibilityRole="button"
      accessibilityLabel={t("common.back")}
      disableActiveOpacity={shouldAvoidEffectOpacity}
      pressedStyle={shouldAvoidEffectOpacity ? EFFECT_PRESSED_STYLE : undefined}
      {...props}
    >
      <Glassmorphism
        blurEffectPolicy={blurEffectPolicy}
        liquidGlassInteractive={shouldRenderLiquidGlass}
      >
        <Content pointerEvents="none">
          <ArrowDown fill={theme.colors.primary} />
        </Content>
      </Glassmorphism>
    </Container>
  );
};

export default GoBack;
