// Metro turns an image/font `require` into an opaque asset handle. Jest has no
// Metro, so it tries to parse the binary as JavaScript and the whole suite dies
// on the first byte of a .webp. Any component that renders an asset therefore
// needs this stub — the tests only ever care that *something* was passed to the
// image, never what.
module.exports = "asset-stub";
