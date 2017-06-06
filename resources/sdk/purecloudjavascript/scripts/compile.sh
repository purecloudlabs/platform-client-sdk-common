SDK_REPO=$1
BUILD_DIR=$2
RESOURCE_DIR=$3
PACKAGE_NAME=$4

echo "SDK_REPO=$SDK_REPO"
echo "BUILD_DIR=$BUILD_DIR"
echo "RESOURCE_DIR=$RESOURCE_DIR"
echo "PACKAGE_NAME=$PACKAGE_NAME"

exit 0

cd $BUILD_DIR
mkdir web

npm install browserify -g
npm install uglify-es -g

echo "Browserifying..."
browserify "$BUILD_DIR/src/$PACKAGE_NAME/index.js" > "$BUILD_DIR/web/$PACKAGE_NAME.js"

echo "Minifying...."
uglifyjs "$BUILD_DIR/web/$PACKAGE_NAME.js" --compress --output "$BUILD_DIR/web/$PACKAGE_NAME.min.js"