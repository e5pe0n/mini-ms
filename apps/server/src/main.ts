import express from "express";
import https from "https";
import fs from "fs";
import cors from "cors";
import { Server } from "socket.io";
import type { Consumer, Producer, Transport } from "mediasoup/node/lib/types";
import * as mediasoup from "mediasoup";

import { config } from "./config";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  })
);

app.get("/hello-world", (req, res) => {
  res.send("Hello, World!");
});

const server = https
  .createServer(
    {
      key: fs.readFileSync(config.sslKey),
      cert: fs.readFileSync(config.sslCrt),
    },
    app
  )
  .listen(config.port, () => {
    console.log(`Server listening on port https://localhost:${config.port}`);
  });

async function main() {
  const msWorker = await mediasoup.createWorker({
    logLevel: config.mediasoup.worker.logLevel,
    logTags: config.mediasoup.worker.logTags,
    rtcMinPort: config.mediasoup.worker.rtcMinPort,
    rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
  });
  msWorker.on("died", () => {
    console.error(
      `mediasoup worker died, exiting in 2s ... [pid:${msWorker.pid}]`
    );
    setTimeout(() => process.exit(1), 2_000);
  });
  const msRouter = await msWorker.createRouter({
    mediaCodecs: config.mediasoup.router.mediaCodecs,
  });

  async function createWebRtcTransport() {
    const transport = await msRouter.createWebRtcTransport(
      config.mediasoup.webRtcTransport
    );
    await transport.setMaxIncomingBitrate(
      config.mediasoup.webRtcTransport.maxIncomingBitrate
    );
    return {
      transport,
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      },
    };
  }

  const io = new Server(server, {
    cors: {
      origin: config.clientOrigin,
    },
  });

  let producerTransport: Transport;
  let consumerTransport: Transport;
  let producer: Producer;
  let consumer: Consumer;

  io.on("connection", (socket) => {
    console.log(`Client connected: socket.id=${socket.id}`);

    socket.on("disconnect", (reason) => {
      console.log(`Client disconnected: ${reason}`);
    });
    socket.on("getRouterRtpCapabilities", (callback) => {
      callback(msRouter.rtpCapabilities);
    });
    socket.on("createProducerTransport", async (callback) => {
      try {
        const { transport, params } = await createWebRtcTransport();
        producerTransport = transport;
        callback(params);
      } catch (err) {
        console.error(err);
        callback({ error: err.message });
      }
    });
    socket.on("createConsumerTransport", async (callback) => {
      try {
        const { transport, params } = await createWebRtcTransport();
        consumerTransport = transport;
        callback(params);
      } catch (err) {
        console.error(err);
        callback({ error: err.message });
      }
    });
    socket.on("connectProducerTransport", async (dtlsParameters, callback) => {
      await producerTransport.connect({ dtlsParameters });
      callback();
    });
    socket.on("connectConsumerTransport", async (dtlsParameters, callback) => {
      await consumerTransport.connect({ dtlsParameters });
      callback();
    });
    socket.on("produce", async ({ kind, rtpParameters }, callback) => {
      producer = await producerTransport.produce({ kind, rtpParameters });
      callback({ id: producer.id });
    });
    socket.on("consume", async (rtpCapabilities, callback) => {
      if (!msRouter.canConsume({ producerId: producer.id, rtpCapabilities })) {
        console.error("Can't consume");
        return callback();
      }
      try {
        consumer = await consumerTransport.consume({
          producerId: producer.id,
          rtpCapabilities,
          paused: producer.kind === "video",
        });
      } catch (err) {
        console.error(err);
        return callback();
      }
      if (consumer.type === "simulcast") {
        await consumer.setPreferredLayers({
          spatialLayer: 2,
          temporalLayer: 2,
        });
      }
      return callback({
        producerId: producer.id,
        id: consumer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        producerPaused: consumer.producerPaused,
      });
    });
    socket.on("resume", async (callback) => {
      await consumer.resume();
      callback();
    });
  });
}

main();
