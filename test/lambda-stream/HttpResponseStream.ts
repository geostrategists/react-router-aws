/**
 * Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * HttpResponseStream is NOT used by the runtime.
 * It is only exposed in the `awslambda` variable for customers to use.
 */

// based on https://github.com/aws/aws-lambda-nodejs-runtime-interface-client/blob/main/src/HttpResponseStream.js
// which is licensed under Apache License 2.0

"use strict";

import { ResponseStream } from "./ResponseStream";

const METADATA_PRELUDE_CONTENT_TYPE = "application/vnd.awslambda.http-integration-response";
const DELIMITER_LEN = 8;

// Implements the application/vnd.awslambda.http-integration-response content type.
export class HttpResponseStream {
  static from(underlyingStream: ResponseStream, prelude: unknown) {
    underlyingStream.setContentType(METADATA_PRELUDE_CONTENT_TYPE);

    // JSON.stringify is required. NULL byte is not allowed in metadataPrelude.
    const metadataPrelude = JSON.stringify(prelude);

    underlyingStream._onBeforeFirstWrite = (write) => {
      write(metadataPrelude);

      // Write 8 null bytes after the JSON prelude.
      write(new Uint8Array(DELIMITER_LEN));
    };

    return underlyingStream;
  }
}
