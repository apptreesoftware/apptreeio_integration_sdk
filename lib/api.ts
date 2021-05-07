import { AxiosInstance, default as newAxios } from "axios";
import { Job } from "./job";

export interface JobAPI {
  startJob(integrationId: string): Promise<Job>;
  endJob(req: JobEndRequest): Promise<void>;
  reportJobError(req: ExceptionRequest): Promise<void>;
  log(logRequest: LogRequest): Promise<void>;
  logHttpRequest(httpRequest: HttpLogRequest): Promise<void>;
  logHttpResponse(httpResponse: HttpLogResponse): Promise<void>;
  logRecord(logRecord: LogRecordRequest): Promise<void>;
}

export class RemoteAPI implements JobAPI {
  private axios: AxiosInstance;
  constructor(apiKey: string) {
    this.axios = newAxios.create({
      baseURL: "https://assistants.apptreeio.com",
      headers: {
        Authorization: apiKey,
      },
    });
  }

  async startJob(integrationId: string): Promise<Job> {
    const resp = await this.axios.post<JobResponse>(
      "integration/jobs/begin",
      {
        integrationIdentifier: integrationId,
      },
      {
        validateStatus: (status) => {
          return status === 200 || status === 404 || status === 401;
        },
      }
    );
    if (resp.status === 401 || resp.status === 403) {
      throw new Error(
        "Invalid authorization. Please ensure that you have set your API Key correctly."
      );
    }
    if (resp.status === 404) {
      throw new Error(
        `No integration was found with the identifier of ${integrationId}`
      );
    }

    return new Job(resp.data.jobId, resp.data.config, this, resp.data.project);
  }

  async endJob(req: JobEndRequest) {
    await this.axios.post("integration/jobs/end", req);
  }

  async reportJobError(req: ExceptionRequest) {
    await this.axios.post("integration/jobs/error", req);
  }

  async log(logRequest: LogRequest) {
    await this.axios.post("integration/jobs/log", logRequest);
  }

  async logHttpRequest(httpRequest: HttpLogRequest) {
    try {
      await this.axios.post("integration/jobs/logHttpRequest", httpRequest);
    } catch (e) {
      console.error(`Unable to log request: ${e}`);
    }
  }

  async logHttpResponse(httpResponse: HttpLogResponse) {
    try {
      await this.axios.post("integration/jobs/logHttpResponse", httpResponse);
    } catch (e) {
      console.error(`Unable to log response: ${e}`);
    }
  }

  async logRecord(recordLog: LogRecordRequest) {
    try {
      await this.axios.post("integration/jobs/logRecord", recordLog);
    } catch (e) {
      console.error(`Unable to log record: ${e}`);
    }
  }
}

export interface JobEndRequest {
  jobId: number;
  status: "success" | "failed";
  jobResultData?: JSONValue;
}

export interface JobResponse {
  jobId: number;
  project: string;
  integrationId: number;
  config: JSONValue;
}

export interface LogRequest {
  jobId: number;
  data: JSONValue;
}

export interface HttpLogRequest {
  jobId: number;
  requestId: string;
  body?: string;
  headers: { [p: string]: { value: string } };
  method: string;
  url: string;
}

export interface HttpLogResponse {
  requestId: string;
  jobId: number;
  statusCode: number;
  statusMessage: string;
  body?: string;
  headers: { [prop: string]: string };
  duration: number;
}

export interface LogRecordRequest {
  jobId: number;
  recordId: string;
  record: any;
  message?: string;
  status: "success" | "fail";
}

export interface ExceptionRequest {
  jobId: number;
  message?: string;
  stackTrace?: string;
  record?: JSONValue;
  recordId?: string;
}
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };
