import { describe, expect, it } from "vitest";
import { htmlResponse, invokeHandlerWithRRMock, redirectResponse } from "./utils";
import type { APIGatewayProxyEventV2 } from "aws-lambda";

function apiGatewayV2Event(
  path: string,
  method = "GET",
  headers: Record<string, string> = {},
  cookies?: string[],
): APIGatewayProxyEventV2 {
  return {
    requestContext: { http: { method } } as APIGatewayProxyEventV2["requestContext"],
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
});
