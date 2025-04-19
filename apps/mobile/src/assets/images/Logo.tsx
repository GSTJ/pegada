import Svg, {
  Defs,
  LinearGradient,
  Path,
  Stop,
  SvgProps
} from "react-native-svg";

const SvgComponent = ({
  colorStopOne,
  colorStopTwo,
  ...props
}: SvgProps & {
  colorStopOne?: string;
  colorStopTwo?: string;
}) => (
  <Svg viewBox="0 0 534 635" {...props}>
    <Path
      fill="url(#a)"
      d="M377.405 443.015c0 43.673 35.04 79.086 78.25 79.086s78.235-35.413 78.235-79.086c0-43.704-35.017-79.102-78.235-79.102-43.218 0-78.25 35.398-78.25 79.102Z"
    />
    <Path
      fill="url(#b)"
      d="M78.242 521.552c43.203.001 78.235-35.413 78.235-79.086 0-43.704-35.032-79.086-78.235-79.086C35.032 363.38 0 398.762 0 442.466c0 43.673 35.025 79.086 78.242 79.086Z"
    />
    <Path
      fill="url(#c)"
      d="M494.055 128.034c.268 76-45.962 127.723-73.275 156.785-27.313 29.062-100.317 113.544-152.284 113.544-51.968 0-128.829-79.954-157.6-113.544-28.772-33.589-70.374-80.785-70.106-156.785C41.057 57.447 97.904 0 167.492 0a124.272 124.272 0 0 1 55.734 13.053c17.335 8.635 33.534 21.034 45.27 36.555 11.734-15.515 25.783-27.911 43.112-36.545A124.302 124.302 0 0 1 367.324 0c69.617 0 126.474 57.456 126.731 128.034Z"
    />
    <Path
      fill="url(#d)"
      d="M268.496 460.999c-47.614 0-87.771 38.781-87.771 86.913s40.157 86.964 87.771 86.964c47.613 0 84.652-38.832 84.652-86.964s-37.039-86.913-84.652-86.913Z"
    />
    <Defs>
      <LinearGradient
        id="a"
        x1={266.945}
        x2={266.945}
        y1={0}
        y2={634.876}
        gradientUnits="userSpaceOnUse"
      >
        <Stop stopColor={colorStopOne ?? props.fill} />
        <Stop offset={1} stopColor={colorStopTwo ?? props.fill} />
      </LinearGradient>
      <LinearGradient
        id="b"
        x1={266.945}
        x2={266.945}
        y1={0}
        y2={634.876}
        gradientUnits="userSpaceOnUse"
      >
        <Stop stopColor={colorStopOne ?? props.fill} />
        <Stop offset={1} stopColor={colorStopTwo ?? props.fill} />
      </LinearGradient>
      <LinearGradient
        id="c"
        x1={266.945}
        x2={266.945}
        y1={0}
        y2={634.876}
        gradientUnits="userSpaceOnUse"
      >
        <Stop stopColor={colorStopOne ?? props.fill} />
        <Stop offset={1} stopColor={colorStopTwo ?? props.fill} />
      </LinearGradient>
      <LinearGradient
        id="d"
        x1={266.945}
        x2={266.945}
        y1={0}
        y2={634.876}
        gradientUnits="userSpaceOnUse"
      >
        <Stop stopColor={colorStopOne ?? props.fill} />
        <Stop offset={1} stopColor={colorStopTwo ?? props.fill} />
      </LinearGradient>
    </Defs>
  </Svg>
);

export default SvgComponent;
