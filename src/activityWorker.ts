import { ScheduledHandler } from "aws-lambda";

export const handler = async (event: ScheduledHandler) => {
  console.log(event);
}
