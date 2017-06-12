SDK_REPO=$1
BUILD_DIR=$2
RESOURCE_DIR=$3
MODULE_NAME=$4
PACKAGE_NAME=$5

echo "SDK_REPO=$SDK_REPO"
echo "BUILD_DIR=$BUILD_DIR"
echo "RESOURCE_DIR=$RESOURCE_DIR"
echo "MODULE_NAME=$MODULE_NAME"
echo "PACKAGE_NAME=$PACKAGE_NAME"

#exit 0

cd $BUILD_DIR
mkdir web

#npm install browserify -g
#npm install uglify-es -g

echo "Browserifying..."
browserify -r "$BUILD_DIR/src/$PACKAGE_NAME/index.js:${MODULE_NAME}" "$BUILD_DIR/src/$PACKAGE_NAME/index.js" > "$BUILD_DIR/web/$PACKAGE_NAME.js" || { echo "Browserify failed"; exit 1;}

echo "Minifying...."
uglifyjs "$BUILD_DIR/web/$PACKAGE_NAME.js" --compress --output "$BUILD_DIR/web/$PACKAGE_NAME.min.js" || { echo "Minify failed"; exit 1;}
