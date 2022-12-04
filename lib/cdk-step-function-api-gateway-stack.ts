import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { RestApi, StepFunctionsIntegration } from "aws-cdk-lib/aws-apigateway";
import { CustomerStateMachine } from "./customer-state-machine";

export class CdkStepFunctionApiGatewayStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const { stateMachine } = new CustomerStateMachine(
      this,
      "CustomerStateMachine"
    );

    const stateMachineIntegration =
      StepFunctionsIntegration.startExecution(stateMachine);
    const api = new RestApi(this, "RestAPIWithStepFunctionEndpoint");

    const startStateMachine = api.root.addResource("start-state-machine");
    startStateMachine.addMethod("POST", stateMachineIntegration);
  }
}
