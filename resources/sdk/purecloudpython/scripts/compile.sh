SDK_REPO=$1
BUILD_DIR=$2
TESTS_DIR=$3

echo "SDK_REPO=$SDK_REPO"
echo "BUILD_DIR=$BUILD_DIR"
echo "TESTS_DIR=$TESTS_DIR"

# Copy license
cp $SDK_REPO/LICENSE $BUILD_DIR/License.txt

# Copy python config file
cp $TESTS_DIR/setup.cfg $BUILD_DIR/setup.cfg

# Compile module
cd $BUILD_DIR
python3.9 -m pip install --user -U urllib3==1.26.20
python3.9 setup.py build

# Run tests
echo "Running tests"
cd "$TESTS_DIR"
echo "Install requests..."
python3.9 -m pip install --user -U requests
echo "Install watchdog..."
python3.9 -m pip install --user -U watchdog
echo "Install retry..."
python3.9 -m pip install --user -U retry
echo "Run unit tests -> SdkTests"
python3.9 -m unittest SdkTests
echo "Run unit tests mtls"
python3.9 -m unittest SdkTests_mtls
echo "Run unit tests proxy"
python3.9 -m unittest SdkTests_proxy
