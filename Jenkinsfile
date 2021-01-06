@Library(value='pipeline-library@master', changelog=false)
import com.genesys.jenkins.Service
 
final serviceBuild = new Service()

pipeline {

    agent any

    tools {
        maven 'Maven 3.5.3'
        jdk 'OpenJDK 1.8.0 (latest)'
    }

    environment {
        NODE_VERSION = '11.15.0'
        SNYK_TOKEN = credentials("PureCloudSnykToken")
    }

    stages {
        stage("pre-build") {
            steps {
                copyArtifacts(projectName: 'build-github-swagger-codegen-sdkv1', filter: 'modules/swagger-codegen-cli/target/swagger-codegen-cli.jar', target: 'swagger-codegen', fingerprintArtifacts: true);

                checkout scm

                dir('platform-client-sdk-internal-config') {
                    git url: "${scm.getUserRemoteConfigs()[1].getUrl()}"
                }
            }
        }

        stage("build") {
            steps {
                sh '''
                    cd $WORKSPACE

                    # Install NVM
                    echo "About to run nvm.sh"
                    source $HOME/.nvm/nvm.sh

                    echo "nvm version: $(nvm --version)"

                    echo "Installing node version $NODE_VERSION"

                    nvm install $NODE_VERSION
                    nvm use $NODE_VERSION

                    npm install
                    npm i -g snyk

                    # Build SDKs
                    if [ "$BUILD_SDK_JAVA" = true ] ; then
                        echo "Building Java SDK"
                        export BUILT_SDKS="Java"
                        node sdkBuilder.js \
                        --config $WORKSPACE/resources/sdk/purecloudjava/config.json \
                        --localconfig $WORKSPACE/platform-client-sdk-internal-config/prod/java/prodConfig.yml
                    else
                        echo "Skipping Java SDK"
                    fi

                    if [ "$BUILD_SDK_DOTNET" = true ] ; then
                        echo "Building .NET SDK"
                        export BUILT_SDKS="$BUILT_SDKS, .NET"
                        node sdkBuilder.js \
                        --config $WORKSPACE/resources/sdk/pureclouddotnet/config.json \
                        --localconfig $WORKSPACE/platform-client-sdk-internal-config/prod/dotnet/prodConfig.yml
                    else
                        echo "Skipping .NET SDK"
                    fi

                    if [ "$BUILD_SDK_PYTHON" = true ] ; then
                        echo "Building Python SDK"
                        export BUILT_SDKS="$BUILT_SDKS, Python"
                        node sdkBuilder.js \
                        --config $WORKSPACE/resources/sdk/purecloudpython/config.json \
                        --localconfig $WORKSPACE/platform-client-sdk-internal-config/prod/python/prodConfig.yml
                    else
                        echo "Skipping Python SDK"
                    fi

                    if [ "$BUILD_SDK_JAVASCRIPT" = true ] ; then
                        echo "Building JavaScript SDK"
                        export BUILT_SDKS="$BUILT_SDKS, JavaScript"
                        node sdkBuilder.js \
                        --config $WORKSPACE/resources/sdk/purecloudjavascript/config.json \
                        --localconfig $WORKSPACE/platform-client-sdk-internal-config/prod/javascript/prodConfig.yml
                    else
                        echo "Skipping JavaScript SDK"
                    fi

                    if [ "$BUILD_SDK_IOS" = true ] ; then
                        echo "Building iOS SDK"
                        export BUILT_SDKS="$BUILT_SDKS, iOS"
                        node sdkBuilder.js \
                        --config $WORKSPACE/resources/sdk/purecloudios/config.json \
                        --localconfig $WORKSPACE/platform-client-sdk-internal-config/prod/ios/prodConfig.yml
                    else
                        echo "Skipping iOS SDK"
                    fi

                    if [ "$BUILD_GUEST_CHAT_SDK_JAVA" = true ] ; then
                        echo "Building Guest Chat Java SDK"
                        export BUILT_SDKS="$BUILT_SDKS, Java-guest"
                        node sdkBuilder.js \
                        --config $WORKSPACE/resources/sdk/purecloudjava-guest/config.json \
                        --localconfig $WORKSPACE/platform-client-sdk-internal-config/prod/java-guest/prodConfig.yml
                    else
                        echo "Skipping Guest Chat Java SDK"
                    fi

                    if [ "$BUILD_GUEST_CHAT_SDK_JAVASCRIPT" = true ] ; then
                        echo "Building Guest Chat JavaScript SDK"
                        export BUILT_SDKS="$BUILT_SDKS, JavaScript-guest"
                        node sdkBuilder.js \
                        --config $WORKSPACE/resources/sdk/purecloudjavascript-guest/config.json \
                        --localconfig $WORKSPACE/platform-client-sdk-internal-config/prod/javascript-guest/prodConfig.yml
                    else
                        echo "Skipping Guest Chat JavaScript SDK"
                    fi

                    if [ "$BUILD_SDK_GO" = true ] ; then
                        echo "Building GO SDK"
                        export BUILT_SDKS="$BUILT_SDKS, GO"
                        node sdkBuilder.js \
                        --config $WORKSPACE/resources/sdk/purecloudgo/config.json \
                        --localconfig $WORKSPACE/platform-client-sdk-internal-config/prod/go/prodConfig.yml
                    else
                        echo "Skipping Go SDK"
                    fi

                    echo "[BUILT SDK LANGUAGES] Languages: $BUILT_SDKS"
                    echo "BUILT_SDKS=$BUILT_SDKS" > ${WORKSPACE}/build.properties

                    if [ -d "$WORKSPACE/output" ]; then
                        cd $WORKSPACE/output

                        snyk auth $SNYK_TOKEN

                        snyk test --all-projects --detection-depth=6 --print-deps || true

                        echo "Snyk scan finished"
                    else
                        echo "No SDK was built. Skip Snyk."
                    fi
                '''
            }
        }
    }
}