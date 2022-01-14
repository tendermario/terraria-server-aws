#!/usr/bin/env node
import 'source-map-support/register'
require('dotenv').config()
const crypto = require('crypto')

import * as cdk from 'aws-cdk-lib'
import { TerrariaServerStack } from '../lib/terraria-server-aws-stack'


const email = process.env.EMAIL ?? ""
const UIpassword = process.env.UIPASSWORD ?? crypto.randomUUID()

if (!email) {
  throw 'Should have an email created in a .env file, see Readme'
}

const app = new cdk.App()
new TerrariaServerStack(app, 'FlatEarth', {
  UIpassword,
  email,
  s3Files: './s3-files/flatearth',
  useElasticIP: true,
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
})

new TerrariaServerStack(app, 'InnMates', {
  UIpassword: process.env.INNMATES || "",
  email,
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
})
