import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function getAdminApp() {
  if (getApps().length) return getApps()[0]!;
  const serviceAccount = process.env["FIREBASE_SERVICE_ACCOUNT"];
  if (!serviceAccount) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT env var.");
  return initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
}

export const requireFirebaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request?.headers) throw new Error("Unauthorized: No request headers.");

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized: No Bearer token.");

    const token = authHeader.slice(7);
    const adminApp = getAdminApp();
    const decoded = await getAuth(adminApp).verifyIdToken(token);

    return next({
      context: {
        userId: decoded.uid,
        db: getFirestore(adminApp),
        storage: getStorage(adminApp),
      },
    });
  },
);
