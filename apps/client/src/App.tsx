import { Box, Button, Flex } from "@chakra-ui/react";
import axios from "axios";
import type { ConnectionState } from "mediasoup-client/lib/types";
import { CSSProperties, MouseEventHandler, useRef, useState } from "react";

import { PublicationState, SubscriptionState, useMs } from "./hooks";

const videoStyle: CSSProperties = {
  height: "200px",
  width: "360px",
};

function App() {
  const [producerState, setProducerState] =
    useState<PublicationState>("disconnected");
  const [consumerState, setConsumerState] =
    useState<SubscriptionState>("disconnected");
  const localVideoRef = useRef<HTMLVideoElement>();
  const remoteVideoRef = useRef<HTMLVideoElement>();

  const ms = useMs();

  const onConnectBtnClick: MouseEventHandler<HTMLButtonElement> = () => {
    ms.connect();
  };

  const onDisconnectBtnClick: MouseEventHandler<
    HTMLButtonElement
  > = async () => {
    ms.disconnect();
  };

  const onStartWebcamBtnClick: MouseEventHandler<
    HTMLButtonElement
  > = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    await ms.produce(stream, (state) => {
      switch (state) {
        case "connected":
          localVideoRef.current.srcObject = stream;
          break;
      }
      setProducerState(state);
    });
  };

  const onStartDisplayBtnClick: MouseEventHandler<
    HTMLButtonElement
  > = async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });
    await ms.produce(stream, (state) => {
      switch (state) {
        case "connected":
          localVideoRef.current.srcObject = stream;
          break;
      }
      setProducerState(state);
    });
  };

  const onStopProduceBtnClick: MouseEventHandler<
    HTMLButtonElement
  > = async () => {
    await ms.unproduce();
  };

  const onConsumeBtnClick: MouseEventHandler<HTMLButtonElement> = async () => {
    await ms.consume((state, stream) => {
      switch (state) {
        case "connected":
          remoteVideoRef.current.srcObject = stream;
          break;
      }
      setConsumerState(state);
    });
  };

  const onStopConsumeBtnClick: MouseEventHandler<
    HTMLButtonElement
  > = async () => {
    await ms.unconsume();
  };

  const producing = !(
    ms.connected &&
    (["disconnected", "failed"] as ConnectionState[]).includes(producerState)
  );

  const consuming = !(
    ms.connected &&
    (["connected"] as ConnectionState[]).includes(producerState) &&
    (["disconnected", "failed"] as ConnectionState[]).includes(consumerState)
  );

  return (
    <Box p={8}>
      <Box>connected: {ms.connected}</Box>
      <Flex gap={4}>
        <Box>
          <p>Local</p>
          <video
            style={videoStyle}
            autoPlay
            playsInline
            ref={localVideoRef}
          ></video>
        </Box>
        <Box>
          <p>Remote</p>
          <video
            style={videoStyle}
            controls
            autoPlay
            playsInline
            ref={remoteVideoRef}
          ></video>
        </Box>
      </Flex>
      <Flex gap={4}>
        <Button isDisabled={ms.connected} onClick={onConnectBtnClick}>
          Connect
        </Button>
        <Button isDisabled={!ms.connected} onClick={onDisconnectBtnClick}>
          Disconnect
        </Button>
      </Flex>
      <Flex gap={4}>
        <Button isDisabled={producing} onClick={onStartWebcamBtnClick}>
          Start Webcam
        </Button>
        <Button isDisabled={producing} onClick={onStartDisplayBtnClick}>
          Start Display
        </Button>
        <Button isDisabled={!producing} onClick={onStopProduceBtnClick}>
          Stop Produce
        </Button>
        <span>connectionState: {producerState}</span>
      </Flex>
      <Flex gap={4}>
        <Button isDisabled={consuming} onClick={onConsumeBtnClick}>
          Consume
        </Button>
        <Button isDisabled={!consuming} onClick={onStopConsumeBtnClick}>
          Stop Consume
        </Button>
        <span>connectionState: {consumerState}</span>
      </Flex>
    </Box>
  );
}

export default App;
