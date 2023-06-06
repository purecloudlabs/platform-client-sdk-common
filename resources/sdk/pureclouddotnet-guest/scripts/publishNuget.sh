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

# CD to build dir
cd $BUILD_DIR

# Write nuspec file
echo '<?xml version="1.0" encoding="utf-8"?>'\
'<package xmlns="http://schemas.microsoft.com/packaging/2010/07/nuspec.xsd">'\
'	<metadata>'\
"		<id>$NAMESPACE</id>"\
'		<title>PureCloud Platform Guest Chat SDK</title>'\
'		<summary>A .NET library to interface with the PureCloud Platform API Guest Chat APIs</summary>'\
'		<projectUrl>https://github.com/MyPureCloud/platform-client-sdk-dotnet-guest</projectUrl>'\
'		<copyright>Copyright © Genesys 2020</copyright>'\
'		<licenseUrl>https://github.com/MyPureCloud/platform-client-sdk-dotnet-guest/blob/master/LICENSE</licenseUrl>'\
'		<iconUrl>https://raw.githubusercontent.com/MyPureCloud/platform-client-sdk-dotnet-guest/master/ininlogo64.png</iconUrl>'\
'		<tags>genesys purecloud pure cloud public platform api chat guest sdk</tags>'\
'		<language>en-us</language>'\
"		<version>$VERSION</version>"\
'		<authors>Genesys Developer Evangelists</authors>'\
'		<requireLicenseAcceptance>false</requireLicenseAcceptance>'\
'		<description>A .NET library to interface with the PureCloud Platform API Guest Chat API</description>'\
'		<dependencies>'\
'			<dependency id="Newtonsoft.Json" version="11.0.2" />'\
'			<dependency id="RestSharp" version="110.2.0" />'\
'		</dependencies>'\
'	</metadata>'\
'	<files>'\
"		<file src=\"$NAMESPACE.dll\" target=\"lib/netstandard2.0/$NAMESPACE.dll\" />"\
"		<file src=\"$NAMESPACE.xml\" target=\"lib/netstandard2.0/$NAMESPACE.xml\" />"\
'	</files>'\
'</package>' > $BUILD_DIR/bin/$NAMESPACE.nuspec

# Pack nuspec
mono $COMMON_DIR/resources/sdk/pureclouddotnet-guest/bin/nuget.exe pack \
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
mono $COMMON_DIR/resources/sdk/pureclouddotnet-guest/bin/nuget.exe push \
$NAMESPACE.$VERSION.repack.nupkg \
$NUGET_API_KEY \
-source $NUGET_SOURCE \
-Verbosity detailed \
-Timeout 900
