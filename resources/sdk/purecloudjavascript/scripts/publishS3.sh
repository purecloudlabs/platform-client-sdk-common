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

aws s3 cp \
	$BUILD_DIR/web \
	s3://inin-index-files-prod/developercenter-cdn/javascript/$VERSION \
	--recursive --acl "public-read"
aws s3 cp \
	$BUILD_DIR/web \
	s3://inin-index-files-prod/developercenter-cdn/javascript/latest \
	--recursive --acl "public-read"