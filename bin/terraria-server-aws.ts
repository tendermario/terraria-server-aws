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
  worldFileName,
  s3Files: './s3-files/flatearth',
  useEIP: true,
})

new TerrariaServerStack(app, 'InnMates', {
  UIpassword: process.env.INNMATES || "",
  email,
})
