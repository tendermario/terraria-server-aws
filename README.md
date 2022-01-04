# Terraria Server CDK

This is a project for creating AWS resources to build up and run a Terraria server with CDK.

![Example](/images/terraria-frontend.png)

Example working server can be found here: https://tendermario.github.io/terraria-server-aws

## Technology

- GitHub pages
- Tailwind
- AWS cli
- AWS CDK
- AWS: EC2, API Gateway, Lambda
- Docker
- Terraria docker image. I'm using https://hub.docker.com/r/ryshe/terraria/ here but https://hub.docker.com/r/beardedio/terraria looks fine too.

## Infrastructure

- API Gateway endpoint to start up, shut down, and get status of EC2 instance
- A lambda that runs those above three actions
- EC2
- VPC and Elastic IP
- CloudWatch Alarms
- SNS Email topic

## Other features

- A frontend page to turn on/off your server

## Prereq

- aws-cli installed on your system (`sudo apt install awscli` in ubuntu)
- node, npm
- aws-cdk globally `npm install -g aws-cdk`
- with your aws credentials set up with `aws configure` (ref: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)
  - This sets up the files located in ~/.aws/config / credentials. If you get any of it wrong, you can change it there
  - Usually you should use the region closest to you
  - You should probably create a user in AWS IAM with enough privileges to create many resources... if you're lazy, you can set Admin privileges to a user and create the key pair under it.

## Setup

- Fork this repo

### Setup backend and CDK infrastructure

- Copy .env.example to a new file in the same location named .env - edit the contents to your own details
- Run `npm i` to install all the magic
- Run `cdk synth` to create the CloudFormation templates - these are the blueprints for your infrastructure
- Run `cdk deploy` to put them into your account
- Check the status in the AWS console under CloudFormation. If anything messes up, you can delete it there and try again.
  - This should create the infrastructure mentioned above.
  - If you're changing the cdk, use `cdk diff` to see what the changes are
  - Note: if you change the EC2 server, it will terminate the old one and spin up a new one. Be sure you back up your world first if need be!
- The above deploy should have an "Outputs" section that has a url like: `TerrariaServerStack.TerrariaServerApiEndpoint8D383585 = https://ky331xbqw4.execute-api.us-west-2.amazonaws.com/prod/` Note this url.

### Setup Frontend

- Set up GitHub pages so that you can find this page at yourusername.github.io/terraria-server-aws (or whatever your repo name is)
- Use the above url output and paste it in place of the varaiable of the first line in `index.js`. This updates the API Gateway endpoints to your own endpoints to call the server statuses.
- Feel free to play around with the styles to make it look better. It uses Tailwind for styles.

### Setup server

You should have a large server waiting to get logged into at your EC2 instance IP address, but you may also want to:

- Add a password and a ServerName to the config.json with `sudo vi ~/terraria/world/config.json`

## Manual setup tips

You don't need to do any of this, but it is a rough reference for how to set things up manually on a server:

### Set up terraria on an EC2 instance

#### Install docker:

Ref: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/docker-basics.html

```
sudo yum update -y
sudo amazon-linux-extras install docker
sudo service docker start
sudo usermod -a -G docker ec2-user
```

#### Option 1 - Build the terraria server:

Ref: https://hub.docker.com/r/ryshe/terraria/

Enter the ec2 console and run:

```
mkdir -p $HOME/terraria/world
sudo docker run -d --rm \
--name="terraria" \
-p 7777:7777 \
-v $HOME/terraria/world:/root/.local/share/Terraria/Worlds \
ryshe/terraria:latest \
-world /root/.local/share/Terraria/Worlds/world1.wld \
-autocreate 3 \
--log-opt max-size=200m \  # So the logs don't fill the disk space
-disable-commands          # Without this, we ran into a confusing and hard to diagnose NPE
```

_Note: autocreate number is size of world, 1=small, 2=med, 3=large_

#### Option 2 - Move a world to the server and run it:

Enter the ec2 console and run:

Find your world at: `%UserProfile%\Documents\My Games\Terraria\Worlds` on Windows

```
mkdir -p $HOME/terraria/world

# Move the world file to ~/terraria/world and reference the .wld file in the below command... something like:
scp -i ~/.ssh/<yourpemfile>.pem "/mnt/c/Users/mvien/OneDrive/Documents/my games/Terraria/Worlds/world1.wld" ec2-user@<your ec2 public ip>:~/terraria/world/

sudo docker run -d --rm \
--name="terraria" \
-p 7777:7777 \
-v $HOME/terraria/world:/root/.local/share/Terraria/Worlds \
ryshe/terraria:latest \
-e WORLD_FILENAME=world1.wld \
--log-opt max-size=200m \
-disable-commands
```

## Useful Docker commands

* `docker logs terraria -f` Get the terraria logs - I found that t3.micro was not enough and would crash when trying to load up. That's already a full gb of ram, but maybe that's not enough for a medium or large word. t3.small should be ok?

## Useful CDK commands

Note: The `cdk.json` file tells the CDK Toolkit how to execute your app. This isn't set up very intelligently just yet and basically has the default values still.

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

### Manual other things you need to set up (for now)

- Putting the terraria server world and settings up via console

## Todo

- Take an optional input file to take as the world to load onto that server
- Make the hard-coded endpoint in the JS file be added programatically when building out the cdk and setting up the API Gateway endpoint
