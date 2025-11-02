/**
 * @file network.ts
 * @purpose Centralized network request utilities for making API calls.
 */

import {
  GoogleGenerativeAIError,
  GoogleGenerativeAIFetchError,
  GoogleGenerativeAIRequestInputError,
  GoogleGenerativeAIAbortError,
} from '@google/generative-ai';

/**
 * A wrapper around the native fetch API to handle errors consistently.
 * @param url The URL to fetch.
 * @param fetchOptions The options for the fetch request.
 * @returns A promise that resolves to the Response object.
 */
export async function makeRequest(url: string, fetchOptions: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (e: any) {
    let err = e;
    if (err.name === 'AbortError') {
      err = new GoogleGenerativeAIAbortError(`Request aborted when fetching ${url}: ${e.message}`);
    } else {
      err = new GoogleGenerativeAIError(`Error fetching from ${url}: ${e.message}`);
    }
    err.stack = e.stack;
    throw err;
  }

  if (!response.ok) {
    let message = '';
    let errorDetails;
    try {
      const json = await response.json();
      message = json.error.message;
      if (json.error.details) {
        message += ` ${JSON.stringify(json.error.details)}`;
        errorDetails = json.error.details;
      }
    } catch (e) {
      // ignored
    }
    throw new GoogleGenerativeAIFetchError(`Error fetching from ${url}: [${response.status} ${response.statusText}] ${message}`, response.status, response.statusText, errorDetails);
  }
  return response;
}