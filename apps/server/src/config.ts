import {
  WorkerSettings,
  RouterOptions,
  TransportListenInfo,
} from "mediasoup/node/lib/types";
import path from "path";

type Config = {
  clientOrigin: string;
  port: number;
  sslCrt: string;
  sslKey: string;
  mediasoup: {
    worker: WorkerSettings;
    router: RouterOptions;
    webRtcTransport: {
      listenInfos: TransportListenInfo[];
      maxIncomingBitrate: number;
      initialAvailableOutgoingBitrate: number;
    };
  };
};

export const config = {
  clientOrigin: "http://localhost:5173",
  port: 3000,
  sslCrt: path.join(__dirname, "../../../localhost+1.pem"),
  sslKey: path.join(__dirname, "../../../localhost+1-key.pem"),
  mediasoup: {
    worker: {
      rtcMinPort: 10_000,
      rtcMaxPort: 10_100,
      logLevel: "warn",
      logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"],
    },
    router: {
      mediaCodecs: [
        {
          kind: "audio",
          mimeType: "audio/opus",
          clockRate: 48_000,
          channels: 2,
        },
        {
          kind: "video",
          mimeType: "video/VP8",
          clockRate: 90_000,
          parameters: {
            "x-google-start-bitrate": 1_000,
          },
        },
      ],
    },
    webRtcTransport: {
      listenInfos: [
        {
          protocol: "udp",
          ip: "127.0.0.1",
        },
      ],
      maxIncomingBitrate: 1_500_000,
      initialAvailableOutgoingBitrate: 1_000_000,
    },
  },
} satisfies Config;
