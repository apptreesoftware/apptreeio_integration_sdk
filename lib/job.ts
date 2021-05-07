import { JobAPI, LogRecordRequest } from "./api";
import StackUtils from "stack-utils";
import * as winston from "winston";
import Transport from "winston-transport";
import { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import ShortUniqueId from "short-unique-id";
import { getBodyString, getHeaders, getURL } from "./utils/axios";
import { TaskResponse } from "./task";

const stack = new StackUtils({
  cwd: process.cwd(),
  internals: StackUtils.nodeInternals(),
  ignoredPackages: ["apptreeio", "integration_sdk"],
});

class JobLoggerTransport extends Transport {
  constructor(private job: Job) {
    super();
  }
  log(info: any, next: () => void): any {
    this.job._log(info.message, info.level).then(() => console.log(info));
    if (next) {
      setImmediate(next);
    }
  }
}

export class Job {
  private _done = false;
  private _logger: winston.Logger;
  constructor(
    public jobId: number,
    public config: any,
    private api: JobAPI,
    public project: string
  ) {
    this._logger = winston.createLogger({
      level: "debug",
      transports: [
        //new winston.transports.Console({}),
        new JobLoggerTransport(this),
      ],
    });
  }

  logDebug(msg: string): void {
    this._logger.log("debug", msg);
  }

  logInfo(msg: string): void {
    this._logger.log("info", msg);
  }

  logError(msg: string): void {
    this._logger.log("error", msg);
  }

  async logRecord(request: Omit<LogRecordRequest, "jobId">): Promise<void> {
    const req = request as LogRecordRequest;
    req.jobId = this.jobId;
    await this.api.logRecord(req);
  }

  logAxios(axios: AxiosInstance) {
    axios.interceptors.request.use(async (requestConfig) => {
      const shortUid = new ShortUniqueId().randomUUID();
      (requestConfig as any)._RequestId = shortUid;
      (requestConfig as any)._RequestTimestamp = new Date().getTime();

      this.api
        .logHttpRequest({
          headers: getHeaders(requestConfig),
          url: getURL(requestConfig),
          body: getBodyString(requestConfig),
          jobId: this.jobId,
          method: requestConfig.method!,
          requestId: shortUid,
        })
        .then();
      return requestConfig;
    });
    axios.interceptors.response.use(
      async (r) => {
        this._logAxiosResponse(r);
        return r;
      },
      async (error) => {
        if (error.isAxiosError) {
          const axiosErr = error as AxiosError;
          const resp = axiosErr.response;
          if (resp) {
            this._logAxiosResponse(resp);
          } else {
            this.logError(
              `HTTP RESPONSE: FAILED with error ${axiosErr.message}`
            );
          }
        } else {
          this.logError(`HTTP RESPONSE: FAILED with error ${error}`);
        }
        return Promise.reject(error);
      }
    );
  }

  _logAxiosResponse(r: AxiosResponse, level: string = "debug") {
    const headers = {
      ...r.headers.common,
      ...r.headers,
    };
    ["common", "get", "post", "head", "put", "patch", "delete"].forEach(
      (header) => {
        delete headers[header];
      }
    );
    const requestId = (r.config as any)._RequestId;
    const startTime = (r.config as any)._RequestTimestamp;
    const endTime = new Date().getTime();
    let duration = 0;
    if (startTime !== undefined) {
      duration = endTime - startTime;
    }

    this.api
      .logHttpResponse({
        jobId: this.jobId,
        statusCode: r.status,
        statusMessage: r.statusText,
        body: r.data,
        headers: headers,
        duration: duration,
        requestId: requestId,
      })
      .then();
  }

  async _log(msg: string, level: string): Promise<void> {
    await this.api.log({
      jobId: this.jobId,
      data: { message: msg, level: level },
    });
  }

  async reportException(
    msg: string,
    opts?: { record?: any; recordId?: string; stackTrace?: string }
  ): Promise<void> {
    await this.api.reportJobError({
      jobId: this.jobId,
      record: opts?.record,
      recordId: opts?.recordId,
      stackTrace: stack.clean(new Error(msg).stack ?? ""),
      message: msg,
    });
  }

  async handleError(e: Error): Promise<void> {
    await this.api.reportJobError({
      jobId: this.jobId,
      stackTrace: stack.clean(e.stack ?? ""),
      message: e.message,
    });
  }

  async success(resultData: TaskResponse): Promise<void> {
    if (this._done) {
      return;
    }
    this._done = true;
    await this.api.endJob({
      jobId: this.jobId,
      status: "success",
      jobResultData: resultData as any,
    });
  }

  async fail(resultData: TaskResponse): Promise<void> {
    if (this._done) {
      return;
    }
    this._done = true;
    await this.api.endJob({
      jobId: this.jobId,
      status: "failed",
      jobResultData: resultData as any,
    });
  }
}
