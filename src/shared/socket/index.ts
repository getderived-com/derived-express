import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { GLOBAL_CONSTANTS } from "../global-constants";
import { events } from "./event-config";
import { decodeToken } from "../jwt/token-utils";

interface ClientMap {
  [userId: string]: string;
}

type EventHandler = (socket: Socket, ...args: any[]) => void;

interface EventConfig {
  event: string;
  handler: EventHandler;
}

class SocketManager {
  private io!: SocketIOServer;
  public clients: ClientMap = {};

  initialize(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*", // Allow all origins (for development purposes)
        methods: ["GET", "POST"],
      },
    });

    this.io.use(async (socket, next) => {
      const token = socket.handshake.query.auth as string;
      const user = decodeToken(token);
      if (!user) {
        return next(new Error("authentication error"));
      }
      this.clients[user.id] = socket.id;
    });

    this.io.on(GLOBAL_CONSTANTS.SOCKET_EVENTS.CONNECTION, (socket) =>
      this.handleConnection(socket),
    );
  }

  private handleConnection(socket: Socket): void {
    const _events: EventConfig[] = events;
    _events.forEach(({ event, handler }) => {
      socket.on(event, (...args: any[]) => handler(socket, ...args));
    });

    socket.on(GLOBAL_CONSTANTS.SOCKET_EVENTS.DISCONNECT, () => {
      // eslint-disable-next-line no-console
      console.log("User disconnected");
      const userId = Object.keys(this.clients).find(
        (key) => this.clients[key] === socket.id,
      );
      if (userId) {
        delete this.clients[userId];
      }
    });
  }

  sendNotification(userId: string, message: string): void {
    const socketId = this.clients[userId];
    if (!socketId) {
      return;
    }
    this.io
      .to(socketId)
      .emit(GLOBAL_CONSTANTS.SOCKET_EVENTS.NOTIFICATION, message);
  }
}

export const socketManager = new SocketManager();
