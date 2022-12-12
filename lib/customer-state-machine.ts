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
import { Duration, Fn } from "aws-cdk-lib";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { StringListParameter } from "aws-cdk-lib/aws-ssm";
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
    const envList = new StringListParameter(this, "ip-list", {
      stringListValue: ["val1", "val2", "val3"],
      parameterName: "ipList",
    });

    const commonFunctionProps: any = {
      runtime: Runtime.NODEJS_16_X,
      handler: "handler",
      bundling: { minify: true },
      memorySize: 128,
      timeout: Duration.seconds(10),
      environment: {
        key: Fn.select(0, envList.stringListValue),
        hostname: Fn.select(1, envList.stringListValue),
        user: Fn.select(2, envList.stringListValue),
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
