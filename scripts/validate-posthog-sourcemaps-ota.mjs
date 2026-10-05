#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const outputDirectory = path.resolve(process.argv[2] ?? "dist");
const metadataPath = path.join(outputDirectory, "metadata.json");

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

if (!fs.existsSync(metadataPath)) {
  fail(
    `Expo update metadata is missing at ${metadataPath}. Run this immediately after eas update and upload that command's unchanged dist directory.`,
  );
}

let metadata;
try {
  metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
} catch (error) {
  fail(
    `could not parse ${metadataPath}: ${error instanceof Error ? error.message : String(error)}`,
  );
}

const expectedPlatforms = ["ios", "android"];
const foundPlatforms = Object.keys(metadata.fileMetadata ?? {});
if (
  foundPlatforms.length !== expectedPlatforms.length ||
  expectedPlatforms.some((platform) => !foundPlatforms.includes(platform))
) {
  fail(
    `expected Expo metadata for ios and android, found ${foundPlatforms.join(", ") || "none"}. Refusing a partial upload.`,
  );
}

const publiclyReferencedPaths = new Set();
for (const platform of expectedPlatforms) {
  const platformMetadata = metadata.fileMetadata[platform];
  if (!Array.isArray(platformMetadata?.assets)) {
    fail(`Expo metadata does not contain a valid ${platform} asset list.`);
  }
  publiclyReferencedPaths.add(platformMetadata.bundle);
  for (const asset of platformMetadata.assets) {
    if (typeof asset?.path !== "string") {
      fail(`Expo metadata contains a ${platform} asset without a valid path.`);
    }
    publiclyReferencedPaths.add(asset.path);
  }
}

const expectedSourceMapPaths = new Set();
for (const platform of expectedPlatforms) {
  const platformMetadata = metadata.fileMetadata[platform];
  const relativeBundlePath = platformMetadata?.bundle;
  if (typeof relativeBundlePath !== "string" || relativeBundlePath.length === 0) {
    fail(`Expo metadata does not identify the ${platform} bundle.`);
  }

  const bundlePath = path.resolve(outputDirectory, relativeBundlePath);
  if (!bundlePath.startsWith(`${outputDirectory}${path.sep}`)) {
    fail(`${platform} bundle path escapes the Expo output directory.`);
  }
  const sourceMapPath = `${bundlePath}.map`;
  const relativeSourceMapPath = `${relativeBundlePath}.map`;
  expectedSourceMapPaths.add(relativeSourceMapPath);
  if (!fs.existsSync(bundlePath)) {
    fail(`${platform} bundle is missing at ${bundlePath}.`);
  }
  if (!fs.existsSync(sourceMapPath)) {
    fail(
      `${platform} sourcemap is missing at ${sourceMapPath}. Ensure eas update exports with sourcemaps before uploading.`,
    );
  }

  let sourceMap;
  try {
    sourceMap = JSON.parse(fs.readFileSync(sourceMapPath, "utf8"));
  } catch (error) {
    fail(
      `could not parse the ${platform} sourcemap: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (
    sourceMap.version !== 3 ||
    !Array.isArray(sourceMap.sources) ||
    sourceMap.sources.length === 0 ||
    !Array.isArray(sourceMap.sourcesContent) ||
    sourceMap.sourcesContent.length !== sourceMap.sources.length ||
    typeof sourceMap.mappings !== "string" ||
    sourceMap.mappings.length === 0
  ) {
    fail(
      `${platform} sourcemap is incomplete and would not provide useful source-level stack traces.`,
    );
  }

  const debugId = sourceMap.debugId;
  if (
    typeof debugId !== "string" ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(debugId)
  ) {
    fail(
      `${platform} sourcemap has no valid debug ID. Check the posthog-react-native Metro wrapper before publishing.`,
    );
  }

  if (!fs.readFileSync(bundlePath).includes(Buffer.from(debugId))) {
    fail(
      `${platform} bundle does not contain the sourcemap debug ID ${debugId}; refusing mismatched maps.`,
    );
  }

  if (publiclyReferencedPaths.has(relativeSourceMapPath)) {
    fail(
      `${platform} sourcemap is referenced by Expo publish metadata and could be served as an update asset.`,
    );
  }

  console.log(`Validated ${platform} bundle and private sourcemap (debug ID ${debugId}).`);
}

const actualSourceMapPaths = listFiles(outputDirectory)
  .filter((filePath) => filePath.endsWith(".map"))
  .map((filePath) => path.relative(outputDirectory, filePath).split(path.sep).join("/"));
if (
  actualSourceMapPaths.length !== expectedSourceMapPaths.size ||
  actualSourceMapPaths.some((sourceMapPath) => !expectedSourceMapPaths.has(sourceMapPath))
) {
  fail(
    `found unexpected or stale sourcemaps in ${outputDirectory}: ${actualSourceMapPaths.join(", ") || "none"}. Refusing to upload mixed artifacts.`,
  );
}
