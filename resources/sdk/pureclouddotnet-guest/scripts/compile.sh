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
mono $COMMON_DIR/resources/sdk/pureclouddotnet-guest/bin/nuget.exe install $BUILD_DIR/src/$ROOT_NAMESPACE/packages.config -o $BUILD_DIR/packages -NoCache -Verbosity detailed;

mkdir -p $BUILD_DIR/bin;

cp $BUILD_DIR/packages/Newtonsoft.Json.11.0.2/lib/net45/Newtonsoft.Json.dll $BUILD_DIR/bin/Newtonsoft.Json.dll;
cp $BUILD_DIR/packages/RestSharp.110.2.0/lib/net471/RestSharp.dll $BUILD_DIR/bin/RestSharp.dll;

echo "Compiling SDK..."
mcs -r:$BUILD_DIR/bin/Newtonsoft.Json.dll,\
$BUILD_DIR/bin/RestSharp.dll,\
System.Runtime.Serialization.dll \
-target:library \
-out:$BUILD_DIR/bin/${ROOT_NAMESPACE}.dll \
-doc:$BUILD_DIR/bin/${ROOT_NAMESPACE}.xml \
-recurse:'src/'${ROOT_NAMESPACE}'/*.cs' \
-platform:anycpu
