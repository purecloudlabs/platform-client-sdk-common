BUILD_DIR=$1
DPGP_PASSPHRASE=$2
DPGP_KEY_ID=$3
IS_NEW_RELEASE=$4

echo "BUILD_DIR=$BUILD_DIR"
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

# CD to build dir
cd $BUILD_DIR

find . -name "DivsPermittedEntityListing.kt" | xargs sed -i -e "s/override var allDivsPermitted/var allDivsPermitted/g"
find . -name "LearningAssignmentUserListing.kt" | xargs sed -i -e "s/override var unfilteredTotal/var unfilteredTotal/g"
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

# Need to compile NotificationHandler.kt from the api module because there would be circular dependencies if it was compiled from the core module
# It will still appear in the com.mypurecloud.sdk.v2.extensions.notifications package
NEW_NOTIFICATIONS_DIRECTORY=api/src/main/kotlin/com/mypurecloud/sdk/v2/extensions/notifications
mkdir -p ${NEW_NOTIFICATIONS_DIRECTORY}
mv core/src/main/kotlin/com/mypurecloud/sdk/v2/extensions/notifications/NotificationHandler.kt ${NEW_NOTIFICATIONS_DIRECTORY}

echo "Running task: test"
./gradlew test
echo "Running task: build"
./gradlew build
