import { io } from "socket.io-client";
import { accountApi } from "./accountApi";
import { SOCKET_URL } from "./apiConfig";

const options = {
  transports: ["websocket"],
  withCredentials: true,
};

export const connectPublicSocket = () => io(SOCKET_URL, options);

export async function connectAuthenticatedSocket() {
  const { ticket } = await accountApi.socketTicket();
  return io(SOCKET_URL, { ...options, auth: { ticket } });
}
