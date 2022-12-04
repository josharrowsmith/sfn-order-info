import { Construct } from "constructs";
import {
  Choice,
  Condition,
  Fail,
  LogLevel,
  StateMachine,
  StateMachineType,
  Succeed,
} from "aws-cdk-lib/aws-stepfunctions";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Duration } from "aws-cdk-lib";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import * as path from "path";

/**
 * An example state machine that executes a series of Lambda functions synchronously, with branching paths along the
 * way.
 */
export class CustomerStateMachine extends Construct {
  public readonly stateMachine: StateMachine;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    const baseLambdaPath = path.resolve(__dirname, "..", "lambda");

    // env variables (todo put in object)
    const ApiKey = new StringParameter(this, `value`, {
      parameterName: "/cdk/test",
      stringValue: "", // This should be updated manually on AWS Console
    }).stringValue;

    const hostname = new StringParameter(this, `value`, {
      parameterName: "/cdk/hostname",
      stringValue: "", // This should be updated manually on AWS Console
    }).stringValue;

    const user = new StringParameter(this, `value`, {
      parameterName: "/cdk/user",
      stringValue: "", // This should be updated manually on AWS Console
    }).stringValue;

    const commonFunctionProps: NodejsFunctionProps = {
      runtime: Runtime.NODEJS_16_X,
      handler: "handler",
      bundling: { minify: true },
      memorySize: 128,
      timeout: Duration.seconds(10),
      environment: {
        myEnvVariable: ApiKey,
        hostname: hostname,
        user: user,
      },
    };

    // Define our functions that'll be used in our state machine
    const getUsername = new NodejsFunction(this, "GetUsername", {
      ...commonFunctionProps,
      entry: path.join(baseLambdaPath, "getUsername", "index.ts"),
    });

    const getOrders = new NodejsFunction(this, "GetOrders", {
      ...commonFunctionProps,
      entry: path.join(baseLambdaPath, "getOrders", "index.ts"),
    });

    const formatData = new NodejsFunction(this, "FormatData", {
      ...commonFunctionProps,
      entry: path.join(baseLambdaPath, "formatData", "index.ts"),
    });

    // Define our final states
    const failState = new Fail(this, "FailState", {
      error: "Request Failed",
      cause: "$.Payload",
    });
    const succeedState = new Succeed(this, "SucceedState");

    // Define our tasks
    const getUsernameState = new LambdaInvoke(this, "GetUsernameState", {
      lambdaFunction: getUsername,
      outputPath: "$.Payload",
    });

    const getOrdersState = new LambdaInvoke(this, "GetOrdersState", {
      lambdaFunction: getOrders,
      outputPath: "$.Payload",
    });

    const formatDataState = new LambdaInvoke(this, "FormatDataState", {
      lambdaFunction: formatData,
      outputPath: "$.Payload",
    });

    // Define the steps in the state machine
    getUsernameState.next(
      new Choice(this, "ChoiceAftergetUsername")
        .when(Condition.stringEquals("$.status", "FAILED"), failState)
        .otherwise(getOrdersState)
    );

    getOrdersState.next(
      new Choice(this, "ChoiceAftergetOrders")
        .when(Condition.stringEquals("$.status", "FAILED"), failState)
        .otherwise(formatDataState)
    );

    formatDataState.next(succeedState);

    // This log group is optional, but helpful to see the progress of the state machine, as well as each input for
    // each step.
    const stateMachineLogGroup = new LogGroup(this, "StateMachineLogGroup");
    this.stateMachine = new StateMachine(this, "StateMachine", {
      stateMachineType: StateMachineType.EXPRESS,
      definition: getUsernameState,
      logs: {
        includeExecutionData: true,
        level: LogLevel.ALL,
        destination: stateMachineLogGroup,
      },
    });
  }
}
