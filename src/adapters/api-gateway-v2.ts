import type {
  APIGatewayProxyEventHeaders,
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2
} from 'aws-lambda'

import { readableStreamToString } from '@react-router/node'

import { isBinaryType } from '../binaryTypes'

import { ReactRouterAdapter } from './index'

function createReactRouterRequest(event: APIGatewayProxyEventV2): Request {
  const host = event.headers['x-forwarded-host'] || event.headers.host
  const search = event.rawQueryString.length ? `?${event.rawQueryString}` : ''
  const scheme = event.headers['x-forwarded-proto'] || 'http'

  const url = new URL(event.rawPath + search, `${scheme}://${host}`)
  const isFormData = event.headers['content-type']?.includes(
    'multipart/form-data'
  )

  return new Request(url.href, {
    method: event.requestContext.http.method,
    headers: createReactRouterHeaders(event.headers, event.cookies),
    body:
      event.body && event.isBase64Encoded
        ? isFormData
          ? Buffer.from(event.body, 'base64')
          : Buffer.from(event.body, 'base64').toString()
        : event.body,
  })
}

function createReactRouterHeaders(
  requestHeaders: APIGatewayProxyEventHeaders,
  requestCookies?: string[]
): Headers {
  const headers = new Headers()

  for (const [header, value] of Object.entries(requestHeaders)) {
    if (value) {
      headers.append(header, value)
    }
  }

  if (requestCookies) {
    headers.append('Cookie', requestCookies.join('; '))
  }

  return headers
}

async function sendReactRouterResponse(
  nodeResponse: Response
): Promise<APIGatewayProxyStructuredResultV2> {
  // AWS API Gateway will send back set-cookies outside of response headers.
  const cookies = nodeResponse.headers.getSetCookie()
  if (cookies.length) {
    nodeResponse.headers.delete('Set-Cookie')
  }

  const contentType = nodeResponse.headers.get('Content-Type')
  const isBase64Encoded = isBinaryType(contentType)
  let body: string | undefined

  if (nodeResponse.body) {
    if (isBase64Encoded) {
      body = await readableStreamToString(nodeResponse.body, 'base64')
    } else {
      body = await nodeResponse.text()
    }
  }

  return {
    statusCode: nodeResponse.status,
    headers: Object.fromEntries(nodeResponse.headers.entries()),
    cookies,
    body,
    isBase64Encoded,
  }
}

type ApiGatewayV2Adapter = ReactRouterAdapter<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2>

const apiGatewayV2Adapter: ApiGatewayV2Adapter = {
  createReactRouterRequest: createReactRouterRequest,
  sendReactRouterResponse: sendReactRouterResponse
}

export {
  createReactRouterRequest,
  createReactRouterHeaders,
  sendReactRouterResponse,
  apiGatewayV2Adapter
}

export type {
  ApiGatewayV2Adapter
}
