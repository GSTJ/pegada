/**
 * Stands in for `react-native-unistyles/components/native/*` under jest.
 *
 * The unistyles babel plugin rewrites every react-native primitive a component
 * imports into its own drop-in:
 *
 *     import { View } from "react-native"
 *   → var _View = require("react-native-unistyles/components/native/View")
 *
 * so a `jest.mock("react-native", ...)` never reaches the component that is
 * actually rendered. The real drop-in then runs `buildUnistylesProps` →
 * `getClassname` → `src/web/utils/unistyle.ts`, which is the WEB implementation
 * and reads `.Node` off a DOM global that a node test environment does not
 * have. Every suite that renders one of these died there.
 *
 * The library ships `react-native-unistyles/mocks`, but it mocks the package
 * root only — `components/native/*` is a separate export path it does not
 * cover, so it does not help here.
 *
 * A passthrough is the right shape for these suites: they assert on the props
 * their own styled components receive, never on the primitives' output, and
 * this keeps the styling layer out of a test about behaviour. Components are
 * memoised per name so repeated access is referentially stable, which React
 * requires to avoid remounting on every render.
 */
const cache = new Map();

const passthrough = (name) => {
  if (!cache.has(name)) {
    const Component = ({ children }) => children ?? null;
    Component.displayName = `UnistylesNative(${name})`;
    cache.set(name, Component);
  }

  return cache.get(name);
};

module.exports = new Proxy(
  {},
  {
    get: (_target, key) => {
      if (key === "__esModule") return true;
      if (typeof key === "symbol") return undefined;

      return passthrough(key);
    },
  },
);
