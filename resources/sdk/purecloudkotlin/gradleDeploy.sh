BUILD_DIR=$1
IS_NEW_RELEASE=$2

echo "BUILD_DIR=$BUILD_DIR"
echo "IS_NEW_RELEASE=$IS_NEW_RELEASE"

if [ ! "$IS_NEW_RELEASE" = "true" ]
then
	echo "Skipping maven deploy"
	exit 0
fi

# CD to build dir
cd $BUILD_DIR

./gradlew artifactoryPublish