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

## Infrastructure

- API Gateway endpoint to start up, shut down, and get status of EC2 instance
- A lambda that runs those above three actions

## Other features

- A frontend page to turn on/off your server

## Prereq

- aws-cli installed on your system (`sudo apt install awscli` in ubuntu)
- node, npm
- aws-cdk globally `npm install -g aws-cdk`
- with your aws credentials set up with `aws configure` (ref: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)
  - This sets up the files located in ~/.aws/config / credentials. If you get any of it wrong, you can change it there
  - I recommend if you already have a terraria server to select that region. If you are starting from scratch, use the region closest to you
  - You should probably create a user in AWS IAM with enough privileges to create many resources... if you're lazy, you can set Admin privileges to a user and create the key pair under it.

## How to set up

- Fork this repo

### Setup Frontend

- Set up GitHub pages so that you can find this page at yourusername.github.io/terraria-server-aws
- Feel free to play around with the styles to make it look better. It uses Tailwind for styles.

### Setup backend and CDK infrastructure

- Copy .env.example to a new file in the same location named .env - edit the contents to your own details
- Run `npm i` to install all the magic
- Run `cdk synth` to create the CloudFormation templates - these are the blueprints for your infrastructure
  - (TODO: Ugh this command isn't working for me right now halp)
- Run `cdk deploy` to put them into your account
- Check the status in the AWS console under CloudFormation. If anything messes up, you can delete it there and try again.
- This should create the infrastructure mentioned above.

## Useful CDK commands

Note: The `cdk.json` file tells the CDK Toolkit how to execute your app. This isn't set up very intelligently just yet and basically has the default values still.

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

### Manual other things you need to set up (for now)

- An ec2 server with Docker loading Terraria
- Putting the terraria server world and settings up via console
- Opening port 7777 traffic to connect to the server
- Maybe set up an elastic IP to attach to the isntance so the ip stays the same

## Todo

- Programatically create an EC2 instance with Terraria with docker (probably need to Bootstrap a bit https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html#getting_started_bootstrap)
- Create security group to open 7777 for connecting to Terraria for any outside users
- Create alarm for when the server has been on for more than 24 hours, 48 hrs, or something like that
- Take an optional input file to take as the world to load onto that server
- Create an elastic IP to associate with the instance so the IP doesnt change on each starting of the server
- Make the hard-coded endpoint in the JS file be added programatically when building out the cdk and setting up the API Gateway endpoint

