"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/buffer-equal-constant-time";
exports.ids = ["vendor-chunks/buffer-equal-constant-time"];
exports.modules = {

/***/ "(rsc)/../../node_modules/buffer-equal-constant-time/index.js":
/*!**************************************************************!*\
  !*** ../../node_modules/buffer-equal-constant-time/index.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("/*jshint node:true */\n\nvar Buffer = (__webpack_require__(/*! buffer */ \"buffer\").Buffer); // browserify\nvar SlowBuffer = (__webpack_require__(/*! buffer */ \"buffer\").SlowBuffer);\n\nmodule.exports = bufferEq;\n\nfunction bufferEq(a, b) {\n\n  // shortcutting on type is necessary for correctness\n  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {\n    return false;\n  }\n\n  // buffer sizes should be well-known information, so despite this\n  // shortcutting, it doesn't leak any information about the *contents* of the\n  // buffers.\n  if (a.length !== b.length) {\n    return false;\n  }\n\n  var c = 0;\n  for (var i = 0; i < a.length; i++) {\n    /*jshint bitwise:false */\n    c |= a[i] ^ b[i]; // XOR\n  }\n  return c === 0;\n}\n\nbufferEq.install = function() {\n  Buffer.prototype.equal = SlowBuffer.prototype.equal = function equal(that) {\n    return bufferEq(this, that);\n  };\n};\n\nvar origBufEqual = Buffer.prototype.equal;\nvar origSlowBufEqual = SlowBuffer.prototype.equal;\nbufferEq.restore = function() {\n  Buffer.prototype.equal = origBufEqual;\n  SlowBuffer.prototype.equal = origSlowBufEqual;\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vbm9kZV9tb2R1bGVzL2J1ZmZlci1lcXVhbC1jb25zdGFudC10aW1lL2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFBO0FBQ2E7QUFDYixhQUFhLG9EQUF3QixFQUFFO0FBQ3ZDLGlCQUFpQix3REFBNEI7O0FBRTdDOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLGtCQUFrQixjQUFjO0FBQ2hDO0FBQ0Esc0JBQXNCO0FBQ3RCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsiL1VzZXJzL2phcnZpcy9qYXJ2aXMtbGFiL3BlZ2FkYS9ub2RlX21vZHVsZXMvYnVmZmVyLWVxdWFsLWNvbnN0YW50LXRpbWUvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLypqc2hpbnQgbm9kZTp0cnVlICovXG4ndXNlIHN0cmljdCc7XG52YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyOyAvLyBicm93c2VyaWZ5XG52YXIgU2xvd0J1ZmZlciA9IHJlcXVpcmUoJ2J1ZmZlcicpLlNsb3dCdWZmZXI7XG5cbm1vZHVsZS5leHBvcnRzID0gYnVmZmVyRXE7XG5cbmZ1bmN0aW9uIGJ1ZmZlckVxKGEsIGIpIHtcblxuICAvLyBzaG9ydGN1dHRpbmcgb24gdHlwZSBpcyBuZWNlc3NhcnkgZm9yIGNvcnJlY3RuZXNzXG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGEpIHx8ICFCdWZmZXIuaXNCdWZmZXIoYikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBidWZmZXIgc2l6ZXMgc2hvdWxkIGJlIHdlbGwta25vd24gaW5mb3JtYXRpb24sIHNvIGRlc3BpdGUgdGhpc1xuICAvLyBzaG9ydGN1dHRpbmcsIGl0IGRvZXNuJ3QgbGVhayBhbnkgaW5mb3JtYXRpb24gYWJvdXQgdGhlICpjb250ZW50cyogb2YgdGhlXG4gIC8vIGJ1ZmZlcnMuXG4gIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICB2YXIgYyA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgIC8qanNoaW50IGJpdHdpc2U6ZmFsc2UgKi9cbiAgICBjIHw9IGFbaV0gXiBiW2ldOyAvLyBYT1JcbiAgfVxuICByZXR1cm4gYyA9PT0gMDtcbn1cblxuYnVmZmVyRXEuaW5zdGFsbCA9IGZ1bmN0aW9uKCkge1xuICBCdWZmZXIucHJvdG90eXBlLmVxdWFsID0gU2xvd0J1ZmZlci5wcm90b3R5cGUuZXF1YWwgPSBmdW5jdGlvbiBlcXVhbCh0aGF0KSB7XG4gICAgcmV0dXJuIGJ1ZmZlckVxKHRoaXMsIHRoYXQpO1xuICB9O1xufTtcblxudmFyIG9yaWdCdWZFcXVhbCA9IEJ1ZmZlci5wcm90b3R5cGUuZXF1YWw7XG52YXIgb3JpZ1Nsb3dCdWZFcXVhbCA9IFNsb3dCdWZmZXIucHJvdG90eXBlLmVxdWFsO1xuYnVmZmVyRXEucmVzdG9yZSA9IGZ1bmN0aW9uKCkge1xuICBCdWZmZXIucHJvdG90eXBlLmVxdWFsID0gb3JpZ0J1ZkVxdWFsO1xuICBTbG93QnVmZmVyLnByb3RvdHlwZS5lcXVhbCA9IG9yaWdTbG93QnVmRXF1YWw7XG59O1xuIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/../../node_modules/buffer-equal-constant-time/index.js\n");

/***/ })

};
;