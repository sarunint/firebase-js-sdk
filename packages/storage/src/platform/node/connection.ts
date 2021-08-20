/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ErrorCode, Connection } from '../../implementation/connection';
import { internalError } from '../../implementation/error';
import * as nodeFetch from 'node-fetch';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetch: typeof window.fetch = nodeFetch as any;

/** An override for the text-based Connection. Used in tests. */
let textFactoryOverride: (() => Connection<string>) | null = null;

/**
 * Network layer that works in Node.
 *
 * This network implementation should not be used in browsers as it does not
 * support progress updates.
 */
abstract class FetchConnection<ResponseType>
  implements Connection<ResponseType>
{
  private errorCode_: ErrorCode;
  private statusCode_: number | undefined;
  protected body_: ArrayBuffer | undefined;
  private headers_: Headers | undefined;
  private sent_: boolean = false;

  constructor() {
    this.errorCode_ = ErrorCode.NO_ERROR;
  }

  send(
    url: string,
    method: string,
    body?: ArrayBufferView | Blob | string,
    headers?: Record<string, string>
  ): Promise<void> {
    if (this.sent_) {
      throw internalError('cannot .send() more than once');
    }
    this.sent_ = true;

    return fetch(url, {
      method,
      headers: headers || {},
      body
    })
      .then(resp => {
        this.headers_ = resp.headers;
        this.statusCode_ = resp.status;
        return resp.arrayBuffer();
      })
      .then(body => {
        this.body_ = body;
      });
  }

  getErrorCode(): ErrorCode {
    if (this.errorCode_ === undefined) {
      throw internalError('cannot .getErrorCode() before receiving response');
    }
    return this.errorCode_;
  }

  getStatus(): number {
    if (this.statusCode_ === undefined) {
      throw internalError('cannot .getStatus() before receiving response');
    }
    return this.statusCode_;
  }

  abstract getResponse(): ResponseType;

  getResponseText(): string {
    if (this.body_ === undefined) {
      throw internalError(
        'cannot .getResponseText() before receiving response'
      );
    }

    return new TextDecoder().decode(this.body_);
  }

  abort(): void {
    // Not supported
  }

  getResponseHeader(header: string): string | null {
    if (!this.headers_) {
      throw internalError(
        'cannot .getResponseText() before receiving response'
      );
    }
    return this.headers_.get(header);
  }

  addUploadProgressListener(listener: (p1: ProgressEvent) => void): void {
    // Not supported
  }

  /**
   * @override
   */
  removeUploadProgressListener(listener: (p1: ProgressEvent) => void): void {
    // Not supported
  }
}

export class FetchTextConnection extends FetchConnection<string> {
  getResponse(): string {
    return this.getResponseText();
  }
}

export function newTextConnection(): Connection<string> {
  return textFactoryOverride
    ? textFactoryOverride()
    : new FetchTextConnection();
}

export class FetchBytesConnection extends FetchConnection<ArrayBuffer> {
  getResponse(): ArrayBuffer {
    if (!this.body_) {
      throw internalError('cannot .getResponse() before sending');
    }
    return this.body_;
  }
}

export function newBytesConnection(): Connection<ArrayBuffer> {
  return new FetchBytesConnection();
}

export function injectTestConnection(
  factory: (() => Connection<string>) | null
): void {
  textFactoryOverride = factory;
}

export function newBlobConnection(): Connection<Blob> {
  throw new Error('Blobs are not supported on Node');
}
