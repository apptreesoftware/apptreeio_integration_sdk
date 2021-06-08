import express from "express";
import { RemoteAPI } from "./api";
import { Job } from "./job";
export interface TaskResponse {
  success: boolean;
  message?: string;
  data?: any;
  totalRecords?: number;
  failedRecords?: number;
}
export interface TaskData<T = any, U = any> {
  project: string;
  payload: T;
  parameters: U;
}
export interface TaskFunction<T = any, U = any> {
  (data: TaskData<T, U>, job: Job): TaskResponse | Promise<TaskResponse>;
}
export interface httpTask {
  (req: express.Request, resp: express.Response): void | Promise<void>;
}
export function createTaskHandler<T, U>(
  taskFunction: TaskFunction<T, U>,
  identifier: string
): httpTask {
  return async (req: express.Request, resp: express.Response) => {
    let body = req.body;
    try {
      if (req.body instanceof Buffer) {
        body = JSON.parse(req.body.toString("utf8"));
      }
    } catch (e) {}

    const apiKey =
      req.headers.authorization ?? req.query["api_key"] ?? body?.api_key;
    const api = new RemoteAPI(apiKey);

    console.log(`Executing task: ${identifier} with apiKey: ${apiKey}`);
    let job: Job;
    try {
      job = await api.startJob(identifier);
    } catch (e) {
      console.error(e);
      resp.status(401).send("Not authorized");
      return;
    }

    const taskData: TaskData<T, U> = {
      project: job.project,
      payload: body as T,
      parameters: req.query as any,
    };

    try {
      const res = await taskFunction(taskData, job);
      resp.send(res);
      if (res.success) {
        await job.success(res);
      } else {
        await job.fail(res);
      }
    } catch (e) {
      console.error(e);
      await job.fail({
        success: false,
        failedRecords: 0,
        totalRecords: 0,
        message: `The following exception was thrown while executing this task. To get more accurate reporting, wrap your task with a try/catch block and report the exceptions using the Job API.\n\n${e}`,
      });
      resp.send({
        success: false,
        failedRecords: 0,
        totalRecords: 0,
        message: `The following exception was thrown while executing this task. To get more accurate reporting, wrap your task with a try/catch block and report the exceptions using the Job API.\n\n${e}`,
      });
    }
  };
}
