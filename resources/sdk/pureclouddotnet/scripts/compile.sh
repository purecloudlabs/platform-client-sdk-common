BUILD_DIR=$1
COMMON_DIR=$2
ROOT_NAMESPACE=$3

echo "BUILD_DIR=$BUILD_DIR"
echo "COMMON_DIR=$COMMON_DIR"
echo "ROOT_NAMESPACE=$ROOT_NAMESPACE"

# CD to build dir
cd $BUILD_DIR

frameworkVersion=net45
netfx=${frameworkVersion#net}

mozroots --import --sync
mono $COMMON_DIR/resources/sdk/pureclouddotnet/bin/nuget.exe install $BUILD_DIR/src/$ROOT_NAMESPACE/packages.config -o $BUILD_DIR/packages -NoCache -Verbosity detailed;
mkdir -p $BUILD_DIR/bin;

cp $BUILD_DIR/packages/Newtonsoft.Json.9.0.1/lib/net45/Newtonsoft.Json.dll $BUILD_DIR/bin/Newtonsoft.Json.dll;
cp $BUILD_DIR/packages/RestSharp.105.2.3/lib/net45/RestSharp.dll $BUILD_DIR/bin/RestSharp.dll;
cp $BUILD_DIR/packages/WebSocketSharp.1.0.3-rc11/lib/websocket-sharp.dll $BUILD_DIR/bin/websocket-sharp.dll;

mcs -sdk:${netfx} -r:$BUILD_DIR/bin/Newtonsoft.Json.dll,\
$BUILD_DIR/bin/RestSharp.dll,\
$BUILD_DIR/bin/websocket-sharp.dll,\
System.Runtime.Serialization.dll \
-target:library \
-out:$BUILD_DIR/bin/${ROOT_NAMESPACE}.dll \
-doc:$BUILD_DIR/bin/${ROOT_NAMESPACE}.xml \
-recurse:'src/'${ROOT_NAMESPACE}'/*.cs' \
-platform:anycpu