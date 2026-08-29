import { createMiddleware } from "@tanstack/react-start";
import { auth } from "./client";

export const attachFirebaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = await auth.currentUser?.getIdToken();
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
