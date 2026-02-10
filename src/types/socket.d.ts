import "socket.io";
import { User } from "@supabase/supabase-js";

declare module "socket.io" {
  interface Socket {
    user: User;
  }
}
