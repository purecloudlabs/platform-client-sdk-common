SDK_REPO=$1
BUILD_DIR=$2
RESOURCE_DIR=$3
PACKAGE_NAME=$4

echo "SDK_REPO=$SDK_REPO"
echo "BUILD_DIR=$BUILD_DIR"
echo "RESOURCE_DIR=$RESOURCE_DIR"
echo "PACKAGE_NAME"=$PACKAGE_NAME

echo "Beep. Boop. Look at me! I'm a computer compiling things!"

# Copy readme as doc index file
cp "$BUILD_DIR/README.md" "$BUILD_DIR/docs/index.md"

# Copy podspec to root; cocoapods can't handle subdirectories
cp "$BUILD_DIR/$PACKAGE_NAME.podspec" "$SDK_REPO/$PACKAGE_NAME.podspec"
