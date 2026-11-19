import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { describe, expect, it } from "vitest";

import { htmlResponse, invokeHandlerWithRRMock, redirectResponse } from "./utils";

function apiGatewayV2Event(
  path: string,
  method = "GET",
  headers: Record<string, string> = {},
  cookies?: string[],
  domainName = "example.com",
): APIGatewayProxyEventV2 {
  return {
    requestContext: { http: { method }, domainName } as APIGatewayProxyEventV2["requestContext"],
    rawPath: path,
    rawQueryString: "",
    headers: {
      host: "example.com",
      "x-forwarded-proto": "https",
      ...headers,
    },
    cookies,
    body: undefined,
    isBase64Encoded: false,
  } as Partial<APIGatewayProxyEventV2> as APIGatewayProxyEventV2;
}

describe("API Gateway v2 request handling", () => {
  it("parses API Gateway v2 event", async () => {
    await invokeHandlerWithRRMock(
      "createAPIGatewayV2RequestHandler",
      (request) => {
        expect(request.url).toBe("https://example.com/test");
        expect(request.method).toBe("POST");
        expect(request.headers.get("x-custom-header")).toBe("a");
        return new Response("ok");
      },
      apiGatewayV2Event("/test", "POST", { "x-custom-header": "a" }),
    );
  });

  it("uses requestContext.domainName by default", async () => {
    await invokeHandlerWithRRMock(
      "createAPIGatewayV2RequestHandler",
      (request) => {
        expect(request.url).toBe("https://context.example.com/test");
        return new Response("ok");
      },
      apiGatewayV2Event(
        "/test",
        "GET",
        { "x-forwarded-host": "forwarded.example.com" },
        undefined,
        "context.example.com",
      ),
    );
  });

  it("uses getHost to trust a forwarded header", async () => {
    await invokeHandlerWithRRMock(
      "createAPIGatewayV2RequestHandler",
      (request) => {
        expect(request.url).toBe("https://forwarded.example.com/test");
        return new Response("ok");
      },
      apiGatewayV2Event(
        "/test",
        "GET",
        { "x-forwarded-host": "forwarded.example.com" },
        undefined,
        "context.example.com",
      ),
      { getHost: (event) => event.headers["x-forwarded-host"] },
    );
  });

  it("uses getHost when provided (custom forwarded header)", async () => {
    await invokeHandlerWithRRMock(
      "createAPIGatewayV2RequestHandler",
      (request) => {
        expect(request.url).toBe("https://viewer.example.com/test");
        return new Response("ok");
      },
      apiGatewayV2Event("/test", "GET", {
        "x-forwarded-host": "forwarded.example.com",
        "x-viewer-host": "viewer.example.com",
      }),
      { getHost: (event) => event.headers["x-viewer-host"] },
    );
  });

  it("falls back to requestContext.domainName when getHost returns undefined", async () => {
    await invokeHandlerWithRRMock(
      "createAPIGatewayV2RequestHandler",
      (request) => {
        expect(request.url).toBe("https://context.example.com/test");
        return new Response("ok");
      },
      apiGatewayV2Event(
        "/test",
        "GET",
        { "x-forwarded-host": "forwarded.example.com" },
        undefined,
        "context.example.com",
      ),
      { getHost: () => undefined },
    );
  });

  it("strips invalid characters from the host", async () => {
    await invokeHandlerWithRRMock(
      "createAPIGatewayV2RequestHandler",
      (request) => {
        expect(request.url).toBe("https://example.com:4444/test");
        return new Response("ok");
      },
      apiGatewayV2Event("/test", "GET", {}, undefined, "example.com:4444/invalid@chars"),
    );
  });
});

describe("API Gateway v2 response handling", () => {
  it("html without cookie", async () => {
    const res = await invokeHandlerWithRRMock(
      "createAPIGatewayV2RequestHandler",
      () => htmlResponse(),
      apiGatewayV2Event("/html"),
    );
    expect(res).toStrictEqual({
      statusCode: 200,
      headers: {
        "content-type": "text/html",
      },
      body: "<html>ok</html>",
      isBase64Encoded: false,
      cookies: [],
    });
  });

  it("html with cookie", async () => {
    const res = await invokeHandlerWithRRMock(
      "createAPIGatewayV2RequestHandler",
      () => htmlResponse("a=1; Path=/"),
      apiGatewayV2Event("/html"),
    );
    expect(res).toStrictEqual({
      statusCode: 200,
      headers: {
        "content-type": "text/html",
      },
      body: "<html>ok</html>",
      isBase64Encoded: false,
      cookies: ["a=1; Path=/"],
    });
  });

  it("redirect without cookie", async () => {
    const res = await invokeHandlerWithRRMock(
      "createAPIGatewayV2RequestHandler",
      () => redirectResponse(),
      apiGatewayV2Event("/redir"),
    );
    expect(res).toStrictEqual({
      statusCode: 302,
      headers: {
        location: "https://example.com/next",
      },
      isBase64Encoded: false,
      cookies: [],
    });
  });

  it("redirect with cookie", async () => {
    const res = await invokeHandlerWithRRMock(
      "createAPIGatewayV2RequestHandler",
      () => redirectResponse("b=2; Path=/"),
      apiGatewayV2Event("/redir"),
    );
    expect(res).toStrictEqual({
      statusCode: 302,
      headers: {
        location: "https://example.com/next",
      },
      isBase64Encoded: false,
      cookies: ["b=2; Path=/"],
    });
  });

  it("preserves binary request bodies", async () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]);
    await invokeHandlerWithRRMock(
      "createAPIGatewayV2RequestHandler",
      async (request) => {
        expect(Buffer.from(await request.arrayBuffer())).toStrictEqual(pngHeader);
        return new Response("ok");
      },
      {
        ...apiGatewayV2Event("/upload", "POST", { "content-type": "image/png" }),
        body: pngHeader.toString("base64"),
        isBase64Encoded: true,
      },
    );
  });

  it("passes text request bodies through", async () => {
    await invokeHandlerWithRRMock(
      "createAPIGatewayV2RequestHandler",
      async (request) => {
        expect(await request.text()).toBe("a=1&b=2");
        return new Response("ok");
      },
      {
        ...apiGatewayV2Event("/form", "POST", { "content-type": "application/x-www-form-urlencoded" }),
        body: "a=1&b=2",
        isBase64Encoded: false,
      },
    );
  });

  it("handles immutable response headers with cookies (fetch() responses)", async () => {
    const res = await invokeHandlerWithRRMock(
      "createAPIGatewayV2RequestHandler",
      () => {
        const response = htmlResponse("a=1; Path=/");
        const immutable = new (class extends Headers {
          override delete(): never {
            throw new TypeError("immutable");
          }
        })(response.headers);
        Object.defineProperty(response, "headers", { value: immutable });
        return response;
      },
      apiGatewayV2Event("/"),
    );
    expect(res).toStrictEqual({
      statusCode: 200,
      headers: { "content-type": "text/html" },
      body: "<html>ok</html>",
      isBase64Encoded: false,
      cookies: ["a=1; Path=/"],
    });
  });
});
