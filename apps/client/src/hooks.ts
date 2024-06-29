import { createContext, useContext, useState } from "react";
import { Socket } from "socket.io-client";
import { ConnectionState, Device } from "mediasoup-client/lib/types";
import * as mediasoup from "mediasoup-client";

import { promisifySocket } from "./socket";

export const SocketContext = createContext<Socket | null>(null);

export type PublicationState = ConnectionState;
export type SubscriptionState = ConnectionState;

export type Ms = {
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  publish: (
    stream: MediaStream,
    listener: (state: PublicationState) => void
  ) => Promise<void>;
  subscribe: (
    listener: (state: SubscriptionState, stream: MediaStream) => void
  ) => Promise<void>;
};

export const useMs = () => {
  const _socket = useContext(SocketContext);
  if (!_socket) {
    throw new Error("useSocket must be used within a SocketProvider");
  }

  const socket = promisifySocket(_socket);
  const [connected, setConnected] = useState(false);
  const [device, setDevice] = useState<Device>();

  socket.on("connect", async () => {
    console.log(`Connected to server: socket.id=${socket.id}`);
    const rtpCapabilities = await socket.req("getRouterRtpCapabilities");
    console.log({ rtpCapabilities });
    const device = new mediasoup.Device();
    await device.load({ routerRtpCapabilities: rtpCapabilities });
    setDevice(device);
    setConnected(true);
  });
  socket.on("disconnect", (reason, description) => {
    console.log(`Disconnected from server: ${reason}`);
    console.log(description);
    setConnected(false);
  });

  return {
    connected,
    connect: () => socket.connect(),
    disconnect: () => socket.disconnect(),
    publish: async (stream, on) => {
      if (!device) {
        console.error("Device is not ready");
        return;
      }
      const transportOptions = await socket.req("createProducerTransport");
      const transport = device.createSendTransport(transportOptions);

      transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
        socket
          .req("connectProducerTransport", dtlsParameters)
          .then(callback)
          .catch(errback);
      });
      transport.on(
        "produce",
        async ({ kind, rtpParameters }, callback, errback) => {
          socket
            .req("produce", { id: transport.id, kind, rtpParameters })
            .then(callback)
            .catch(errback);
        }
      );

      const track = stream.getVideoTracks()[0];

      transport.on("connectionstatechange", (state) => {
        switch (state) {
          case "failed":
            transport.close();
            break;
        }
        on(state);
      });
      console.log({ track });

      const producer = await transport.produce({ track });
      console.log({ producer });
    },
    subscribe: async (listener) => {
      if (!device) {
        console.error("Device is not ready");
        return;
      }
      const transportOptions = await socket.req("createConsumerTransport");
      const transport = device.createRecvTransport(transportOptions);

      transport.on("connect", ({ dtlsParameters }, callback, errback) => {
        socket
          .req("connectConsumerTransport", dtlsParameters)
          .then(callback)
          .catch(errback);
      });

      const consumerOptions = await socket.req(
        "consume",
        device.rtpCapabilities
      );
      console.log({ consumerOptions });
      const consumer = await transport.consume(consumerOptions);
      console.log({ consumer });

      const stream = new MediaStream();
      stream.addTrack(consumer.track);

      transport.on("connectionstatechange", async (state) => {
        switch (state) {
          case "connected":
            await socket.req("resume");
            break;
          case "failed":
            transport.close();
            break;
        }
        listener(state, stream);
      });
    },
  } satisfies Ms;
};
