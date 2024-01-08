BUILD_DIR=/Users/dginty/genesys_src/repos/platform-client-sdk-common/output/pureclouddotnet/build
ROOT_NAMESPACE=PureCloudPlatform.Client.Internal.V2

echo "BUILD_DIR=$BUILD_DIR"

cp $BUILD_DIR/bin/netstandard2.0/${ROOT_NAMESPACE}.dll $BUILD_DIR/bin/${ROOT_NAMESPACE}.dll
echo "Compiling tests..."
mcs -r:$BUILD_DIR/bin/Newtonsoft.Json.dll,\
$BUILD_DIR/bin/RestSharp.dll,\
$BUILD_DIR/bin/websocket-sharp.dll,\
$BUILD_DIR/bin/INIFileParser.dll,\
System.Net.Http.dll,\
$BUILD_DIR/bin/System.Text.Json.dll,\
$BUILD_DIR/bin/System.Text.Encodings.Web.dll,\
$BUILD_DIR/bin/System.Threading.Tasks.Extensions.dll,\
System.Runtime.Serialization.dll,\
$BUILD_DIR/bin/${ROOT_NAMESPACE}.dll,\
$BUILD_DIR/bin/nunit.framework.dll,\
$BUILD_DIR/bin/RichardSzalay.MockHttp.dll,\
$BUILD_DIR/bin/Moq.dll \
-target:library \
-out:$BUILD_DIR/bin/${ROOT_NAMESPACE}.Tests.dll \
-recurse:'src/'${ROOT_NAMESPACE}.Tests'/*.cs' \
-platform:anycpu

echo "Running tests..."
mono /Users/dginty/genesys_src/repos/platform-client-sdk-common/resources/sdk/pureclouddotnet/bin/nunit/nunit3-console.exe $BUILD_DIR/bin/${ROOT_NAMESPACE}.Tests.dll