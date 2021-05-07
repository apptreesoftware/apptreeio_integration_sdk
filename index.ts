export * from "./lib/job";
export * from "./lib/api";
export * from "./lib/task";
import * as express from "express";

import { createTaskHandler, TaskFunction } from "./lib/task";

const tasks: { [key: string]: TaskFunction } = {};

export function addTask(t: TaskFunction, identifier: string) {
  tasks[identifier] = t;
}

export function handleRequest(req: express.Request, resp: express.Response) {
  const components = req.path.split("/");
  const taskId = components[components.length - 1];
  const taskFunction = tasks[taskId];
  if (!taskFunction) {
    resp.status(404).send(`Task not found: ${req.path}`);
    return;
  }
  const handler = createTaskHandler(taskFunction, taskId);
  handler(req, resp);
}
