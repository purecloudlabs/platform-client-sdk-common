BUILD_DIR=$1
EXTENSIONS_TEMP=$2

echo "BUILD_DIR=$BUILD_DIR"
echo "EXTENSIONS_TEMP=$EXTENSIONS_TEMP"

# Add auth extension
cat $BUILD_DIR/lib/purecloudplatformclientv2.rb extensions/auth.rb > $EXTENSIONS_TEMP/purecloudplatformclientv2.tmp
mv $EXTENSIONS_TEMP/purecloudplatformclientv2.tmp $BUILD_DIR/lib/purecloudplatformclientv2.rb

# Build
cd $BUILD_DIR
gem build purecloudplatformclientv2.gemspec
