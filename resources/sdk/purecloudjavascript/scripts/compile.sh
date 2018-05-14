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

cd $BUILD_DIR

npm i
npm run rollup || { echo "rollup failed"; exit 1; }

cd $BUILD_DIR
mkdir web

# https://github.com/substack/node-browserify
npm install browserify -g

# https://github.com/mishoo/UglifyJS2
npm install uglify-es -g

echo "Browserifying..."
browserify -r "$BUILD_DIR/bundle.js:${MODULE_NAME}" > "$BUILD_DIR/web/$PACKAGE_NAME.js" || { echo "Browserify failed"; exit 1; }

# Each file

echo "Minifying...."
uglifyjs "$BUILD_DIR/web/$PACKAGE_NAME.js" --compress --mangle --output "$BUILD_DIR/web/$PACKAGE_NAME.min.js" || { echo "Minify failed"; exit 1; }
