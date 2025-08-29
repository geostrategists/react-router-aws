import { Stream } from "node:stream";

// based on https://github.com/astuyve/lambda-stream/blob/main/src/ResponseStream.ts
// which is MIT licensed according to https://www.npmjs.com/package/lambda-stream

export class ResponseStream extends Stream.Writable {
  private response: Buffer[];
  _contentType?: string;
  _isBase64Encoded?: boolean;
  _onBeforeFirstWrite?: (write: (chunk: string | Uint8Array) => void) => void;
  _firstWriteHappened?: boolean = false;

  constructor() {
    super();
    this.response = [];
  }

  write(chunk: any, encoding: any, callback?: any): boolean {
    if (!this._firstWriteHappened) {
      this._firstWriteHappened = true;
      this._onBeforeFirstWrite?.(super.write.bind(this));
    }
    return super.write(chunk, encoding, callback);
  }

  // @param chunk Chunk of data to unshift onto the read queue. For streams not operating in object mode, `chunk` must be a string, `Buffer`, `Uint8Array` or `null`. For object mode
  // streams, `chunk` may be any JavaScript value.
  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.response.push(Buffer.from(chunk, encoding));
    callback();
  }

  getBufferedData(): Buffer {
    return Buffer.concat(this.response);
  }

  setContentType(contentType: string) {
    this._contentType = contentType;
  }

  setIsBase64Encoded(isBase64Encoded: boolean) {
    this._isBase64Encoded = isBase64Encoded;
  }
}
