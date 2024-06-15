import { Socket } from "socket.io-client";
import {
  ConsumerOptions,
  DtlsParameters,
  Producer,
  RtpCapabilities,
  TransportOptions,
} from "mediasoup-client/lib/types";
import type { ProducerOptions as ServerSideProducerOptions } from "mediasoup/node/lib/types";

type K0Methods = {
  getRouterRtpCapabilities: {
    res: RtpCapabilities;
  };
  createProducerTransport: {
    res: TransportOptions;
  };
  createConsumerTransport: {
    res: TransportOptions;
  };
  resume: {
    res: void;
  };
};

type K1Methods = {
  connectProducerTransport: {
    params: DtlsParameters;
    res: void;
  };
  connectConsumerTransport: {
    params: DtlsParameters;
    res: void;
  };
  produce: {
    params: ServerSideProducerOptions;
    res: { id: Producer["id"] };
  };
  consume: {
    params: RtpCapabilities;
    res: ConsumerOptions;
  };
};

type Methods = K0Methods & K1Methods;

type Req = {
  <T extends keyof K0Methods, U extends K0Methods[T]>(method: T): Promise<
    U["res"]
  >;
  <T extends keyof K1Methods, U extends K1Methods[T]>(
    method: T,
    params: U["params"]
  ): Promise<U["res"]>;
};

export type AsyncSocket = Socket & {
  req: Req;
};

export function promisifySocket(socket: Socket): AsyncSocket {
  function req<T extends keyof K0Methods, U extends K0Methods[T]>(
    method: T
  ): Promise<U["res"]>;
  function req<T extends keyof K1Methods, U extends K1Methods[T]>(
    method: T,
    params: U["params"]
  ): Promise<U["res"]>;
  function req<T extends keyof Methods>(
    method: T,
    params?: unknown
  ): Promise<Methods[T]["res"]> {
    if (params) {
      return new Promise((resolve) => {
        socket.emit(method, params, (res) => {
          console.log(`[${method}] res:`, res);
          resolve(res);
        });
      });
    } else {
      return new Promise((resolve) => {
        socket.emit(method, (res) => {
          console.log(`[${method}] res:`, res);
          resolve(res);
        });
      });
    }
  }

  (socket as AsyncSocket).req = req;
  return socket as AsyncSocket;
}
