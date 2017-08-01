NPM_AUTH_TOKEN=$1
BUILD_DIR=$2
TEMP_DIR=$3
IS_NEW_RELEASE=$4

echo "BUILD_DIR=$BUILD_DIR"
echo "TEMP_DIR=$TEMP_DIR"
echo "IS_NEW_RELEASE=$IS_NEW_RELEASE"


if [ ! "$IS_NEW_RELEASE" = "true" ]
then
	echo "Skipping npm deploy"
	exit 0
fi

PACKAGE_DIR=$TEMP_DIR/nodepackage

mkdir $PACKAGE_DIR
mkdir $PACKAGE_DIR/src

cp $BUILD_DIR/package.json $PACKAGE_DIR/package.json
cp -r $BUILD_DIR/src $PACKAGE_DIR

cd $PACKAGE_DIR

echo "ca=null
//registry.npmjs.org/:_authToken=${NPM_AUTH_TOKEN}" > ./.npmrc

npm publish