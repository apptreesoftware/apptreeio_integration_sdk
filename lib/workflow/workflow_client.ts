import * as axios from "axios";

export interface WorkflowClient {
  LogMessage(message: string, logLevel: LogLevel): Promise<void>;
  SpawnWorkflow(workflow: string, input: any): Promise<void>;
}

export enum LogLevel {
  Debug,
  Info,
  Warn,
  Error,
}

export class ClientImpl implements WorkflowClient {
  private httpClient: axios.AxiosInstance;
  constructor(private env: WorkflowEnvironment) {
    this.httpClient = axios.default.create({
      headers: {
        Authorization: `Bearer ${env.authorization}`,
      },
    });
  }

  async LogMessage(message: string, level: LogLevel = LogLevel.Debug): Promise<void> {
    await this.httpClient.post(this.env.logApiUrl, {
      environment: this.env,
      message: message,
      level: level,
    });
  }

  async SpawnWorkflow(workflow: string, input: string | object): Promise<void> {
    let inputData: any = "";
    if (typeof input === "string") {
      inputData = input;
    } else {
      inputData = JSON.stringify(input);
    }

    await this.httpClient.post(this.env.spawnApiUrl, {
      environment: this.env,
      workflow: workflow,
      input: inputData,
    });
  }
}

export interface WorkflowEnvironment {
  project: string;
  workflow: string;
  runId: string;
  stepName: string;
  stepVersion: string;
  triggerType: string;
  stepInstanceId: string;
  package: string;
  cacheHost: string;
  debug: boolean;
  spawnApiUrl: string;
  logApiUrl: string;
  authorization: string;
}
