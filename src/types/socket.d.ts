// types/socket.d.ts
import { Socket } from "socket.io";

import "socket.io";
import { User } from "../db/schema";


declare module "socket.io" {
  interface Socket {
    user: User;
  }
}



export interface AuthenticatedSocket extends Socket {
  user?: User | null;
}