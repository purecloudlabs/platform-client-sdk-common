BUILD_DIR=$1
EXTENSIONS_TEMP=$2
VERSION=$3

echo "BUILD_DIR=$BUILD_DIR"
echo "EXTENSIONS_TEMP=$EXTENSIONS_TEMP"
echo "VERSION=$VERSION"

# Add auth extension
echo "Adding auth extensions..."
cat $BUILD_DIR/lib/purecloudplatformclientv2.rb $EXTENSIONS_TEMP/auth.rb > $EXTENSIONS_TEMP/purecloudplatformclientv2.tmp
mv $EXTENSIONS_TEMP/purecloudplatformclientv2.tmp $BUILD_DIR/lib/purecloudplatformclientv2.rb

# Truncate long file names
echo "Truncating file names..."
cd $BUILD_DIR/lib/purecloudplatformclientv2/models
for f in *.rb
do
	# Strip extension
	FILEBASE=$(basename "$f" ".rb")

	# Needs to be truncated? (max 100 chars, with extension)
	if [ ${#FILEBASE} -gt 97 ]
	then
		SHORTNAME=${FILEBASE:0:97}

		# Rename file
		echo "$f > $SHORTNAME".rb
		mv "$f" "$SHORTNAME".rb

		# Update require path
		sed -i -e "s/$FILEBASE/$SHORTNAME/g" $BUILD_DIR/lib/purecloudplatformclientv2.rb
	fi
done

# Build
echo "Building gem..."
cd $BUILD_DIR
gem build purecloudplatformclientv2.gemspec

#test
echo "Running tests..."
gem install 'test-unit'
gem install $BUILD_DIR/purecloudplatformclientv2-$VERSION.gem --no-document
ruby $COMMON_ROOT/resources/sdk/purecloudruby/scripts/test.rb
