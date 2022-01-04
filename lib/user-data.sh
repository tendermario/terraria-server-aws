#!/bin/bash -xe
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
    sudo yum update -y
    sudo amazon-linux-extras install docker
    sudo service docker start
    sudo usermod -a -G docker ec2-user

    mkdir -p $HOME/terraria/world
    sudo docker run -p 7777:7777 --rm -v $HOME/terraria/world:/root/.local/share/Terraria/Worlds ryshe/terraria:latest -world /root/.local/share/Terraria/Worlds/world1.wld -autocreate 3 --log-opt max-size=200m -disable-commands