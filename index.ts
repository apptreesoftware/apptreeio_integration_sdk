export * from "./lib/job";
export * from "./lib/api";
export * from "./lib/task";
import * as express from "express";

import { createTaskHandler, TaskFunction } from "./lib/task";

const tasks: { [key: string]: TaskFunction } = {};
let VERSION : string = "VERSION_NOT_SET";

export function addTask(t: TaskFunction, identifier: string) {
  tasks[identifier] = t;
}

export function setVersion(version: string) {
  VERSION = version;
}

export function handleRequest(req: express.Request, resp: express.Response) {
  const components = req.path.split("/");
  const taskId = components[components.length - 1];
  if (taskId === '_version') {
    resp.send(`VERSION: ${VERSION}`)
    return;
  }
  const taskFunction = tasks[taskId];
  if (!taskFunction) {
    resp.status(404).send(`Task not found: ${req.path}`);
    return;
  }
  const handler = createTaskHandler(taskFunction, taskId);
  handler(req, resp);
}
