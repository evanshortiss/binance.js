# Binance.js - Binance API Wrapper

![https://travis-ci.org/evanshortiss/binance.js](https://travis-ci.org/evanshortiss/binance.js.svg) [![npm version](https://badge.fury.io/js/%40evanshortiss%2Fbinance.js.svg)](https://badge.fury.io/js/%40evanshortiss%2Fbinance.js.svg) [![https://coveralls.io/repos/github/evanshortiss/binance.js](https://coveralls.io/repos/github/evanshortiss/binance.js/badge.svg?branch=master)](https://coveralls.io/github/evanshortiss/binance.js?branch=master)
[![TypeScript](https://badges.frapsoft.com/typescript/version/typescript-next.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)

Node.js and Browser friendly wrapper for the Binance API, written using
TypeScript.

* Support for the Binance REST API (WebSockets would be nice too!)
* Compatible with Node.js (v5 and above) and Web Browsers.
* First class TypeScript support.
* Decent documentation.
* High code and test coverage.
* Support for Promises and Async/Await.
* Uses the native `crypto` module when used with Node.js to greatly improve
performance of HMAC generation vs. other modules.
* Straightforward. Doesn't alter the responses from Binance unless otherwise
noted.
* Lightweight wrapper. No wrapper Classes or large frameworks are forced on you.


## Node.js Quickstart

### Install

```
npm install binance.js --save
```

### Example

This is a Node.js example using ES5 syntax, but you can use ES6 and TypeScript
too.

```js
'use strict'

const Binance = require('binance.js')

const client = new Binance.RestClient({
  apikey: 'YOUR KEY GOES HERE',
  apisecret: 'YOUR KEY GOES HERE'
})

client.getAccountInformation()
  .then((balances) => {
    // Do something with your account balance information
  })
```

## API

### Errors
This module throws Error subclasses so you can easily detect the type of an
error and handle it accordingly.

The `MalformedRequestError`, `RequestResultUnknownError`, and
`InternalRequestError` have the following properties:

* response (Object) - This is the response data from Binance. Cointains `code`
and `msg` properties per the Binance API Docs.
* statusCode (Number) - The HTTP status code returned by Binance
* statusText (String) - Description of the returned HTTP status code

Some examples are shown below.

#### HttpError
If a protocol or connection error occurs then this error is thrown, e.g
ETIMEDOUT or ECONNREFUSED. Also thrown if the internal HTTP module (Axios)
encounters an error.

#### MissingCredentialsError
If you attempt to call an endpoint that requires SIGNED or API-KEY permissions,
but didn't provide the `apikey` and/or `apisecret` when creating a
`Binance.RestClient` this error is thrown.

#### MalformedRequestError
If the Binance API returns a 4xx status code then this error is thrown.

```js
const Binance = require('binance.js')

const client = new Binance.RestClient()

// Deliberately pass a bad symbol to get a 4xx error
client.getOrderBook('BADSYMBOL')
  .then((book) => doSomething(book))
  .catch((err) => {
    if (err instanceof Binance.Errors.MalformedRequestError) {
      // We can inspect the error to find a root cause. Error has properties
      // like those shown below
      // {
      //   response: { code: -1121, msg: 'Invalid symbol.' },
      //   statusText: 'Bad Request',
      //   statusCode: 400,
      //   name: 'BinanceMalformedRequestError' }
      // }
    } else {
      // Some other type of error
    }
  })
```

#### RequestResultUnknownError
This error is reserved for when Binance return a HTTP 504 to us. This means they
got your request, but didn't generate a response within their timeout period.

Don't treat this as a failure since the request _might_ have been a success.

Read their [API Docs](https://www.binance.com/restapipub.html) for more info.

#### InternalRequestError
When Binance return a 5xx status code other than 504 this is thrown.


### RestClient(options)
The RestClient allows you to perform HTTPS requests against the Biance API. It
supports the following options:

* [optional] apikey - Your Binance API key
* [optional] apisecret - Your Binance API secret
* [optional] axiosOptions - Overrides to pass to each API request. For more
details, check the [Axios Docs](https://github.com/axios/axios#request-config)

RestClient behaviours:

1. RestClient instance functions return Promises. This means they can be used
with Async/Await.
2. Most instance functions return the plain result from the Binance API.
Functions that alter the data into a friendlier format are noted below.
to save you the trouble of continuously typing `response.result`.
3. If a request returns a status code that isn't between 200 and 399 an error is
thrown, so be sure to use `.catch()` function on Promises and `try/catch` if
using Async/Await.

All of the following functions and the returned data types are detailed in the
Binance API docs. For details of the types shown below visit the
[src/models](https://github.com/evanshortiss/binance.js/blob/master/src/models.ts)
folder in this repo and read the Binance API docs.

Public methods are detailed below. Optional parameters are denoted using the `?`
character. Return types are between the angled braces, e.g `<ReturnType>`. If
the return type is followed by braces then it means an array containing entries
of that type will be returned, e.g `<ReturnType[]>`

#### http(uri: string, options?: AxiosRequestConfig): AxiosPromise
Perform a HTTPS request to the Binance API. You should only provide the relative
path, e.g `/public/getmarkets` since this library will create the fully formed
url.

Resolves the Promise with an
[AxiosResponse Object](https://github.com/axios/axios#response-schema).

```js
// Example call to the Binance API
client.http('/v1/ping', { timeout: 5000 })
  .then((result) => {})
  .catch((error) => {})
```

#### pingServer(): Promise<void>

#### getServerTime(): Promise<RestApiResponses.Time>

#### getOrderBook(symbol: string, limit?: number): Promise<RestApiResponses.OrderBook>
Returns the order book for a given symbol. This is one of the few functions
where data is changed from the Binance format to another format for ease of use.

Data will look similar to this:

```
{
  lastUpdateId: number
  bids: [
    {
      price: string
      quantity: string
    }
  ]
  asks: [
    {
      price: string
      quantity: string
    },
    {
      price: string
      quantity: string
    }
  ]
}
```

#### getAllPrices(): Promise<RestApiResponses.Account>

#### order(data: RestApiParams.NewOrder): Promise<RestApiResponses.NewOrder>

#### getAllAccountOrders(opts: RestApiParams.AllOrders): Promise<RestApiResponses.Order[]>

#### getAccountInformation(params?: RestApiParams.Account): Promise<RestApiResponses.Account>

