import { ScheduledHandler } from 'aws-lambda';
import { AWSError, StepFunctions } from 'aws-sdk';
import { SendTaskFailureOutput, SendTaskSuccessOutput } from 'aws-sdk/clients/stepfunctions';
import { PromiseResult } from 'aws-sdk/lib/request';

const { ACTIVITY_ARN } = process.env;
const LOG = require('simple-node-logger').createSimpleLogger();
const STEP_FUNCTIONS_CLIENT = new StepFunctions();

export const handler = async (_event: ScheduledHandler) => {
  LOG.info('Activity worker invoked');
  if (!ACTIVITY_ARN) {
    throw Error('Activity ARN from environment variables is undefined')
  }

  const activityTask = await STEP_FUNCTIONS_CLIENT.getActivityTask({
    activityArn: ACTIVITY_ARN,
    workerName: 'example-activity-worker',
  }).promise();

  if (!activityTask.taskToken) {
    LOG.info('No tasks to process');
    return;
  }

  // randomly decide whether to be successful or not
  const isTaskSuccessful = Math.random() < 0.5;

  let response: PromiseResult<unknown, AWSError>;
  let taskOutput;

  if (isTaskSuccessful) {
    taskOutput = {
      output: activityTask.input as string,
      taskToken: activityTask.taskToken as string,
    };
    response = await STEP_FUNCTIONS_CLIENT.sendTaskSuccess(taskOutput).promise();
  } else {
    taskOutput = {
      cause: 'Flipping a coin. Unlucky this time.',
      error: 'Bad luck! Try again.',
      taskToken: activityTask.taskToken as string,
    };
    response = await STEP_FUNCTIONS_CLIENT.sendTaskFailure(taskOutput).promise();
  }

  let error: AWSError | void;
  if (error = response.$response.error) {
    throw new Error(`Failed to send task outcome to Step Functions: ${error.message}`);
  };

  LOG.info(
    `Sent task ${isTaskSuccessful ? "success" : "failure"} for token ${
      taskOutput.taskToken
    }`
  );
}
