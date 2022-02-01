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

  LOG.debug('Polling for activity task');
  const activityTask = await STEP_FUNCTIONS_CLIENT.getActivityTask({
    activityArn: ACTIVITY_ARN,
    workerName: 'example-activity-worker',
  }).promise();
  LOG.info("Polled for activity task");

  if (!activityTask.taskToken) {
    LOG.info('No tasks to process');
    return;
  }

  const isTaskSuccessful = Math.random() < 0.5;

  LOG.debug(`Task successful: ${isTaskSuccessful}`);
  const taskOutput = {
    output: activityTask.input as string,
    taskToken: activityTask.taskToken as string,
  };

  LOG.debug(`Sending task outcome to Step Functions`);
  let response;
  if (isTaskSuccessful) {
    response = await STEP_FUNCTIONS_CLIENT.sendTaskSuccess(taskOutput).promise();
  } else {
    response = await STEP_FUNCTIONS_CLIENT.sendTaskFailure(taskOutput).promise();
  }

  let error: AWSError | void;
  if (error = response.$response.error) {
    LOG.error(`Failed to send task outcome to Step Functions: ${error.message}`);
    return;
  };

  LOG.info(
    `Sent task ${isTaskSuccessful ? "success" : "failure"} for token ${
      taskOutput.taskToken
    }`
  );
}
