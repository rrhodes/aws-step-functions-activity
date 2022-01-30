import { ScheduledHandler } from 'aws-lambda';
import { StepFunctions } from 'aws-sdk';

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

  LOG.info(activityTask);
  LOG.info('Activity worker finished');
}
