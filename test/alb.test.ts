import { describe, it, expect } from "vitest";
import { htmlResponse, redirectResponse, invokeHandlerWithRRMock } from "./utils";
import { ALBEvent } from "aws-lambda";

function albEvent(path: string, method = "GET", headers: Record<string, string> = {}): ALBEvent {
  return {
    requestContext: {} as ALBEvent["requestContext"],
    httpMethod: method,
    path,
    queryStringParameters: {},
    headers: {
      Host: "example.com",
      "x-forwarded-proto": "https",
      ...headers,
    },
    body: null,
    isBase64Encoded: false,
  };
}

describe("ALB request handling", () => {
  it("parses ALB event", async () => {
    await invokeHandlerWithRRMock(
      "createALBRequestHandler",
      async (request: Request) => {
        expect(request.url).toBe("https://example.com/test");
        expect(request.method).toBe("POST");
        expect(request.headers.get("x-custom-header")).toBe("a");
        return new Response("ok");
      },
      albEvent("/test", "POST", { "x-custom-header": "a" }),
    );
  });
});

describe("ALB response handling", () => {
  it("html without cookie", async () => {
    const res = await invokeHandlerWithRRMock("createALBRequestHandler", () => htmlResponse(), albEvent("/html"));

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
      "createALBRequestHandler",
      () => htmlResponse("a=1; Path=/"),
      albEvent("/html"),
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
    const res = await invokeHandlerWithRRMock("createALBRequestHandler", () => redirectResponse(), albEvent("/redir"));
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
      "createALBRequestHandler",
      () => redirectResponse("b=2; Path=/"),
      albEvent("/redir"),
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
