import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Activity, StateMachine } from 'aws-cdk-lib/aws-stepfunctions'
import { StepFunctionsInvokeActivity } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction as LambdaFunctionTarget } from 'aws-cdk-lib/aws-events-targets'; 
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

export class AwsStepFunctionsActivityStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    const activity = new Activity(this, 'Activity', {
      activityName: 'example-activity'
    });

    const activityTask = new StepFunctionsInvokeActivity(this, 'ActivityTask', {
      activity,
    });

    const stateMachineName: string = 'example-state-machine';

    new StateMachine(this, 'StateMachine', {
      definition: activityTask,
      stateMachineName,
    });

    const activityWorker = new NodejsFunction(this, 'ActivityWorker', {
      description: `Lambda worker for activity in Step Functions '${stateMachineName}'`,
      entry: 'src/activityWorker.ts',
      environment: {
        ACTIVITY_ARN: activity.activityArn,
      },
      functionName: `example-activity-worker`,
      logRetention: RetentionDays.FIVE_DAYS,
      timeout: Duration.minutes(2),
    });

    activityWorker.addToRolePolicy(
      new PolicyStatement({
        actions: ['states:GetActivityTask', 'states:SendTask*'],
        resources: [activity.activityArn],
      })
    );

    new Rule(this, 'ActivitySchedule', {
      schedule: Schedule.cron({ minute: '0/5' }),
      targets: [new LambdaFunctionTarget(activityWorker)],
    });
  }
}
