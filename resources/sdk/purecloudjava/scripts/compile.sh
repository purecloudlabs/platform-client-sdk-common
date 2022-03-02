BUILD_MODE=$1 # package/verify/deploy/deploy:deploy
BUILD_DIR=$2
MAVEN_SETTINGS_FILE=$3
DPGP_PASSPHRASE=$4
SKIP_TESTS=$5
IS_NEW_RELEASE=$6
VERSION=$7

echo "BUILD_MODE=$BUILD_MODE"
echo "BUILD_DIR=$BUILD_DIR"
echo "MAVEN_SETTINGS_FILE=$MAVEN_SETTINGS_FILE"
echo "SKIP_TESTS=$SKIP_TESTS"
echo "IS_NEW_RELEASE=$IS_NEW_RELEASE"
echo "VERSION=$VERSION"

# Verify settings
if [ ! -z "$MAVEN_SETTINGS_FILE" ]
then
	MAVEN_SETTINGS_FILE="--settings $MAVEN_SETTINGS_FILE"
fi

if [ ! -z "$DPGP_PASSPHRASE" ]
then
	DPGP_PASSPHRASE="-Dgpg.passphrase=$DPGP_PASSPHRASE"
fi

if [ ! "$BUILD_MODE" = "package" ] && [ ! "$BUILD_MODE" = "verify" ] && [ ! "$BUILD_MODE" = "deploy" ]
then
	echo "Unknown build mode $BUILD_MODE"
	exit 1
fi

if [ "$BUILD_MODE" = "deploy" ] && [ ! "$IS_NEW_RELEASE" = "true" ]
then
	echo "IS_NEW_RELEASE=$IS_NEW_RELEASE and BUILD_MODE=$BUILD_MODE, forcing BUILD_MODE to verify"
	BUILD_MODE="verify"
fi

if [ "$SKIP_TESTS" = "true" ]
then
	TESTS="-Dmaven.test.skip=true"
fi

# Add maven to PATH
export PATH=$PATH:/usr/local/maven/bin

# CD to build dir
cd $BUILD_DIR

# Build
mvn $MAVEN_SETTINGS_FILE $BUILD_MODE $TESTS $DPGP_PASSPHRASE -Dversion=$VERSION