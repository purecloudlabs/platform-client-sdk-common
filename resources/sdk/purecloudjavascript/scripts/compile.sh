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

echo "Installing npm global modules..."
npm i -g rollup@"^2.67.2"
npm i -g uglify-es@"^3.3.9"
npm i -g browserify@"^17.0.0"
npm i -g pm2@"^5.3.0"

echo "Installing dependencies..."
npm i

# start_proxy() {
# set +e
# if pm2 list | grep -q "proxy-server"; then
#     echo "App is already running."
# else
#     # Start the app
#     pm2 start "proxy.js" --name proxy-server
#     echo "App started."
# fi
# set -e
# }

# Check if the app is already running
echo "check for pm2"
pm2 list || { echo "Pm2 failed"; exit 1; }

# Build cjs/node
echo "Executing rollup (cjs/node)..."
rollup -c rollup-cjs-for-node.config.js || { echo "Rollup (cjs/node) failed"; exit 1; }

# Build cjs/browserify
echo "Executing rollup (cjs/browserify)..."
rollup -c rollup-cjs-for-browserify.config.js || { echo "Rollup (cjs/browserify) failed"; exit 1; }

echo "Browserifying..."
browserify -r "$BUILD_DIR/dist/web-cjs/bundle.js:${MODULE_NAME}" > "$BUILD_DIR/dist/web-cjs/$PACKAGE_NAME.js" || { echo "Browserify failed"; exit 1; }

echo "Minifying...."
uglifyjs "$BUILD_DIR/dist/web-cjs/$PACKAGE_NAME.js" --compress --mangle --output "$BUILD_DIR/dist/web-cjs/$PACKAGE_NAME.min.js" || { echo "Minify failed (cjs/browserify)"; exit 1; }

# Build amd
echo "Executing rollup (amd)..."
rollup -c rollup-amd.config.js || { echo "Rollup (amd) failed"; exit 1; }

echo "Minifying...."
uglifyjs "$BUILD_DIR/dist/web-amd/$PACKAGE_NAME.js" --compress --mangle --output "$BUILD_DIR/dist/web-amd/$PACKAGE_NAME.min.js" || { echo "Minify failed (amd)"; exit 1; }


echo "Compile script complete"


