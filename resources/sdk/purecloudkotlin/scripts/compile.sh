BUILD_MODE=$1 # package/verify/deploy/deploy:deploy
BUILD_DIR=$2
MAVEN_SETTINGS_FILE=$3
DPGP_PASSPHRASE=$4
IS_NEW_RELEASE=$5

echo "BUILD_MODE=$BUILD_MODE"
echo "BUILD_DIR=$BUILD_DIR"
echo "MAVEN_SETTINGS_FILE=$MAVEN_SETTINGS_FILE"
echo "IS_NEW_RELEASE=$IS_NEW_RELEASE"

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

# Add maven to PATH
export PATH=$PATH:/usr/local/maven/bin

# CD to build dir
cd $BUILD_DIR

find . -name "DivsPermittedEntityListing.kt" | xargs sed -i -e "s/override var allDivsPermitted/var allDivsPermitted/g"
# Kotlin generates JVM bytecode for getters + setters of public properties, this causes a clash with another method named "isPaid" in this class
# The solution here makes the property private and implements our own getter + setter
find . -name "WfmAgentScheduleUpdateTopicWfmFullDayTimeOffMarker.kt" \
	| xargs sed -i -e "s/@get:ApiModelProperty(example = \"null\", value = \"isPaid\")/@ApiModelProperty(example = \"null\", value = \"\")/g"
find . -name "WfmAgentScheduleUpdateTopicWfmFullDayTimeOffMarker.kt" \
	| xargs sed -i -e $'s/var isPaid: Boolean? = null/private var isPaid: Boolean? = null \
fun getIsPaid(): Boolean? { \
  return isPaid \
} \
fun setIsPaid(isPaid: Boolean?) { \
  this.isPaid = isPaid \
}/g'

# Build
mvn $MAVEN_SETTINGS_FILE $BUILD_MODE $DPGP_PASSPHRASE