BUILD_DIR=$1
COMMON_DIR=$2
ROOT_NAMESPACE=$3

echo "BUILD_DIR=$BUILD_DIR"
echo "COMMON_DIR=$COMMON_DIR"
echo "ROOT_NAMESPACE=$ROOT_NAMESPACE"

# CD to build dir
cd $BUILD_DIR

# Import certs
if test -f "/etc/pki/tls/certs/ca-bundle.crt"; then
	echo "Using cert-sync"
	cert-sync /etc/pki/tls/certs/ca-bundle.crt
else
	echo "Using mozroots"
	mozroots --import --sync
fi


# Install packages
echo "Installing packages"
mono $COMMON_DIR/resources/sdk/pureclouddotnet/bin/nuget.exe install $BUILD_DIR/src/$ROOT_NAMESPACE/packages.config -o $BUILD_DIR/packages -NoCache -Verbosity detailed;
mono $COMMON_DIR/resources/sdk/pureclouddotnet/bin/nuget.exe install $BUILD_DIR/src/$ROOT_NAMESPACE.Tests/packages.config -o $BUILD_DIR/packages -NoCache -Verbosity detailed;

mkdir -p $BUILD_DIR/bin;

cp $BUILD_DIR/packages/Newtonsoft.Json.11.0.2/lib/net45/Newtonsoft.Json.dll $BUILD_DIR/bin/Newtonsoft.Json.dll;
cp $BUILD_DIR/packages/RestSharp.106.3.1/lib/net452/RestSharp.dll $BUILD_DIR/bin/RestSharp.dll;
cp $BUILD_DIR/packages/WebSocketSharp.1.0.3-rc11/lib/websocket-sharp.dll $BUILD_DIR/bin/websocket-sharp.dll;
cp $BUILD_DIR/packages/NUnit.3.10.1/lib/net45/nunit.framework.dll $BUILD_DIR/bin/nunit.framework.dll;
cp $BUILD_DIR/packages/Moq.4.5.3/lib/net45/Moq.dll $BUILD_DIR/bin/Moq.dll;
cp $BUILD_DIR/packages/ini-parser.3.4.0/lib/net20/INIFileParser.dll $BUILD_DIR/bin/INIFileParser.dll;

echo "Compiling SDK..."
mcs -r:$BUILD_DIR/bin/Newtonsoft.Json.dll,\
$BUILD_DIR/bin/RestSharp.dll,\
$BUILD_DIR/bin/websocket-sharp.dll,\
$BUILD_DIR/bin/INIFileParser.dll,\
System.Runtime.Serialization.dll \
-target:library \
-out:$BUILD_DIR/bin/${ROOT_NAMESPACE}.dll \
-doc:$BUILD_DIR/bin/${ROOT_NAMESPACE}.xml \
-recurse:'src/'${ROOT_NAMESPACE}'/*.cs' \
-platform:anycpu

echo "Compiling tests..."
mcs -r:$BUILD_DIR/bin/Newtonsoft.Json.dll,\
$BUILD_DIR/bin/RestSharp.dll,\
$BUILD_DIR/bin/websocket-sharp.dll,\
$BUILD_DIR/bin/INIFileParser.dll,\
System.Runtime.Serialization.dll,\
$BUILD_DIR/bin/${ROOT_NAMESPACE}.dll,\
$BUILD_DIR/bin/nunit.framework.dll,\
$BUILD_DIR/bin/Moq.dll \
-target:library \
-out:$BUILD_DIR/bin/${ROOT_NAMESPACE}.Tests.dll \
-recurse:'src/'${ROOT_NAMESPACE}.Tests'/*.cs' \
-platform:anycpu

echo "Running tests..."
mono $COMMON_DIR/resources/sdk/pureclouddotnet/bin/nunit/nunit3-console.exe $BUILD_DIR/bin/${ROOT_NAMESPACE}.Tests.dll

