#!/usr/bin/env node
import 'source-map-support/register'
require('dotenv').config()
const crypto = require('crypto')

import * as cdk from 'aws-cdk-lib'
import { TerrariaServerStack } from '../lib/terraria-server-aws-stack'


const email = process.env.EMAIL ?? ''
const UIpassword = process.env.UIPASSWORD ?? crypto.randomUUID()
const keyName = process.env.KEYNAME ?? ''

if (!email) {
  throw 'Should have an email created in a .env file, see Readme'
}

if (!keyName) {
  throw 'Should have the name of your IAM keypair in in a .env file, see Readme'
}

const app = new cdk.App()
new TerrariaServerStack(app, 'FlatEarth', {
  keyName,
  email,
  UIpassword,
  s3Files: './s3-files/flatearth',
  useElasticIP: false,
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
})

new TerrariaServerStack(app, 'InnMates', {
  keyName,
  email,
  UIpassword: process.env.INNMATES || "",
  useElasticIP: false,
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
})
