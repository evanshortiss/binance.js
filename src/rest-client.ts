import * as Models from './models'
import * as url from 'url-join'
import * as Errors from './errors'
import * as utils from './utils'
import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios'
import { getLogger } from './log'
import { stringify as qstringify } from 'querystring'

const log = getLogger('rest-client')

const AXIOS_DEFAULTS: AxiosRequestConfig = {
  timeout: 15000
}

export class RestClient {
  protected options: Models.RestClientOptions
  protected axios: AxiosInstance

  constructor (options: Models.RestClientOptions = {}) {
    this.options = options

    // All override of defaults, e.g timeout
    this.axios = axios.create(
      Object.assign(
        AXIOS_DEFAULTS,
        options.axiosOptions || {}
      )
    )

    // Log outgoing requests
    this.axios.interceptors.request.use((config: AxiosRequestConfig) => {
      log(`making request with url ${config.url}`)

      return config
    })

    // Log incoming responses
    this.axios.interceptors.response.use((resp) => {
      log(`received ${resp.status} response for request to ${resp.config.url}. response data %j`, resp.data)

      return resp
    })
  }

  /**
   * Perform a request to the given REST endpoint with the passed options.
   * @param uri Relative path to call.
   * @param options AxiosRequestConfig options.
   */
  async http (endpoint: Models.Endpoint, options: AxiosRequestConfig = {}) {
    // Default to GET unless the endpoint data specifies otherwise
    const httpMethod = endpoint.method || 'GET'

    // Container for headers, we'll add things as we go
    const headers: Models.Headers = options.headers || {}

    // The input parameters for the endpoint. Use Object.create to clone the
    // given object since we modify it, and add properties which users might not
    // expect to see if they reuse the Object for some reason
    const inputs = httpMethod === 'GET' ? Object.assign({}, options.params) : Object.assign({}, options.data)

    // We need overwrite these to create valid requests, so nuke em
    delete options.data
    delete options.params

    // Non-public endpoints require an API key
    if (endpoint.security !== 'NONE') {
      if (!this.options.apikey) {
        throw new Errors.MissingCredentialsError(
          `${endpoint.security} HTTP endpoints require opts.apikey to be provided`
        )
      }

      headers['X-MBX-APIKEY'] = this.options.apikey
    }

    // If the request is signed then we need to inject a millisecond timestamp
    if (endpoint.security === 'SIGNED') {
      if (!this.options.apisecret) {
        throw new Errors.MissingCredentialsError(
          `${endpoint.security} HTTP endpoints require opts.apisecret to be provided`
        )
      }

      inputs.timestamp = Date.now()
      inputs.signature = utils.getHmac(
        qstringify(inputs),
        this.options.apisecret
      )
    }

    // Join the URL parts safely to generate the entire endpoint, e.g:
    // https://api.binance.com/api/v3/order
    const fullUrl = url('https://api.binance.com/api', endpoint.url)

    // Generate request options, but favour our inputs over those given
    const requestOptions = Object.assign(options, {
      url: fullUrl,
      headers: headers,
      method: httpMethod,
      validateStatus: () => { return true }
    })

    if (httpMethod === 'GET') {
      log('adding request query')
      requestOptions.params = inputs
    } else {
      log('adding request body')
      // Need to pass data in querystring format:
      // https://github.com/axios/axios/issues/350#issuecomment-227270046
      requestOptions.data = qstringify(inputs)
    }

    let result: AxiosResponse

    // If axios throws an error, e.g a timeout, we catch it and bubble up
    try {
      result = await this.axios.request(requestOptions)
    } catch (e) {
      throw new Errors.HttpError(e)
    }
    log('error occurred', result.status, result.statusText)
    if (result.status >= 400 && result.status <= 499) {
      throw new Errors.MalformedRequestError(result.data, result.statusText, result.status)
    } else if (result.status === 504) {
      throw new Errors.RequestResultUnknownError(result.data, result.statusText, result.status)
    } else if (result.status >= 500 && result.status <= 599) {
      throw new Errors.InternalRequestError(result.data, result.statusText, result.status)
    } else  {
      return result
    }
  }

  /**
   * Calls the Binance API endpoint GET /api/v1/ping
   * Returns successfully if the request encounters no errors.
   */
  async pingServer () {
    const ret = await this.http(ENDPOINTS.PING)

    return ret.data as Models.RestApiResponses.Ping
  }

  /**
   * Calls the Binance API endpoint GET /api/v1/time
   * Returns the JSON specified in the Binance API documentation.
   */
  async getServerTime () {
    const ret = await this.http(ENDPOINTS.TIME)

    return ret.data as Models.RestApiResponses.Time
  }

  /**
   * Calls the Binance API endpoint GET /api/v1/depth
   *
   * Returns the order book for a given symbol.
   *
   * The format returned by this method is friendlier version of the Binance
   * response that looks like so:
   *
   * {
   *    lastUpdateId: number,
   *    bids: [ { price: number, quantity: number } ],
   *    asks: [ { price: number, quantity: number } ]
   * }
   *
   * @param symbol
   * @param limit
   */
  async getOrderBook (symbol: string, limit?: number): Promise<Models.RestApiResponses.OrderBook> {
    const ret = await this.http(ENDPOINTS.ORDERBOOK, {
      params: {
        symbol,
        limit
      }
    })

    const response = ret.data as Models.RestApiResponses.OrderBookRaw

    return {
      lastUpdateId: response.lastUpdateId,
      bids: response.bids.map(entry => {
        return {
          price: entry[0],
          quantity: entry[1]
        }
      }),
      asks: response.asks.map(entry => {
        return {
          price: entry[0],
          quantity: entry[1]
        }
      })
    }
  }

  /**
   * Calls the Binance API endpoint GET /api/v1/ticker/allPrices
   * Returns the latest prices for all symbols.
   */
  async getAllPrices () {
    const ret = await this.http(ENDPOINTS.ALLPRICES)

    return ret.data as Models.RestApiResponses.Ticker[]
  }

  /**
   * Calls the Binance API endpoint POST /api/v3/order
   * Place a new order.
   * @param opts
   */
  async order (data: Models.RestApiParams.NewOrder) {
    const ret = await this.http(ENDPOINTS.ORDER, {
      data
    })

    return ret.data as Models.RestApiResponses.NewOrder
  }

  /**
   * Calls the Binance API endpoint GET /api/v3/allOrders
   * Returns all account orders; active, canceled, or filled.
   * @param opts
   */
  async getAllAccountOrders (opts: Models.RestApiParams.AllOrders) {
    const ret = await this.http(ENDPOINTS.ALLORDERS, {
      params: opts
    })

    return ret.data as Models.RestApiResponses.Order[]
  }

  /**
   * Calls the Binance API endpoint GET /api/v3/account
   * Returns all account orders; active, canceled, or filled.
   * @param opts
   */
  async getAccountInformation (params?: Models.RestApiParams.Account) {
    const ret = await this.http(ENDPOINTS.ACCOUNT, {
      params
    })

    return ret.data as Models.RestApiResponses.Account
  }
}

const ENDPOINTS: Models.EndpointList = {
  PING: {
    url: '/v1/ping',
    security: 'NONE'
  },
  TIME: {
    url: '/v1/time',
    security: 'NONE'
  },
  ALLPRICES: {
    url: '/v1/ticker/allPrices',
    security: 'NONE'
  },
  ORDERBOOK: {
    url: '/v1/depth',
    security: 'NONE'
  },
  ORDER: {
    url: '/v3/order',
    security: 'SIGNED',
    method: 'POST'
  },
  OPENORDERS: {
    url: '/v3/openOrders',
    security: 'SIGNED'
  },
  ALLORDERS: {
    url: '/v3/allOrders',
    security: 'SIGNED'
  },
  ACCOUNT: {
    url: '/v3/account',
    security: 'SIGNED'
  }
}
