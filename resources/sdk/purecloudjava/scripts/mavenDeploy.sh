ARTIFACT_NAME=$1
BUILD_DIR=$2
MAVEN_SETTINGS_FILE=$3
DPGP_PASSPHRASE=$4
MAVEN_REPO_URL=$5
MAVEN_REPO_ID=$6
IS_NEW_RELEASE=$7
VERSION=$8

echo "ARTIFACT_NAME=$ARTIFACT_NAME"
echo "BUILD_DIR=$BUILD_DIR"
echo "MAVEN_SETTINGS_FILE=$MAVEN_SETTINGS_FILE"
echo "DPGP_PASSPHRASE=$DPGP_PASSPHRASE"
echo "MAVEN_REPO_URL=$MAVEN_REPO_URL"
echo "MAVEN_REPO_ID=$MAVEN_REPO_ID"
echo "IS_NEW_RELEASE=$IS_NEW_RELEASE"
echo "VERSION=$VERSION"

if [ ! "$IS_NEW_RELEASE" = "true" ]
then
	echo "Skipping maven deploy"
	exit 0
fi

if [ ! "$IS_NEW_RELEASE" == "true" ]
then
	echo "Skipping maven deploy2"
	exit 0
fi

# Verify settings
if [ ! -z "$MAVEN_SETTINGS_FILE" ]
then
	MAVEN_SETTINGS_FILE="--settings $MAVEN_SETTINGS_FILE"
fi

if [ ! -z "$DPGP_PASSPHRASE" ]
then
	DPGP_PASSPHRASE="-Dgpg.passphrase=$DPGP_PASSPHRASE"
fi

# Add maven to PATH
export PATH=$PATH:/usr/local/maven/bin

# CD to build dir
cd $BUILD_DIR

# Sign and deploy
mvn $MAVEN_SETTINGS_FILE jar:jar gpg:sign-and-deploy-file \
-Durl=$MAVEN_REPO_URL \
-DrepositoryId=$MAVEN_REPO_ID \
-Dfile=target/$ARTIFACT_NAME-$VERSION.jar \
-DpomFile=pom.xml \
-Djavadoc=target/$ARTIFACT_NAME-$VERSION-javadoc.jar \
-Dsources=target/$ARTIFACT_NAME-$VERSION-sources.jar \
$DPGP_PASSPHRASE