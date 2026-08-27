"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "instrumentation";
exports.ids = ["instrumentation"];
exports.modules = {

/***/ "(instrument)/./src/env.ts":
/*!********************!*\
  !*** ./src/env.ts ***!
  \********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   deployEnvironment: () => (/* binding */ deployEnvironment),\n/* harmony export */   deployRelease: () => (/* binding */ deployRelease),\n/* harmony export */   posthogHost: () => (/* binding */ posthogHost),\n/* harmony export */   posthogServerKey: () => (/* binding */ posthogServerKey)\n/* harmony export */ });\n/**\n * The site's env boundary. `magic-oxlint-config` only allows `process.env`\n * reads in a file called `env.ts`, and bundlers only substitute\n * `process.env.NEXT_PUBLIC_*` where it is written out literally, so both\n * constraints point at exactly this file.\n *\n * `magic-observability` reads `NEXT_PUBLIC_POSTHOG_KEY` / `POSTHOG_KEY` on its\n * own. The explicit reads here exist for one reason: this project's deployment\n * environments already store the token as `POSTHOG_API_KEY` (that is what\n * `@pegada/api` has always used), and the server half should point at the same\n * project rather than sitting dark until someone adds a second variable.\n */ /** Server-side PostHog token. Undefined means telemetry no-ops, silently. */ const posthogServerKey = ()=>process.env.POSTHOG_KEY ?? process.env.POSTHOG_API_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;\nconst posthogHost = ()=>process.env.POSTHOG_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST;\n/**\n * Vercel's deploy environment (`production` / `preview` / `development`) and\n * the commit the bundle was built from, registered as super properties so an\n * exception can be pinned to a deploy.\n */ const deployEnvironment = ()=>process.env.NEXT_PUBLIC_VERCEL_ENV ?? \"development\";\nconst deployRelease = ()=>process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGluc3RydW1lbnQpLy4vc3JjL2Vudi50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7Ozs7Ozs7Ozs7O0NBV0MsR0FFRCwyRUFBMkUsR0FDcEUsTUFBTUEsbUJBQW1CLElBQzlCQyxRQUFRQyxHQUFHLENBQUNDLFdBQVcsSUFDdkJGLFFBQVFDLEdBQUcsQ0FBQ0UsZUFBZSxJQUMzQkgsUUFBUUMsR0FBRyxDQUFDRyx1QkFBdUIsQ0FBQztBQUUvQixNQUFNQyxjQUFjLElBQ3pCTCxRQUFRQyxHQUFHLENBQUNLLFlBQVksSUFBSU4sUUFBUUMsR0FBRyxDQUFDTSx3QkFBd0IsQ0FBQztBQUVuRTs7OztDQUlDLEdBQ00sTUFBTUMsb0JBQW9CLElBQy9CUixRQUFRQyxHQUFHLENBQUNRLHNCQUFzQixJQUFJLGNBQWM7QUFFL0MsTUFBTUMsZ0JBQWdCLElBQzNCVixRQUFRQyxHQUFHLENBQUNVLGlDQUFpQyxDQUFDIiwic291cmNlcyI6WyIvVXNlcnMvamFydmlzL2phcnZpcy1sYWIvcGVnYWRhL2FwcHMvbmV4dGpzL3NyYy9lbnYudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBUaGUgc2l0ZSdzIGVudiBib3VuZGFyeS4gYG1hZ2ljLW94bGludC1jb25maWdgIG9ubHkgYWxsb3dzIGBwcm9jZXNzLmVudmBcbiAqIHJlYWRzIGluIGEgZmlsZSBjYWxsZWQgYGVudi50c2AsIGFuZCBidW5kbGVycyBvbmx5IHN1YnN0aXR1dGVcbiAqIGBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ18qYCB3aGVyZSBpdCBpcyB3cml0dGVuIG91dCBsaXRlcmFsbHksIHNvIGJvdGhcbiAqIGNvbnN0cmFpbnRzIHBvaW50IGF0IGV4YWN0bHkgdGhpcyBmaWxlLlxuICpcbiAqIGBtYWdpYy1vYnNlcnZhYmlsaXR5YCByZWFkcyBgTkVYVF9QVUJMSUNfUE9TVEhPR19LRVlgIC8gYFBPU1RIT0dfS0VZYCBvbiBpdHNcbiAqIG93bi4gVGhlIGV4cGxpY2l0IHJlYWRzIGhlcmUgZXhpc3QgZm9yIG9uZSByZWFzb246IHRoaXMgcHJvamVjdCdzIGRlcGxveW1lbnRcbiAqIGVudmlyb25tZW50cyBhbHJlYWR5IHN0b3JlIHRoZSB0b2tlbiBhcyBgUE9TVEhPR19BUElfS0VZYCAodGhhdCBpcyB3aGF0XG4gKiBgQHBlZ2FkYS9hcGlgIGhhcyBhbHdheXMgdXNlZCksIGFuZCB0aGUgc2VydmVyIGhhbGYgc2hvdWxkIHBvaW50IGF0IHRoZSBzYW1lXG4gKiBwcm9qZWN0IHJhdGhlciB0aGFuIHNpdHRpbmcgZGFyayB1bnRpbCBzb21lb25lIGFkZHMgYSBzZWNvbmQgdmFyaWFibGUuXG4gKi9cblxuLyoqIFNlcnZlci1zaWRlIFBvc3RIb2cgdG9rZW4uIFVuZGVmaW5lZCBtZWFucyB0ZWxlbWV0cnkgbm8tb3BzLCBzaWxlbnRseS4gKi9cbmV4cG9ydCBjb25zdCBwb3N0aG9nU2VydmVyS2V5ID0gKCk6IHN0cmluZyB8IHVuZGVmaW5lZCA9PlxuICBwcm9jZXNzLmVudi5QT1NUSE9HX0tFWSA/P1xuICBwcm9jZXNzLmVudi5QT1NUSE9HX0FQSV9LRVkgPz9cbiAgcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfUE9TVEhPR19LRVk7XG5cbmV4cG9ydCBjb25zdCBwb3N0aG9nSG9zdCA9ICgpOiBzdHJpbmcgfCB1bmRlZmluZWQgPT5cbiAgcHJvY2Vzcy5lbnYuUE9TVEhPR19IT1NUID8/IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1BPU1RIT0dfSE9TVDtcblxuLyoqXG4gKiBWZXJjZWwncyBkZXBsb3kgZW52aXJvbm1lbnQgKGBwcm9kdWN0aW9uYCAvIGBwcmV2aWV3YCAvIGBkZXZlbG9wbWVudGApIGFuZFxuICogdGhlIGNvbW1pdCB0aGUgYnVuZGxlIHdhcyBidWlsdCBmcm9tLCByZWdpc3RlcmVkIGFzIHN1cGVyIHByb3BlcnRpZXMgc28gYW5cbiAqIGV4Y2VwdGlvbiBjYW4gYmUgcGlubmVkIHRvIGEgZGVwbG95LlxuICovXG5leHBvcnQgY29uc3QgZGVwbG95RW52aXJvbm1lbnQgPSAoKTogc3RyaW5nID0+XG4gIHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1ZFUkNFTF9FTlYgPz8gXCJkZXZlbG9wbWVudFwiO1xuXG5leHBvcnQgY29uc3QgZGVwbG95UmVsZWFzZSA9ICgpOiBzdHJpbmcgfCB1bmRlZmluZWQgPT5cbiAgcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfVkVSQ0VMX0dJVF9DT01NSVRfU0hBO1xuIl0sIm5hbWVzIjpbInBvc3Rob2dTZXJ2ZXJLZXkiLCJwcm9jZXNzIiwiZW52IiwiUE9TVEhPR19LRVkiLCJQT1NUSE9HX0FQSV9LRVkiLCJORVhUX1BVQkxJQ19QT1NUSE9HX0tFWSIsInBvc3Rob2dIb3N0IiwiUE9TVEhPR19IT1NUIiwiTkVYVF9QVUJMSUNfUE9TVEhPR19IT1NUIiwiZGVwbG95RW52aXJvbm1lbnQiLCJORVhUX1BVQkxJQ19WRVJDRUxfRU5WIiwiZGVwbG95UmVsZWFzZSIsIk5FWFRfUFVCTElDX1ZFUkNFTF9HSVRfQ09NTUlUX1NIQSJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(instrument)/./src/env.ts\n");

/***/ }),

/***/ "(instrument)/./src/instrumentation.ts":
/*!********************************!*\
  !*** ./src/instrumentation.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   onRequestError: () => (/* binding */ onRequestError),\n/* harmony export */   register: () => (/* binding */ register)\n/* harmony export */ });\n/* harmony import */ var magic_observability_next__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! magic-observability/next */ \"(instrument)/../../node_modules/magic-observability/dist/next/index.js\");\n/* harmony import */ var _env__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/env */ \"(instrument)/./src/env.ts\");\n\n\n/**\n * Server-side error capture. Next calls `onRequestError` for every uncaught\n * throw in a server component, route handler or server action.\n *\n * The handler skips the edge runtime (`posthog-node` cannot symbolicate\n * there), reads `distinct_id` off the `ph_phc_*_posthog` cookie so a server\n * exception lands on the same person as their browser events, attaches the\n * route metadata Next hands over, and flushes before the function freezes.\n *\n * `register` is required by Next but has nothing to do here — the client is\n * built lazily on the first error rather than on every cold start.\n */ const register = ()=>{};\nconst onRequestError = (0,magic_observability_next__WEBPACK_IMPORTED_MODULE_0__.createRequestErrorHandler)({\n    key: (0,_env__WEBPACK_IMPORTED_MODULE_1__.posthogServerKey)(),\n    host: (0,_env__WEBPACK_IMPORTED_MODULE_1__.posthogHost)(),\n    environment: (0,_env__WEBPACK_IMPORTED_MODULE_1__.deployEnvironment)(),\n    release: (0,_env__WEBPACK_IMPORTED_MODULE_1__.deployRelease)()\n});\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGluc3RydW1lbnQpLy4vc3JjL2luc3RydW1lbnRhdGlvbi50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQXFFO0FBT3REO0FBRWY7Ozs7Ozs7Ozs7O0NBV0MsR0FDTSxNQUFNSyxXQUFXLEtBQU8sRUFBRTtBQUUxQixNQUFNQyxpQkFBaUJOLG1GQUF5QkEsQ0FBQztJQUN0RE8sS0FBS0gsc0RBQWdCQTtJQUNyQkksTUFBTUwsaURBQVdBO0lBQ2pCTSxhQUFhUix1REFBaUJBO0lBQzlCUyxTQUFTUixtREFBYUE7QUFDeEIsR0FBRyIsInNvdXJjZXMiOlsiL1VzZXJzL2phcnZpcy9qYXJ2aXMtbGFiL3BlZ2FkYS9hcHBzL25leHRqcy9zcmMvaW5zdHJ1bWVudGF0aW9uLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZVJlcXVlc3RFcnJvckhhbmRsZXIgfSBmcm9tIFwibWFnaWMtb2JzZXJ2YWJpbGl0eS9uZXh0XCI7XG5cbmltcG9ydCB7XG4gIGRlcGxveUVudmlyb25tZW50LFxuICBkZXBsb3lSZWxlYXNlLFxuICBwb3N0aG9nSG9zdCxcbiAgcG9zdGhvZ1NlcnZlcktleSxcbn0gZnJvbSBcIkAvZW52XCI7XG5cbi8qKlxuICogU2VydmVyLXNpZGUgZXJyb3IgY2FwdHVyZS4gTmV4dCBjYWxscyBgb25SZXF1ZXN0RXJyb3JgIGZvciBldmVyeSB1bmNhdWdodFxuICogdGhyb3cgaW4gYSBzZXJ2ZXIgY29tcG9uZW50LCByb3V0ZSBoYW5kbGVyIG9yIHNlcnZlciBhY3Rpb24uXG4gKlxuICogVGhlIGhhbmRsZXIgc2tpcHMgdGhlIGVkZ2UgcnVudGltZSAoYHBvc3Rob2ctbm9kZWAgY2Fubm90IHN5bWJvbGljYXRlXG4gKiB0aGVyZSksIHJlYWRzIGBkaXN0aW5jdF9pZGAgb2ZmIHRoZSBgcGhfcGhjXypfcG9zdGhvZ2AgY29va2llIHNvIGEgc2VydmVyXG4gKiBleGNlcHRpb24gbGFuZHMgb24gdGhlIHNhbWUgcGVyc29uIGFzIHRoZWlyIGJyb3dzZXIgZXZlbnRzLCBhdHRhY2hlcyB0aGVcbiAqIHJvdXRlIG1ldGFkYXRhIE5leHQgaGFuZHMgb3ZlciwgYW5kIGZsdXNoZXMgYmVmb3JlIHRoZSBmdW5jdGlvbiBmcmVlemVzLlxuICpcbiAqIGByZWdpc3RlcmAgaXMgcmVxdWlyZWQgYnkgTmV4dCBidXQgaGFzIG5vdGhpbmcgdG8gZG8gaGVyZSDigJQgdGhlIGNsaWVudCBpc1xuICogYnVpbHQgbGF6aWx5IG9uIHRoZSBmaXJzdCBlcnJvciByYXRoZXIgdGhhbiBvbiBldmVyeSBjb2xkIHN0YXJ0LlxuICovXG5leHBvcnQgY29uc3QgcmVnaXN0ZXIgPSAoKSA9PiB7fTtcblxuZXhwb3J0IGNvbnN0IG9uUmVxdWVzdEVycm9yID0gY3JlYXRlUmVxdWVzdEVycm9ySGFuZGxlcih7XG4gIGtleTogcG9zdGhvZ1NlcnZlcktleSgpLFxuICBob3N0OiBwb3N0aG9nSG9zdCgpLFxuICBlbnZpcm9ubWVudDogZGVwbG95RW52aXJvbm1lbnQoKSxcbiAgcmVsZWFzZTogZGVwbG95UmVsZWFzZSgpLFxufSk7XG4iXSwibmFtZXMiOlsiY3JlYXRlUmVxdWVzdEVycm9ySGFuZGxlciIsImRlcGxveUVudmlyb25tZW50IiwiZGVwbG95UmVsZWFzZSIsInBvc3Rob2dIb3N0IiwicG9zdGhvZ1NlcnZlcktleSIsInJlZ2lzdGVyIiwib25SZXF1ZXN0RXJyb3IiLCJrZXkiLCJob3N0IiwiZW52aXJvbm1lbnQiLCJyZWxlYXNlIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(instrument)/./src/instrumentation.ts\n");

/***/ }),

/***/ "node:async_hooks":
/*!***********************************!*\
  !*** external "node:async_hooks" ***!
  \***********************************/
/***/ ((module) => {

module.exports = require("node:async_hooks");

/***/ }),

/***/ "node:fs":
/*!**************************!*\
  !*** external "node:fs" ***!
  \**************************/
/***/ ((module) => {

module.exports = require("node:fs");

/***/ }),

/***/ "node:readline":
/*!********************************!*\
  !*** external "node:readline" ***!
  \********************************/
/***/ ((module) => {

module.exports = require("node:readline");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("./webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/@posthog","vendor-chunks/posthog-node","vendor-chunks/magic-observability"], () => (__webpack_exec__("(instrument)/./src/instrumentation.ts")));
module.exports = __webpack_exports__;

})();