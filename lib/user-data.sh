#!/bin/bash -xe
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

# Install docker
sudo yum update -y
sudo amazon-linux-extras install docker
sudo service docker start
sudo usermod -aG docker ec2-user

# Add some startup files
cat <<EOT >> /etc/systemd/system/docker_terraria.service
[Unit]
After=docker.service
Description=Start terraria in docker

[Service]
User=ec2-user
ExecStart=/home/ec2-user/start-terraria.sh

[Install]
WantedBy=multi-user.target
EOT

cat <<EOT >> /home/ec2-user/start-terraria.sh
#!/bin/bash
docker run --rm --name="terraria" -p 7777:7777 -v $HOME/terraria/world:/root/.local/share/Terraria/Worlds ryshe/terraria:latest -world /root/.local/share/Terraria/Worlds/world.wld --log-opt max-size=200m -disable-commands
EOT

cat <<EOT >> /home/ec2-user/backup-terraria.sh
#!/bin/bash

# Get the bucket name so we can backup the world
TAG_NAME="Name"
INSTANCE_ID="`wget -qO- http://instance-data/latest/meta-data/instance-id`"
REGION="`wget -qO- http://instance-data/latest/meta-data/placement/availability-zone | sed -e 's:\([0-9][0-9]*\)[a-z]*\$:\\1:'`"
s3BucketName="`aws ec2 describe-tags --filters "Name=resource-id,Values=$INSTANCE_ID" "Name=key,Values=$TAG_NAME" --region $REGION --output=text | cut -f5`"

aws s3 cp $HOME/terraria/world "s3://$s3BucketName" --recursive
EOT

# Adds a server backup every 10 min
(crontab -l ; echo "*/10 * * * * /home/ec2-user/backup-terraria.sh") | crontab -

sudo chmod +x /home/ec2-user/start-terraria.sh
sudo chmod +x /home/ec2-user/backup-terraria.sh

# Start docker every time the server starts
sudo systemctl enable docker
sudo systemctl enable docker_terraria.service

mkdir -p $HOME/terraria/world

echo "Trying to copy down world files, if they exist"

# Get the bucket name so we can get the world
TAG_NAME="Name"
INSTANCE_ID="`wget -qO- http://instance-data/latest/meta-data/instance-id`"
REGION="`wget -qO- http://instance-data/latest/meta-data/placement/availability-zone | sed -e 's:\([0-9][0-9]*\)[a-z]*\$:\\1:'`"
s3BucketName="`aws ec2 describe-tags --filters "Name=resource-id,Values=$INSTANCE_ID" "Name=key,Values=$TAG_NAME" --region $REGION --output=text | cut -f5`"

aws s3 cp "s3://$s3BucketName" $HOME/terraria/world --recursive

FILE=$HOME/terraria/world/world.wld
if [[ -f "$FILE" ]]; then
  echo "World file exists. Will use it."
  docker run --rm --name="terraria" -p 7777:7777 -v $HOME/terraria/world:/root/.local/share/Terraria/Worlds ryshe/terraria:latest -world /root/.local/share/Terraria/Worlds/world.wld --log-opt max-size=200m -disable-commands
else
  echo "World file does not exist. Creating new world"
  echo "Note: autocreate number is size of world, 1=small, 2=med, 3=large. Using 3 by default"
  size=3
  docker run --rm --name="terraria" -p 7777:7777 -v $HOME/terraria/world:/root/.local/share/Terraria/Worlds ryshe/terraria:latest -world /root/.local/share/Terraria/Worlds/world.wld --log-opt max-size=200m -disable-commands -autocreate "$size"
fi

