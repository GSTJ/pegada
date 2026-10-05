export interface HeroShadow {
  color: string;
  opacity: number;
  radius: number;
  offset: {
    width: number;
    height: number;
  };
  elevation: number;
}

/**
 * The first Swipe card's real native shadow. FeedbackCard and the flying
 * photo both consume this value so ownership can move without a visual jump.
 */
export const SWIPE_CARD_HERO_SHADOW: HeroShadow = {
  color: "#000000",
  opacity: 0.1,
  radius: 1,
  offset: { width: 0, height: 1 },
  elevation: 0.5,
};

export const NO_HERO_SHADOW: HeroShadow = {
  color: "#000000",
  opacity: 0,
  radius: 0,
  offset: { width: 0, height: 0 },
  elevation: 0,
};
