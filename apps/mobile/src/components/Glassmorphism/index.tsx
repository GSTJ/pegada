import * as React from "react";

import { PegadaBlurViewProps, useBlurSurfaceMode } from "@/components/BlurView";
import { Container, Gradient } from "./styles";

const GlassmorphismContent: React.FC<React.PropsWithChildren> = ({ children }) => {
  const surfaceMode = useBlurSurfaceMode();

  return surfaceMode === "legacy" ? <Gradient>{children}</Gradient> : <>{children}</>;
};

const Glassmorphism: React.FC<PegadaBlurViewProps> = ({ children, ...props }) => {
  return (
    <Container {...props}>
      <GlassmorphismContent>{children}</GlassmorphismContent>
    </Container>
  );
};

export default Glassmorphism;
