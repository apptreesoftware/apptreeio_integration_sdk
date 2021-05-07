import * as express from "express";
import { WorkflowEnvironment, ClientImpl, WorkflowClient } from "./workflow_client";

export function createClient(data: express.Request | WorkflowEnvironment): WorkflowClient {
  let env: WorkflowEnvironment;
  if (isRequest(data)) {
    env = getEnvironment(data as express.Request);
  } else {
    env = data as WorkflowEnvironment;
  }
  return new ClientImpl(env);
}

export function getEnvironment(req: express.Request): WorkflowEnvironment {
  const env = req.body._environment as WorkflowEnvironment;
  if (!env) {
    throw Error("Request does not contain an environment");
  }
  return env;
}

export function validateInputs(req: express.Request, ...inputs: string[]) {
  const body = req.body;
  for (const input of inputs) {
    if (!body[input]) {
      throw Error(`required input '${input}' was not provided`);
    }
  }
}

function isRequest(data: any): boolean {
  if (!data) {
    return false;
  }
  if (data.protocol) {
    return true;
  }
  return false;
}
