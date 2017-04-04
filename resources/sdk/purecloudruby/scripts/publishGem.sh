BUILD_DIR=$1
GEM_NAME=$2
GEM_KEY=$3
IS_NEW_RELEASE=$4
VERSION=$5

echo "BUILD_DIR=$BUILD_DIR"
echo "GEM_NAME=$GEM_NAME"
echo "IS_NEW_RELEASE=$IS_NEW_RELEASE"
echo "VERSION=$VERSION"

# Why?
#export PATH=$PATH:/home/jenkins/bin

GEM_CREDENTIALS_FILE=~/.gem/credentials
GEM_KEY_NAME="developer_evangelists"

cd $BUILD_DIR

echo "require 'rubygems'
require 'gems'
task :release do
    Gems.configure do |config|
      config.key = ENV['GEM_KEY']
    end

    puts Gems.push File.new \"$GEM_NAME-$VERSION.gem\"
end" > rakefile

echo "source 'https://rubygems.org'
gem 'gems'" > Gemfile

bundle install

rake release