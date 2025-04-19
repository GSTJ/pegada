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
  <Svg {...props} viewBox="0 0 29 30" fill="none">
    <Path
      fill="url(#a)"
      d="M7.73 7.292a6.946 6.946 0 0 0 6.937 6.937 6.946 6.946 0 0 0 6.937-6.937A6.946 6.946 0 0 0 14.667.354a6.946 6.946 0 0 0-6.938 6.938ZM27 29.646h1.542v-1.542c0-5.95-4.843-10.791-10.792-10.791h-6.167c-5.95 0-10.791 4.842-10.791 10.791v1.542H27Z"
    />
    <Defs>
      <LinearGradient
        id="a"
        x1={14.667}
        x2={14.667}
        y1={0.354}
        y2={29.646}
        gradientUnits="userSpaceOnUse"
      >
        <Stop stopColor={colorStopOne} />
        <Stop offset={1} stopColor={colorStopTwo} />
      </LinearGradient>
    </Defs>
  </Svg>
);
export default SvgComponent;
