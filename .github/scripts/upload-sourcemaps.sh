cd apps/mobile

EAS_UPDATE_LIST=$(eas update:list --branch=main --limit=1 --json --non-interactive)
LAST_UPDATE_ID=$(echo $EAS_UPDATE_LIST | jq -r '.currentPage[0].group')

echo "Update list:"
echo $EAS_UPDATE_LIST

ANDROID_SOURCE_MAP_PATH=$(find dist/_expo/static/js/android -name "index-*.map" -type f)
ANDROID_BUNDLE_PATH=$(find dist/_expo/static/js/android -name "index-*.hbc" -type f)

echo "Uploading Android..."

echo "Android source map path: $ANDROID_SOURCE_MAP_PATH"
echo "Android bundle path: $ANDROID_BUNDLE_PATH"

npx bugsnag-source-maps upload-react-native \
  --api-key $EXPO_PUBLIC_BUGSNAG_API_KEY \
  --platform android \
  --source-map $ANDROID_SOURCE_MAP_PATH \
  --bundle $ANDROID_BUNDLE_PATH \
  --code-bundle-id $LAST_UPDATE_ID \

IOS_SOURCE_MAP_PATH=$(find dist/_expo/static/js/ios -name "index-*.map" -type f)
IOS_BUNDLE_PATH=$(find dist/_expo/static/js/ios -name "index-*.hbc" -type f)

echo "Uploading iOS..."

echo "iOS source map path: $IOS_SOURCE_MAP_PATH"
echo "iOS bundle path: $IOS_BUNDLE_PATH"

npx bugsnag-source-maps upload-react-native \
  --api-key $EXPO_PUBLIC_BUGSNAG_API_KEY \
  --platform ios \
  --source-map $IOS_SOURCE_MAP_PATH \
  --bundle $IOS_BUNDLE_PATH \
  --code-bundle-id $LAST_UPDATE_ID \