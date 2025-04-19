import { useTheme } from "styled-components";

import Check from "@/assets/images/Check.svg";
import { Container } from "./styles";

export const Checkbox = ({ selected }: { selected?: boolean }) => {
  const theme = useTheme();
  return (
    <Container selected={selected}>
      {selected ? <Check color={theme.colors.primary} /> : null}
    </Container>
  );
};
