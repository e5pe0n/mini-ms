import { Box, Button, Flex } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import * as mediasoup from "mediasoup-client";
import type { ConnectionState, Device } from "mediasoup-client/lib/types";
import { MouseEventHandler, useRef, useState } from "react";

import { useSocket } from "./hooks";

async function helloWorld() {
  return await axios
    .get("https://localhost:3000/hello-world")
    .then((res) => res.data);
}

function App() {
  const { data } = useQuery({
    queryKey: ["hello-world"],
    queryFn: helloWorld,
  });
  const [socketId, setSocketId] = useState<string>();
  const [device, setDevice] = useState<Device>();
  const [
    producerTransportConnectionState,
    setProducerTransportConnectionState,
  ] = useState<ConnectionState>("disconnected");
  const [
    consumerTransportConnectionState,
    setConsumerTransportConnectionState,
  ] = useState<ConnectionState>("disconnected");
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const socketConnected = socketId !== undefined;

  const socket = useSocket();
  socket.on("connect", async () => {
    console.log(`Connected to server: socket.id=${socket.id}`);
    setSocketId(socket.id);
    const rtpCapabilities = await socket.req("getRouterRtpCapabilities");
    console.log({ rtpCapabilities });
    const device = new mediasoup.Device();
    await device.load({ routerRtpCapabilities: rtpCapabilities });
    setDevice(device);
  });
  socket.on("disconnect", (reason, description) => {
    console.log(`Disconnected from server: ${reason}`);
    console.log(description);
    setSocketId(undefined);
  });

  const onConnectBtnClick: MouseEventHandler<HTMLButtonElement> = async () => {
    socket.connect();
  };

  const onDisconnectBtnClick: MouseEventHandler<
    HTMLButtonElement
  > = async () => {
    socket.disconnect();
  };

  const onPublishBtnClick: MouseEventHandler<HTMLButtonElement> = async () => {
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

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const track = stream.getVideoTracks()[0];

    transport.on("connectionstatechange", (state) => {
      switch (state) {
        case "connected":
          localVideoRef.current.srcObject = stream;
          break;
        case "failed":
          transport.close();
          break;
      }
      setProducerTransportConnectionState(state);
    });
    console.log({ track });

    const producer = transport.produce({ track });
    console.log({ producer });
  };

  const onSubscribeBtnClick: MouseEventHandler<
    HTMLButtonElement
  > = async () => {
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

    const consumerOptions = await socket.req("consume", device.rtpCapabilities);
    console.log({ consumerOptions });
    const consumer = await transport.consume(consumerOptions);
    console.log({ consumer });

    const stream = new MediaStream();
    stream.addTrack(consumer.track);

    transport.on("connectionstatechange", async (state) => {
      switch (state) {
        case "connected":
          remoteVideoRef.current.srcObject = stream;
          await socket.req("resume");
          break;
        case "failed":
          transport.close();
          break;
      }
      setConsumerTransportConnectionState(state);
    });
  };

  return (
    <Box p={8}>
      <Box>{data}</Box>
      <Box>socketId: {socketId}</Box>
      <Flex gap={4}>
        <Box>
          <p>Local</p>
          <video controls autoPlay playsInline ref={localVideoRef}></video>
        </Box>
        <Box>
          <p>Remote</p>
          <video controls autoPlay playsInline ref={remoteVideoRef}></video>
        </Box>
      </Flex>
      <Flex gap={4}>
        <Button isDisabled={socketConnected} onClick={onConnectBtnClick}>
          Connect
        </Button>
        <Button isDisabled={!socketConnected} onClick={onDisconnectBtnClick}>
          Disconnect
        </Button>
      </Flex>
      <Flex gap={4}>
        <Button
          isDisabled={
            !(
              socketConnected &&
              (["disconnected", "failed"] as ConnectionState[]).includes(
                producerTransportConnectionState
              )
            )
          }
          onClick={onPublishBtnClick}
        >
          Start Webcam
        </Button>
        <span>connectionState: {producerTransportConnectionState}</span>
      </Flex>
      <Flex gap={4}>
        <Button
          isDisabled={
            !(
              socketConnected &&
              (["connected"] as ConnectionState[]).includes(
                producerTransportConnectionState
              ) &&
              (["disconnected", "failed"] as ConnectionState[]).includes(
                consumerTransportConnectionState
              )
            )
          }
          onClick={onSubscribeBtnClick}
        >
          Subscribe
        </Button>
        <span>connectionState: {consumerTransportConnectionState}</span>
      </Flex>
    </Box>
  );
}

export default App;
