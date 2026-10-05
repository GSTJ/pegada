import { createContext, useContext } from "react";
import * as React from "react";
import { type SharedValue, useSharedValue } from "react-native-reanimated";

export const HERO_MORPH_DURATION = 320;

interface HeroMotionValues {
  progress: SharedValue<number>;
  recovery: SharedValue<number>;
}

const HeroMotionContext = createContext<HeroMotionValues | null>(null);

/** One UI-thread clock shared by the flying elements and the surrounding scene. */
export const HeroMotionProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const progress = useSharedValue(0);
  const recovery = useSharedValue(0);
  const value = React.useMemo(() => ({ progress, recovery }), [progress, recovery]);

  return <HeroMotionContext.Provider value={value}>{children}</HeroMotionContext.Provider>;
};

export const useHeroMotionProgress = () => {
  const values = useContext(HeroMotionContext);
  if (!values) throw new Error("useHeroMotionProgress must be used inside HeroMotionProvider");
  return values.progress;
};

/** Failure-only handoff clock; the ordinary hero still has exactly one p. */
export const useHeroRecoveryProgress = () => {
  const values = useContext(HeroMotionContext);
  if (!values) throw new Error("useHeroRecoveryProgress must be used inside HeroMotionProvider");
  return values.recovery;
};
