import { RestClient, Errors } from '../binance'
import * as assert from 'assert'
import * as nock from 'nock'
import { RestApiParams } from '../src/models';

// An example of an API error
const SAMPLE_ERROR = require('../fixtures/error.json')

const apikey = 'an-api-key-should-go-here'
const apisecret = 'an-api-secret-should-go-here'

// We mock out API request endpoints using nock in each test case
const api = nock('https://api.binance.com/api/', {})

// Validates the querystring for a signed request
const signedQueryValidator = (query: any) => {
  expect(query.timestamp).toBeDefined()
  expect(query.signature).toBeDefined()
}

const client = new RestClient({
  apikey: apikey,
  apisecret: apisecret
})

describe('#http()', () => {
  it('should throw an MissingCredentialsError due to missing apikey', async () => {
    const client = new RestClient()

    try {
      await client.http({
        url: 'some/thing',
        security: 'API-KEY'
      })
    } catch (e) {
      expect(e).toBeInstanceOf(Errors.MissingCredentialsError)
      expect(e.toString()).toEqual(
        'BinanceMissingCredentialsError: API-KEY HTTP endpoints require opts.apikey to be provided'
      )
    }
  })

  it('should throw an MissingCredentialsError due to missing apisecret', async () => {
    const client = new RestClient({
      apikey: apikey
    })

    try {
      await client.http({
        url: 'some/thing',
        security: 'SIGNED'
      })
    } catch (e) {
      expect(e).toBeInstanceOf(Errors.MissingCredentialsError)
      expect(e.toString()).toEqual(
        'BinanceMissingCredentialsError: SIGNED HTTP endpoints require opts.apisecret to be provided'
      )
    }
  })


  it('should not include API key or signature if security is "NONE"', async () => {
    api
      .get('/security/NONE')
      .query((query: any) => {
        expect(query.timestamp).toBeUndefined()
        return true
      })
      .reply(function () {
        expect(this.req.headers['x-mbx-apikey']).toBeUndefined()
        return [200, {}, {}]
      })

    await client.http({
      url: '/security/NONE',
      security: 'NONE'
    })
  })

  it('should include API key if security is "API-KEY"', async () => {
    api
      .get('/security/API-KEY')
      .query((query: any) => {
        expect(query.timestamp).toBeUndefined()
        return true
      })
      .reply(function () {
        expect(this.req.headers['x-mbx-apikey']).toEqual(apikey)
        return [200, {}, {}]
      })

    await client.http({
      url: '/security/API-KEY',
      security: 'API-KEY'
    })
  })

  it('should include API key if security is "SIGNED"', async () => {
    api
      .get('/security/SIGNED')
      .query((query: any) => {
        expect(query.timestamp).toBeDefined()
        expect(query.signature).toBeDefined()
        return true
      })
      .reply(function () {
        expect(this.req.headers['x-mbx-apikey']).toEqual(apikey)
        return [200, {}, {}]
      })

    await client.http({
      url: '/security/SIGNED',
      security: 'SIGNED'
    })
  })

  it('should return a MalformedRequestError when status code is 4xx', async () => {
    api
      .get('/some/endpoint')
      .query(true)
      .reply(406, SAMPLE_ERROR)

    try {
      await client.http({
        url: '/some/endpoint',
        security: 'NONE'
      })
      assert(false, 'API call should have failed');
    } catch (e) {
      expect(e).toBeInstanceOf(Errors.MalformedRequestError)

      const err = e as Errors.MalformedRequestError

      expect(err.statusCode).toEqual(406)
      expect(err.response).toEqual(SAMPLE_ERROR)
      expect(err.toString()).toEqual(
        'BinanceMalformedRequestError: Binance rejected request for formatting reasons. Status code 406. Status text "null"'
      )
    }
  })

  it('should return a InternalRequestError when status code 5xx (except 504)', async () => {
    api
      .get('/some-other/endpoint')
      .query(true)
      .reply(500, SAMPLE_ERROR)

    try {
      await client.http({
        url: '/some-other/endpoint',
        security: 'NONE'
      })
      assert(false, 'API call should have failed');
    } catch (e) {
      expect(e).toBeInstanceOf(Errors.InternalRequestError)

      const err = e as Errors.InternalRequestError

      expect(err.statusCode).toEqual(500)
      expect(err.response).toEqual(SAMPLE_ERROR)
      expect(err.toString()).toEqual(
        'BinanceInternalRequestError: Binance encountered error in processing request. Status code 500. Status text "null"'
      )
    }
  })

  it('should return a RequestResultUnknownError when status code is 504', async () => {
    api
      .get('/unknown/error/endpoint')
      .query(true)
      .reply(504, SAMPLE_ERROR)

    try {
      await client.http({
        url: '/unknown/error/endpoint',
        security: 'NONE'
      })
      assert(false, 'API call should have failed');
    } catch (e) {
      expect(e).toBeInstanceOf(Errors.RequestResultUnknownError)

      const err = e as Errors.RequestResultUnknownError

      expect(err.statusCode).toEqual(504)
      expect(err.response).toEqual(SAMPLE_ERROR)
      expect(err.toString()).toEqual(
        'BinanceRequestResultUnknownError: Binance could not determine request result. Status code 504. Status text "null"'
      )
    }
  })

  it('should wrap errors bubbled up from axios such as timeouts', async () => {
    const delay = 200
    const timeout = delay * 0.5

    api
      .get('/error/http-error')
      .delay(delay)
      .delayConnection(delay)
      .query(true)
      .reply(200, {})

    try {
      await client.http({
        url: '/error/http-error',
        security: 'NONE'
      }, { timeout: 50 })
      assert(false, 'API call should have timed out');
    } catch (e) {
      expect(e).toBeInstanceOf(Errors.HttpError)
      expect(e.toString()).toContain('BinanceHttpError: Error: timeout of 50ms exceeded')
    }
  })
})

describe('#getAllPrices()', () => {
  it('should return BTC balance for the account', async () => {
    api
      .get('/v3/allOrders')
      .query(true)
      .reply(200, require('../fixtures/all-prices.json'))

    const prices = await client.getAllPrices()

    expect(prices).toBeInstanceOf(Array)
    expect(prices).toContainEqual({
      symbol: "LTCBTC",
      price: "4.00000200"
    })
  })
})

describe('#getServerTime()', () => {
  it('should return all account balances', async () => {
    api
      .get('/v1/time')
      .query(true)
      .reply(200, require('../fixtures/time.json'))

    const time = await client.getServerTime()

    expect(time).toBeInstanceOf(Object)
    expect(time.serverTime).toEqual(1499827319559)
  })
})

describe('#getOrderBook()', () => {
  it('should return array of currency objects', async () => {
    api
      .get('/v1/depth')
      .query(true)
      .reply(200, require('../fixtures/order-book.json'))

    const book = await client.getOrderBook('btc')

    expect(book.lastUpdateId).toEqual(1027024)

    expect(book.bids).toBeDefined()
    expect(book.bids[0].price).toEqual('4.00000000')
    expect(book.bids[0].quantity).toEqual('431.00000000')

    expect(book.asks).toBeDefined()
    expect(book.asks[0].price).toEqual('4.00000200')
    expect(book.asks[0].quantity).toEqual('12.00000000')
  })
})

describe('#pingServer()', () => {
  it('should not throw an error', async () => {
    api
      .get('/v1/ping')
      .query(true)
      .reply(200, require('../fixtures/ping.json'))

    await client.pingServer()
  })
})

describe('#order()', () => {
  it('should successfully place an order', async () => {
    const order: RestApiParams.NewOrder = {
      symbol: 'BTCETH',
      side: 'BUY',
      type: 'LIMIT',
      timeInForce: 'GTC',
      quantity: '1.43',
      price: '0.05'
    }

    api
      .post('/v3/order', (body) => {
        Object.keys(order).forEach(k => expect(body[k]).toEqual(order[k]))

        expect(body.timestamp).toBeDefined()
        expect(body.signature).toBeDefined()

        return true
      })
      .query(true)
      .reply(200, require('../fixtures/order.json'))

    const orderResult = await client.order(order)

    expect(orderResult).toEqual({
      symbol: 'LTCBTC',
      orderId: 1,
      clientOrderId: 'myOrder1',
      transactTime: 1499827319559
    })
  })
})

describe('#getAllAccountOrders()', () => {
  it('should return orders', async () => {
    api
      .get('/v3/allOrders')
      .query(true)
      .reply(200, require('../fixtures/all-orders.json'))

    const orders = await client.getAllAccountOrders({
      symbol: 'LTCBTC'
    })

    expect(orders).toBeInstanceOf(Array)
    expect(orders).toContainEqual({
      symbol: 'LTCBTC',
      orderId: 1,
      clientOrderId: 'myOrder1',
      price: '0.1',
      origQty: '1.0',
      executedQty: '0.0',
      status: 'NEW',
      timeInForce: 'GTC',
      type: 'LIMIT',
      side: 'BUY',
      stopPrice: '0.0',
      icebergQty: '0.0',
      time: 1499827319559
    })
  })
})

describe('#getAccountInformation()', () => {
  it('should return account information', async () => {
    api
      .get('/v3/account')
      .query(true)
      .reply(200, require('../fixtures/account.json'))

    const info = await client.getAccountInformation()

    expect(info).toEqual({
		  makerCommission: 15,
		  takerCommission: 15,
		  buyerCommission: 0,
		  sellerCommission: 0,
		  canTrade: true,
		  canWithdraw: true,
		  canDeposit: true,
		  balances: [
		    {
		      asset: 'BTC',
		      free: '4723846.89208129',
		      locked: '0.00000000'
		    },
		    {
		      asset: 'LTC',
		      free: '4763368.68006011',
		      locked: '0.00000000'
		    }
		  ]
		})
  })
})
