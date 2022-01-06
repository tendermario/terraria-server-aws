#!/bin/bash -xe
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

# Install docker
sudo yum update -y
sudo amazon-linux-extras install docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Add some startup files
cat <<EOT >> /etc/systemd/system/docker_terraria.service
[Unit]
After=docker.service
Description=Docker compose

[Service]
ExecStart=/home/ec2-user/start-terraria.sh

[Install]
WantedBy=multi-user.target
EOT

cat <<EOT >> /home/ec2-user/start-terraria.sh
#!/bin/bash
sudo docker run --rm --name="terraria" -p 7777:7777 -v $HOME/terraria/world:/root/.local/share/Terraria/Worlds ryshe/terraria:latest -world /root/.local/share/Terraria/Worlds/world1.wld --log-opt max-size=200m -disable-commands
EOT

sudo chmod +x /home/ec2-user/start-terraria.sh

# Start docker every time the server starts
sudo systemctl enable docker
sudo systemctl enable docker_terraria.service

# Install and run Terraria, creating a large world by default
mkdir -p $HOME/terraria/world
sudo docker run --name="terraria" -p 7777:7777 --rm -v $HOME/terraria/world:/root/.local/share/Terraria/Worlds ryshe/terraria:latest -world /root/.local/share/Terraria/Worlds/world1.wld -autocreate 3 --log-opt max-size=200m -disable-commands
