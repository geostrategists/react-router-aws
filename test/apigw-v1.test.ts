import { describe, it, expect } from "vitest";
import { htmlResponse, redirectResponse, invokeHandlerWithRRMock } from "./utils";
import { APIGatewayProxyEvent } from "aws-lambda";

export function apiGatewayV1Event(
  path: string,
  method = "GET",
  headers: Record<string, string> = {},
): APIGatewayProxyEvent {
  return {
    requestContext: { httpMethod: method } as APIGatewayProxyEvent["requestContext"],
    path,
    queryStringParameters: {},
    headers: {
      Host: "example.com",
      "x-forwarded-proto": "https",
      ...headers,
    },
    body: null,
    isBase64Encoded: false,
  } as Partial<APIGatewayProxyEvent> as APIGatewayProxyEvent;
}

describe("API Gateway v1 request handling", () => {
  it("parses API Gateway v1 event", async () => {
    await invokeHandlerWithRRMock(
      "createAPIGatewayV1RequestHandler",
      (request) => {
        expect(request.url).toBe("https://example.com/test");
        expect(request.method).toBe("POST");
        expect(request.headers.get("x-custom-header")).toBe("a");
        return new Response("ok");
      },
      apiGatewayV1Event("/test", "POST", { "x-custom-header": "a" }),
    );
  });
});

describe("API Gateway v1 response handling", () => {
  it("html without cookie", async () => {
    const res = await invokeHandlerWithRRMock(
      "createAPIGatewayV1RequestHandler",
      () => htmlResponse(),
      apiGatewayV1Event("/html"),
    );
    expect(res).toStrictEqual({
      statusCode: 200,
      headers: {
        "content-type": "text/html",
      },
      body: "<html>ok</html>",
      isBase64Encoded: false,
    });
  });

  it("html with cookie", async () => {
    const res = await invokeHandlerWithRRMock(
      "createAPIGatewayV1RequestHandler",
      () => htmlResponse("a=1; Path=/"),
      apiGatewayV1Event("/html"),
    );
    expect(res).toStrictEqual({
      statusCode: 200,
      headers: {
        "content-type": "text/html",
        "set-cookie": "a=1; Path=/",
      },
      body: "<html>ok</html>",
      isBase64Encoded: false,
    });
  });

  it("redirect without cookie", async () => {
    const res = await invokeHandlerWithRRMock(
      "createAPIGatewayV1RequestHandler",
      () => redirectResponse(),
      apiGatewayV1Event("/redir"),
    );
    expect(res).toStrictEqual({
      statusCode: 302,
      headers: {
        location: "https://example.com/next",
      },
      body: "",
      isBase64Encoded: false,
    });
  });

  it("redirect with cookie", async () => {
    const res = await invokeHandlerWithRRMock(
      "createAPIGatewayV1RequestHandler",
      () => redirectResponse("b=2; Path=/"),
      apiGatewayV1Event("/redir"),
    );
    expect(res).toStrictEqual({
      statusCode: 302,
      headers: {
        location: "https://example.com/next",
        "set-cookie": "b=2; Path=/",
      },
      body: "",
      isBase64Encoded: false,
    });
  });
});
