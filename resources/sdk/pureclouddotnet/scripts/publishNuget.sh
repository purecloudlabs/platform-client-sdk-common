BUILD_DIR=$1
COMMON_DIR=$2
NAMESPACE=$3
NUGET_API_KEY=$4
NUGET_SOURCE=$5
IS_NEW_RELEASE=$6
VERSION=$7

echo "BUILD_DIR=$BUILD_DIR"
echo "COMMON_DIR=$COMMON_DIR"
echo "NAMESPACE=$NAMESPACE"
echo "NUGET_SOURCE=$NUGET_SOURCE"
echo "IS_NEW_RELEASE=$IS_NEW_RELEASE"
echo "VERSION=$VERSION"

if [ ! "$IS_NEW_RELEASE" = "true" ]
then
	echo "Skipping nuget publish"
	exit 0
fi

# Determine authentication method
# For JFrog: Use JFROG_USR:JFROG_PSW from environment if available and source is JFrog
# For NuGet.org: Use NUGET_API_KEY as-is
if [ -n "$JFROG_USR" ] && [ -n "$JFROG_PSW" ] && [[ "$NUGET_SOURCE" == *"jfrog"* ]]; then
    echo "Using JFrog credentials from environment variables"
    AUTH_KEY="$JFROG_USR:$JFROG_PSW"
else
    echo "Using NuGet API key"
    AUTH_KEY="$NUGET_API_KEY"
fi

# CD to build dir
cd $BUILD_DIR

# Write nuspec file
echo '<?xml version="1.0" encoding="utf-8"?>'\
'<package xmlns="http://schemas.microsoft.com/packaging/2010/07/nuspec.xsd">'\
'	<metadata>'\
"		<id>$NAMESPACE</id>"\
'		<title>PureCloud Platform Client</title>'\
'		<summary>A .NET library to interface with the PureCloud Public API</summary>'\
'		<projectUrl>https://github.com/MyPureCloud/platform-client-sdk-dotnet</projectUrl>'\
'		<copyright>Copyright © Genesys 2022</copyright>'\
'		<licenseUrl>https://github.com/MyPureCloud/platform-client-sdk-dotnet/blob/master/LICENSE</licenseUrl>'\
'		<iconUrl>https://raw.githubusercontent.com/MyPureCloud/platform-client-sdk-dotnet/master/ininlogo64.png</iconUrl>'\
'		<tags>genesys purecloud pure cloud public platform api sdk</tags>'\
'		<language>en-us</language>'\
"		<version>$VERSION</version>"\
'		<authors>Genesys Developer Evangelists</authors>'\
'		<requireLicenseAcceptance>false</requireLicenseAcceptance>'\
'		<description>A .NET library to interface with the PureCloud Public API</description>'\
'		<dependencies>'\
'		<group targetFramework=".NETStandard2.0">'\
'			<dependency id="Newtonsoft.Json" version="13.0.3" />'\
'			<dependency id="RestSharp" version="112.0.0" />'\
'			<dependency id="System.Text.Json" version="8.0.5" />'\
'			<dependency id="System.Text.Encodings.Web" version="8.0.0" />'\
'			<dependency id="System.Threading.Tasks.Extensions" version="4.5.4" />'\
'			<dependency id="System.Runtime.CompilerServices.Unsafe" version="6.0.0" />'\
'		</group>'\
'		<group targetFramework=".NETFramework4.7.1">'\
'			<dependency id="Newtonsoft.Json" version="13.0.3" />'\
'			<dependency id="RestSharp" version="112.0.0" />'\
'			<dependency id="System.Text.Json" version="8.0.5" />'\
'			<dependency id="System.Text.Encodings.Web" version="8.0.0" />'\
'			<dependency id="System.Threading.Tasks.Extensions" version="4.5.4" />'\
'			<dependency id="System.Runtime.CompilerServices.Unsafe" version="6.0.0" />'\
'		</group>'\
'		</dependencies>'\
'	</metadata>'\
'	<files>'\
"		<file src=\"netstandard2.0/$NAMESPACE.dll\" target=\"lib/netstandard2.0/$NAMESPACE.dll\" />"\
"		<file src=\"netstandard2.0/$NAMESPACE.xml\" target=\"lib/netstandard2.0/$NAMESPACE.xml\" />"\
"		<file src=\"net4.7.1/$NAMESPACE.dll\" target=\"lib/net471/$NAMESPACE.dll\" />"\
"		<file src=\"net4.7.1/$NAMESPACE.xml\" target=\"lib/net471/$NAMESPACE.xml\" />"\
'	</files>'\
'</package>' > $BUILD_DIR/bin/$NAMESPACE.nuspec

# Pack nuspec
mono $COMMON_DIR/resources/sdk/pureclouddotnet/bin/nuget.exe pack \
$BUILD_DIR/bin/$NAMESPACE.nuspec \
-Verbosity detailed

# --WORKAROUND--
# There is an issue with mono/nuget and the nupkg file. Probably this: https://github.com/NuGet/Home/issues/2833
# This workaround simply unzips the nupkg file and rezips it. I think this makes it use '/' instead of '\'.
mkdir package
unzip $NAMESPACE.$VERSION.nupkg -d package
cd package
zip -r $NAMESPACE.$VERSION.repack.nupkg *
cd $BUILD_DIR
cp package/$NAMESPACE.$VERSION.repack.nupkg $NAMESPACE.$VERSION.repack.nupkg

# Publish to nuget
mono $COMMON_DIR/resources/sdk/pureclouddotnet/bin/nuget.exe push \
$NAMESPACE.$VERSION.repack.nupkg \
$AUTH_KEY \
-source $NUGET_SOURCE \
-Verbosity detailed \
-Timeout 900
