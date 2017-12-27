import { RestApiResponses } from './models'

export class HttpError extends Error {
  constructor (msg: string|any) {
    super(msg)

    this.stack = msg.stack

    // Print the expected name in error toString calls, e.g:
    // "BinanceHttpError: received status code 404 and text "Not Found""
    this.name = 'BinanceHttpError'

    // This is necessary to have the error report the correct type, e.g using
    // "e instanceof RestApiError" without this would fail, but it screws up
    // our code coverage...
    // https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, HttpError.prototype)
  }
}

export class MalformedRequestError extends Error {
  constructor (public response: RestApiResponses.ApiError, public statusText?: string, public statusCode?: number) {
    super()

    this.name = 'BinanceMalformedRequestError'

    Object.setPrototypeOf(this, MalformedRequestError.prototype)
  }

  toString () {
    const name = this.name
    const text = this.statusText
    const code = this.statusCode
    return `${name}: Binance rejected request for formatting reasons. Status code ${code}. Status text "${text}"`
  }
}

export class RequestResultUnknownError extends Error {
  constructor (public response: RestApiResponses.ApiError, public statusText?: string, public statusCode?: number) {
    super()

    this.name = 'BinanceRequestResultUnknownError'

    Object.setPrototypeOf(this, RequestResultUnknownError.prototype)
  }

  toString () {
    const name = this.name
    const text = this.statusText
    const code = this.statusCode
    return `${name}: Binance could not determine request result. Status code ${code}. Status text "${text}"`
  }
}

export class MissingCredentialsError extends Error {
  constructor (msg: string) {
    super(msg)

    this.name = 'BinanceMissingCredentialsError'

    Object.setPrototypeOf(this, MissingCredentialsError.prototype)
  }
}


export class InternalRequestError extends Error {
  constructor (public response: RestApiResponses.ApiError, public statusText?: string, public statusCode?: number) {
    super()

    this.name = 'BinanceInternalRequestError'

    Object.setPrototypeOf(this, InternalRequestError.prototype)
  }

  toString () {
    const name = this.name
    const text = this.statusText
    const code = this.statusCode
    return `${name}: Binance encountered error in processing request. Status code ${code}. Status text "${text}"`
  }
}
