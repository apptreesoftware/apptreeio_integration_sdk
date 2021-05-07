// noinspection JSUnfilteredForInLoop

import { AxiosRequestConfig } from "axios";

const isAbsoluteURL = require("axios/lib/helpers/isAbsoluteURL");
const combineURLs = require("axios/lib/helpers/combineURLs");
const buildURL = require("axios/lib/helpers/buildURL");

const filteredHeaderList = [
  "common",
  "delete",
  "get",
  "head",
  "post",
  "put",
  "patch",
  "content-type",
  "content-length",
  "vary",
  "date",
  "connection",
  "content-security-policy",
];

export function getURL(config: AxiosRequestConfig): string {
  let url = config.url;
  if (config.baseURL && !isAbsoluteURL(url)) {
    url = combineURLs(config.baseURL, url);
  }
  return buildURL(url, config.params, config.paramsSerializer);
}

export function getHeaders(
  config: AxiosRequestConfig
): { [p: string]: { value: string } } {
  const headerMap: { [key: string]: { value: string } } = {};
  const headers = {
    ...config.headers.common,
    ...config.headers,
  };
  for (const key in headers) {
    if (!filteredHeaderList.includes(key)) {
      headerMap[key] = headers[key];
    }
  }
  return headerMap;
}

export function getBodyString(config: AxiosRequestConfig) {
  const data = config.data;
  if (typeof data === "object") {
    return JSON.stringify(data);
  } else if (typeof data === "string") {
    return data;
  } else if (!data) {
    return "";
  }
  return "Unable to retrieve request body";
}
