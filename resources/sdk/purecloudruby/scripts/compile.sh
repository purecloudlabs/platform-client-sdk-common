BUILD_DIR=$1
EXTENSIONS_TEMP=$2

echo "BUILD_DIR=$BUILD_DIR"
echo "EXTENSIONS_TEMP=$EXTENSIONS_TEMP"

# Add auth extension
cat $BUILD_DIR/lib/purecloudplatformclientv2.rb $EXTENSIONS_TEMP/auth.rb > $EXTENSIONS_TEMP/purecloudplatformclientv2.tmp
mv $EXTENSIONS_TEMP/purecloudplatformclientv2.tmp $BUILD_DIR/lib/purecloudplatformclientv2.rb

# Build
cd $BUILD_DIR
gem build purecloudplatformclientv2.gemspec

#test
gem install $BUILD_DIR/purecloudplatformclientv2*
ruby resources/sdk/purecloudruby/tests/test.rb
