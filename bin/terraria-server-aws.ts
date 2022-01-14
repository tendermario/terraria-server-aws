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
new TerrariaServerStack(app, 'Default', {
  UIpassword,
  email,
  // Optional additional args:
  // s3Files: './s3-files/default',
  // worldName: 'world.wld',
  // useElasticIP: true,

  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
})
