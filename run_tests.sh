set -e

while true; do 
    mono resources/sdk/pureclouddotnet/bin/nunit/nunit3-console.exe output/pureclouddotnet/build/bin/PureCloudPlatform.Client.V2.Tests.dll
done