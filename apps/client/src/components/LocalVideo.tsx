import { Box } from "@chakra-ui/react";

export default function LocalVideo() {
  return (
    <Box>
      <p>Local</p>
      <video controls autoPlay playsInline></video>
    </Box>
  );
}
