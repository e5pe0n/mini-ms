import { Box, Button, Flex } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { ConnectionState } from "mediasoup-client/lib/types";
import { CSSProperties, MouseEventHandler, useRef, useState } from "react";

import { PublicationState, SubscriptionState, useMs } from "./hooks";

const videoStyle: CSSProperties = {
  height: "200px",
  width: "360px",
};

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
  const [publicationState, setPublicationState] =
    useState<PublicationState>("disconnected");
  const [subscriptionState, setSubscriptionState] =
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

  const onPublishBtnClick: MouseEventHandler<HTMLButtonElement> = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    await ms.publish(stream, (state) => {
      switch (state) {
        case "connected":
          localVideoRef.current.srcObject = stream;
          break;
      }
      setPublicationState(state);
    });
  };

  const onSubscribeBtnClick: MouseEventHandler<
    HTMLButtonElement
  > = async () => {
    await ms.subscribe((state, stream) => {
      switch (state) {
        case "connected":
          remoteVideoRef.current.srcObject = stream;
          break;
      }
      setSubscriptionState(state);
    });
  };

  return (
    <Box p={8}>
      <Box>{data}</Box>
      <Box>connected: {ms.connected}</Box>
      <Flex gap={4}>
        <Box>
          <p>Local</p>
          <video
            style={videoStyle}
            controls
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
        <Button
          isDisabled={
            !(
              ms.connected &&
              (["disconnected", "failed"] as ConnectionState[]).includes(
                publicationState
              )
            )
          }
          onClick={onPublishBtnClick}
        >
          Start Webcam
        </Button>
        <span>connectionState: {publicationState}</span>
      </Flex>
      <Flex gap={4}>
        <Button
          isDisabled={
            !(
              ms.connected &&
              (["connected"] as ConnectionState[]).includes(publicationState) &&
              (["disconnected", "failed"] as ConnectionState[]).includes(
                subscriptionState
              )
            )
          }
          onClick={onSubscribeBtnClick}
        >
          Subscribe
        </Button>
        <span>connectionState: {subscriptionState}</span>
      </Flex>
    </Box>
  );
}

export default App;
