#!/usr/bin/env node
import 'source-map-support/register'
require('dotenv').config()
const crypto = require('crypto')

import * as cdk from 'aws-cdk-lib'
import { TerrariaServerStack } from '../lib/terraria-server-aws-stack'


const email = process.env.EMAIL || ""
const UIpassword = process.env.UIPASSWORD || ""
const worldFileName = 'world.wld'

if (!email) {
  throw 'Should have an email created in a .env file, see Readme'
}

const app = new cdk.App()
new TerrariaServerStack(app, 'FlatEarth', {
  UIpassword,
  email,
  // Update this if your world file in s3-files has a different filename.
  // Otherwise, leave it alone since it is the name of the world filename
  // that it will generate.
  worldFileName,
  s3Files: './s3-files/flatearth',
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
})

new TerrariaServerStack(app, 'InnMates', {
  UIpassword: process.env.INNMATES || "",
  email,
})
