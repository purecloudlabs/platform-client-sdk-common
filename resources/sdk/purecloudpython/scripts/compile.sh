SDK_REPO=$1
BUILD_DIR=$2
RESOURCE_DIR=$3

echo "SDK_REPO=$SDK_REPO"
echo "BUILD_DIR=$BUILD_DIR"
echo "RESOURCE_DIR=$RESOURCE_DIR"

# Copy license
cp $SDK_REPO/LICENSE $BUILD_DIR/License.txt

# Copy python config file
cp $RESOURCE_DIR/scripts/setup.cfg $BUILD_DIR/setup.cfg

# Compile module
cd $BUILD_DIR
python setup.py build