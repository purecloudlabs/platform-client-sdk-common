SDK_REPO=$1
BUILD_DIR=$2
MODULE_NAME=$3
PACKAGE_NAME=$4

echo "SDK_REPO=$SDK_REPO"
echo "BUILD_DIR=$BUILD_DIR"
echo "MODULE_NAME=$MODULE_NAME"
echo "PACKAGE_NAME=$PACKAGE_NAME"

cd $BUILD_DIR

echo "Installing npm global modules..."
npm i rollup@"^2.67.2"
npm i uglify-es@"^3.3.9"
npm i browserify@"^17.0.0"

echo "Installing dependencies..."
npm i

# Build cjs/node
echo "Executing rollup (cjs/node)..."
./node_modules/rollup/dist/bin/rollup -c rollup-cjs-for-node.config.js || { echo "Rollup (cjs/node) failed"; exit 1; }

# Build cjs/browserify
echo "Executing rollup (cjs/browserify)..."
./node_modules/rollup/dist/bin/rollup -c rollup-cjs-for-browserify.config.js || { echo "Rollup (cjs/browserify) failed"; exit 1; }

echo "Browserifying..."
./node_modules/browserify/bin/cmd.js -r "$BUILD_DIR/dist/web-cjs/bundle.js:${MODULE_NAME}" > "$BUILD_DIR/dist/web-cjs/$PACKAGE_NAME.js" || { echo "Browserify failed"; exit 1; }

echo "Minifying...."
./node_modules/uglify-es/bin/uglifyjs "$BUILD_DIR/dist/web-cjs/$PACKAGE_NAME.js" --compress --mangle --output "$BUILD_DIR/dist/web-cjs/$PACKAGE_NAME.min.js" || { echo "Minify failed (cjs/browserify)"; exit 1; }

# Build amd
echo "Executing rollup (amd)..."
./node_modules/rollup/dist/bin/rollup -c rollup-amd.config.js || { echo "Rollup (amd) failed"; exit 1; }

echo "Minifying...."
./node_modules/uglify-es/bin/uglifyjs "$BUILD_DIR/dist/web-amd/$PACKAGE_NAME.js" --compress --mangle --output "$BUILD_DIR/dist/web-amd/$PACKAGE_NAME.min.js" || { echo "Minify failed (amd)"; exit 1; }

echo "Compile script complete"