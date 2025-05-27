import { messageHandler } from "./event-handler";
import { GLOBAL_CONSTANTS } from "../global-constants";

export const events = [
  { event: GLOBAL_CONSTANTS.SOCKET_EVENTS.MESSAGE, handler: messageHandler },
  // Add more event configurations as needed
];
