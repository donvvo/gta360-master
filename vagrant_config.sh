apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 0C49F3730359A14518585931BC711F9BA15703C6
echo "deb [ arch=amd64,arm64 ] http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.4.list

apt-get -qqy update
apt-get install -y mongodb-org

apt-get -qqy install graphicsmagick

curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.5/install.sh | bash

nvm install v6.10.2

mkdir ~/.aws
echo -e "[default]\naws_access_key_id = AKIAJEN2GUL2VFD6J44Q\naws_secret_access_key = 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" >> ~/.aws/credentials
