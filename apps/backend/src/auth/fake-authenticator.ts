import type { Authenticator } from "@marketplace/core";
import { z } from "zod";

const userIdSchema = z.uuid();

export class FakeAuthenticator implements Authenticator {
  async authenticate(request: Request) {
    const candidate = request.headers.get("x-demo-user-id");
    const result = userIdSchema.safeParse(candidate);
    return result.success
      ? { issuer: "https://fake.local/", subject: result.data }
      : null;
  }
}
