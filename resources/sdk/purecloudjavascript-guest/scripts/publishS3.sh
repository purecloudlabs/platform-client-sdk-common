BUILD_DIR=$1
IS_NEW_RELEASE=$2
VERSION=$3

echo "BUILD_DIR=$BUILD_DIR"
echo "IS_NEW_RELEASE=$IS_NEW_RELEASE"
echo "VERSION=$VERSION"


if [ ! "$IS_NEW_RELEASE" = "true" ]
then
	echo "Skipping npm deploy"
	exit 0
fi

cd $BUILD_DIR

# CJS
aws s3 cp \
	$BUILD_DIR/dist/web-cjs \
	s3://inin-index-files-prod/developercenter-cdn/javascript-guest/$VERSION \
	--recursive --acl "public-read"
aws s3 cp \
	$BUILD_DIR/dist/web-cjs \
	s3://inin-index-files-prod/developercenter-cdn/javascript-guest/latest \
	--recursive --acl "public-read"

# AMD
aws s3 cp \
	$BUILD_DIR/dist/web-amd \
	s3://inin-index-files-prod/developercenter-cdn/javascript-guest/amd/$VERSION \
	--recursive --acl "public-read"
aws s3 cp \
	$BUILD_DIR/dist/web-amd \
	s3://inin-index-files-prod/developercenter-cdn/javascript-guest/amd/latest \
	--recursive --acl "public-read"


