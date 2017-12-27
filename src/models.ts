import { AxiosRequestConfig } from 'axios';

export type OrderStatus = 'NEW'|'PARTIALLY_FILLED'|'FILLED'|'CANCELLED'|'PENDING_CANCEL'|'REJECTED'|'EXPIRED'
export type SymbolType = 'SPOT'
export type OrderType = 'LIMIT'|'MARKET'
export type OrderSide = 'BUY'|'SELL'
export type TimeInForce = 'GTC'|'IOC'

// Binance has varying levels of security. These types will be used in HTTP
// request logic to format requests approproately
export type EndpointSecurity = 'NONE'|'API-KEY'|'SIGNED'

export interface EndpointList {
  [name: string]: Endpoint
}

export interface Headers {
  [name: string]: string
}

export interface BinanceApiErrorMessage {
  code: number
  msg: string
}

export interface Endpoint {
  url: string
  method?: 'GET'|'PUT'|'POST'|'PATCH'|'OPTIONS'|'DELETE'
  security: EndpointSecurity
}

export interface Order {
  price: string
  quantity: string
}

export interface RestClientOptions {
  apikey?: string
  apisecret?: string
  axiosOptions?: AxiosRequestConfig
}

export namespace RestApiParams {
  export interface NewOrder {
    symbol: string
    side: OrderSide
    type: OrderType
    timeInForce: TimeInForce
    quantity: number|string
    price: number|string
    newClientOrderId?: string
    stopPrice?: number|string
    icebergQty?: number|string
  }

  export interface OpenOrder {
    symbol: string
    recvWindow?: number
  }

  export interface Account {
    recvWindow?: number
  }

  export interface AllOrders extends OpenOrder {
    orderId?: number
    limit?: number
  }
}

export namespace RestApiResponses {
  export interface ApiError {
    code: number
    msg: string
  }

  export interface Ping {}

  export interface Time {
    serverTime: number
  }

  export interface Ticker {
    symbol: string
    price: string
  }

  export interface Balance {
    asset: string
    free: string
    locked: string
  }

  export interface Account {
    makerCommission: number
    takerCommission: number
    buyerCommission: number
    sellerCommission: number
    canTrade: boolean
    canWithdraw: boolean
    canDeposit: boolean
    balances: Balance[]
  }

  export interface OrderBook {
    lastUpdateId: number
    bids: OrderBookEntry[]
    asks: OrderBookEntry[]
  }

  export interface OrderBookEntry {
    price: string
    quantity: string
  }

  export interface OrderBookRaw {
    lastUpdateId: number
    bids: [ [string, string] ]
    asks: [ [string, string] ]
  }

  export interface NewOrder {
    symbol: string
    orderId: number
    clientOrderId: string
    transactTime: number
  }

  export interface Order {
    symbol: string
    orderId: number
    clientOrderId: string
    price: string
    origQty: string
    executedQty: string
    status: OrderStatus
    timeInForce: TimeInForce
    type: OrderType
    side: OrderSide
    stopPrice: string
    icebergQty: string
    time: number
  }

}
