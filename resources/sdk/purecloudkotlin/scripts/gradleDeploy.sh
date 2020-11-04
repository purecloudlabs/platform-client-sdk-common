BUILD_DIR=$1
DPGP_PASSPHRASE=$2
DPGP_KEY_ID=$3
IS_NEW_RELEASE=$4

echo "BUILD_DIR=$BUILD_DIR"
echo "DPGP_PASSPHRASE=$DPGP_PASSPHRASE"
echo "DPGP_KEY_ID=$DPGP_KEY_ID"
echo "IS_NEW_RELEASE=$IS_NEW_RELEASE"

if [ ! -z "$DPGP_KEY_ID" ]
then
	DPGP_KEY_ID="-Psigning.keyId=$DPGP_KEY_ID"
fi

if [ ! -z "$DPGP_PASSPHRASE" ]
then
	DPGP_PASSPHRASE="-Psigning.password=$DPGP_PASSPHRASE"
fi

if [ ! "$IS_NEW_RELEASE" = "true" ]
then
	echo "Skipping maven deploy"
	exit 0
fi

# CD to build dir
cd $BUILD_DIR

# Can only deploy from a jenkins build
if [[ $HOME == *"jenkins"* ]]
then
	cat /var/build/gradle.properties >> gradle.properties
	GPG_FILE_PATH="$HOME/.gnupg/secring.gpg"
	./gradlew artifactoryPublish -Psigning.secretKeyRingFile=${GPG_FILE_PATH} ${DPGP_PASSPHRASE} ${DPGP_KEY_ID}
else
	echo "Deployment can only happen from Jenkins"
fi
