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
mono --version
echo "mono version"
mono $COMMON_DIR/resources/sdk/pureclouddotnet/bin/nuget.exe install $BUILD_DIR/src/$ROOT_NAMESPACE/packages.config -o $BUILD_DIR/packages -NoCache -Verbosity detailed;
mono $COMMON_DIR/resources/sdk/pureclouddotnet/bin/nuget.exe install $BUILD_DIR/src/$ROOT_NAMESPACE.Tests/packages.config -o $BUILD_DIR/packages -NoCache -Verbosity detailed;

mkdir -p $BUILD_DIR/bin/netstandard2.0;

cp $BUILD_DIR/packages/Newtonsoft.Json.13.0.3/lib/net45/Newtonsoft.Json.dll $BUILD_DIR/bin/Newtonsoft.Json.dll;
cp $BUILD_DIR/packages/RestSharp.110.2.0/lib/net471/RestSharp.dll $BUILD_DIR/bin/RestSharp.dll;
cp $BUILD_DIR/packages/WebSocketSharp.1.0.3-rc11/lib/websocket-sharp.dll $BUILD_DIR/bin/websocket-sharp.dll;
cp $BUILD_DIR/packages/NUnit.3.10.1/lib/net45/nunit.framework.dll $BUILD_DIR/bin/nunit.framework.dll;
cp $BUILD_DIR/packages/Moq.4.5.3/lib/net45/Moq.dll $BUILD_DIR/bin/Moq.dll;
cp $BUILD_DIR/packages/ini-parser.2.5.2/lib/net20/INIFileParser.dll $BUILD_DIR/bin/INIFileParser.dll;
cp $BUILD_DIR/packages/RichardSzalay.MockHttp.6.0.0/lib/net45/RichardSzalay.MockHttp.dll $BUILD_DIR/bin/RichardSzalay.MockHttp.dll;
cp $BUILD_DIR/packages/System.Text.Json.7.0.2/lib/net462/System.Text.Json.dll $BUILD_DIR/bin/System.Text.Json.dll;
cp $BUILD_DIR/packages/System.Text.Encodings.Web.7.0.0/lib/net462/System.Text.Encodings.Web.dll $BUILD_DIR/bin/System.Text.Encodings.Web.dll;
cp $BUILD_DIR/packages/System.Threading.Tasks.Extensions.4.5.4/lib/net461/System.Threading.Tasks.Extensions.dll $BUILD_DIR/bin/System.Threading.Tasks.Extensions.dll;


echo "Compiling SDK..."
echo "Target: netstandard2.0"
mcs -r:$BUILD_DIR/bin/Newtonsoft.Json.dll,\
$BUILD_DIR/bin/RestSharp.dll,\
$BUILD_DIR/bin/websocket-sharp.dll,\
$BUILD_DIR/bin/INIFileParser.dll,\
System.Net.Http.dll,\
$BUILD_DIR/bin/System.Text.Json.dll,\
$BUILD_DIR/bin/System.Text.Encodings.Web.dll,\
$BUILD_DIR/bin/System.Threading.Tasks.Extensions.dll,\
System.Runtime.Serialization.dll \
-target:library \
-out:$BUILD_DIR/bin/netstandard2.0/${ROOT_NAMESPACE}.dll \
-doc:$BUILD_DIR/bin/netstandard2.0/${ROOT_NAMESPACE}.xml \
-recurse:'src/'${ROOT_NAMESPACE}'/*.cs' \
-platform:anycpu \

function compile_sdk() {
	echo "Target: .NET $1"
	rm -rf src/${ROOT_NAMESPACE}/obj
	rm -rf src/${ROOT_NAMESPACE}.Tests/obj
	mkdir -p $BUILD_DIR/bin/net$1
	xbuild /p:Configuration=Release \
		/p:TargetFrameworkVersion=v$1 \
		/p:OutputPath=$BUILD_DIR/bin/net$1 \
		/p:DocumentationFile=$BUILD_DIR/bin/net$1/${ROOT_NAMESPACE}.xml
}

compile_sdk "4.7.1"

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
mono $COMMON_DIR/resources/sdk/pureclouddotnet/bin/nunit/nunit3-console.exe $BUILD_DIR/bin/${ROOT_NAMESPACE}.Tests.dll
