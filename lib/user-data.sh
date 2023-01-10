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

cat << "EOT" >> /home/ec2-user/start-terraria.sh
#!/bin/bash
docker pull ryshe/terraria:latest  # Every time we start the server, auto-get the latest terraria image.
docker run --rm --name="terraria" -p 7777:7777 -v $HOME/terraria/world:/root/.local/share/Terraria/Worlds ryshe/terraria:latest -world /root/.local/share/Terraria/Worlds/worldFileName --log-opt max-size=200m -disable-commands
EOT

cat << "EOT" >> /home/ec2-user/backup-terraria.sh
#!/bin/bash

# Get the bucket name so we can backup the world

aws s3 cp $HOME/terraria/world "s3://s3BucketName" --recursive
EOT

# Adds a server backup every 10 min
echo "*/10 * * * * /home/ec2-user/backup-terraria.sh > /home/ec2-user/cron.log" >> /var/spool/cron/ec2-user

HOME=/home/ec2-user

chmod +x $HOME/start-terraria.sh
chmod +x $HOME/backup-terraria.sh

# Start docker every time the server starts
systemctl enable docker
systemctl enable docker_terraria.service

# Load docker files for ec2-user
sudo -u ec2-user mkdir -p $HOME/terraria/world
chmod +rw $HOME/terraria
chmod +rw $HOME/terraria/world

echo "Trying to copy down world files, if they exist"

sudo -u ec2-user aws s3 cp "s3://s3BucketName" $HOME/terraria/world --recursive

FILE=$HOME/terraria/world/worldFileName
if [[ -f "$FILE" ]]; then
  echo "World file exists. Will use it."
  sudo -u ec2-user docker run --rm --name="terraria" -p 7777:7777 -v $HOME/terraria/world:/root/.local/share/Terraria/Worlds ryshe/terraria:latest -world /root/.local/share/Terraria/Worlds/worldFileName --log-opt max-size=200m -disable-commands
else
  echo "World file does not exist. Creating new world"
  echo "Note: autocreate number is size of world, 1=small, 2=med, 3=large. Using 3 by default"
  size=3
  sudo -u ec2-user docker run --rm --name="terraria" -p 7777:7777 -v $HOME/terraria/world:/root/.local/share/Terraria/Worlds ryshe/terraria:latest -world /root/.local/share/Terraria/Worlds/worldFileName --log-opt max-size=200m -disable-commands -autocreate "$size"
fi

