TMP_LOGS=$1
SDK_TEMP=$2

echo "TMP_LOGS=$TMP_LOGS"
echo "SDK_TEMP=$SDK_TEMP"

# gc will generate markdown docs when this flag is set
export GenerateGcDocs="true"
CONFIG_FILE_DIR=$HOME/.gc
CONFIG_FILE_PATH=$CONFIG_FILE_DIR/config.toml
if [ ! -f $CONFIG_FILE_PATH ]; then
    mkdir $CONFIG_FILE_DIR
    touch $CONFIG_FILE_PATH
fi

if [ $(uname) = "Darwin" ]; then
    GC="gc"
else
    GC="gc_linux_amd64"
fi

bin/$GC &> /dev/null
sleep 1

cd $SDK_TEMP
unzip docs.zip
cp $TMP_LOGS/*.md .
zip -r docs.zip *.md
rm *.md
