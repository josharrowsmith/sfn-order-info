#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CdkStepFunctionApiGatewayStack } from "../lib/cdk-step-function-api-gateway-stack";

const app = new cdk.App();
new CdkStepFunctionApiGatewayStack(app, "CdkStepFunctionApiGatewayStack");
