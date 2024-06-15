import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.tsx";
import { SocketContext } from "./hooks.ts";
import { io } from "socket.io-client";

const queryClient = new QueryClient();

const socket = io("https://localhost:3000", { autoConnect: false });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>
        <SocketContext.Provider value={socket}>
          <App />
        </SocketContext.Provider>
      </ChakraProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
