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
  <Svg {...props} viewBox="0 0 32 32" fill="none">
    <Path
      fill="url(#a)"
      d="M11.978 3.883C14.005 1.636 17.181.19 20.75.19c6.121 0 11.083 4.253 11.083 9.5 0 3.15-1.789 5.941-4.54 7.67a4.366 4.366 0 0 1-.21.12v6.413a1.583 1.583 0 0 1-2.72 1.102l-1.805-1.859c1.693-2.001 2.689-4.459 2.689-7.114 0-6.44-5.855-11.709-13.269-12.14Z"
    />
    <Path
      fill="url(#b)"
      d="m13.443 25.343-5.806 5.985a1.584 1.584 0 0 1-2.72-1.102v-6.412a4.522 4.522 0 0 1-.21-.12c-2.753-1.73-4.54-4.521-4.54-7.67 0-5.247 4.962-9.5 11.083-9.5s11.083 4.253 11.083 9.5c0 4.316-3.358 7.96-7.957 9.117-.309.079-.62.146-.933.202Z"
    />
    <Defs>
      <LinearGradient
        id="a"
        x1={16}
        x2={16}
        y1={0.19}
        y2={31.809}
        gradientUnits="userSpaceOnUse"
      >
        <Stop stopColor={colorStopOne} />
        <Stop offset={1} stopColor={colorStopTwo} />
      </LinearGradient>
      <LinearGradient
        id="b"
        x1={16}
        x2={16}
        y1={0.19}
        y2={31.809}
        gradientUnits="userSpaceOnUse"
      >
        <Stop stopColor={colorStopOne} />
        <Stop offset={1} stopColor={colorStopTwo} />
      </LinearGradient>
    </Defs>
  </Svg>
);
export default SvgComponent;
