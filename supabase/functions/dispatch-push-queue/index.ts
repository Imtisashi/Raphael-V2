import { createClient } from "@supabase/supabase-js";

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const FCM_TOKEN_URL = "https://oauth2.googleapis.com/token";
const PUSH_CHANNEL_ID = "booking-updates";
const MAX_BATCH_SIZE = 100;
const DEFAULT_BATCH_SIZE = 50;

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(
  JSON.stringify(body),
  {
    status,
    headers: {
      "Content-Type": "application/json",
      "Connection": "keep-alive",
    },
  },
);

const base64UrlEncode = (value: string | Uint8Array) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const privateKeyToArrayBuffer = (privateKey: string) => {
  const cleanKey = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(cleanKey);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
};

const signGoogleJwt = async (serviceAccount: Record<string, string>) => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: FCM_SCOPE,
    aud: FCM_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken),
  );
  return `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;
};

const getGoogleAccessToken = async (serviceAccount: Record<string, string>) => {
  const assertion = await signGoogleJwt(serviceAccount);
  const response = await fetch(FCM_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status} ${await response.text()}`);
  }

  const body = await response.json();
  if (!body.access_token) throw new Error("Google token exchange did not return an access token.");
  return body.access_token as string;
};

const compactError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 1000);
};

const deliveryData = (delivery: Record<string, unknown>, notification: Record<string, unknown>) => {
  const metadata = typeof notification.metadata === "object" && notification.metadata
    ? notification.metadata as Record<string, unknown>
    : {};
  const pairs: Record<string, unknown> = {
    ...metadata,
    notification_id: delivery.notification_id,
    appointment_id: notification.appointment_id,
    type: notification.type,
  };

  return Object.fromEntries(
    Object.entries(pairs)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      ]),
  );
};

const sendFcm = async (
  projectId: string,
  accessToken: string,
  delivery: Record<string, unknown>,
  notification: Record<string, unknown>,
) => {
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token: delivery.token,
        notification: {
          title: notification.title || "Booking update",
          body: notification.body || "Open Rapha'l to view the latest update.",
        },
        data: deliveryData(delivery, notification),
        android: {
          priority: "HIGH",
          notification: {
            channel_id: PUSH_CHANNEL_ID,
            click_action: "OPEN_NOTIFICATIONS",
            default_sound: true,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`FCM send failed: ${response.status} ${await response.text()}`);
  }
};

type CallerContext = {
  userId: string | null;
  canProcessAll: boolean;
};

const assertAuthorized = async (
  request: Request,
  adminClient: ReturnType<typeof createClient>,
  serviceRoleKey: string,
) => {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new HttpError(401, "Missing bearer token.");

  if (token === serviceRoleKey) return { userId: null, canProcessAll: true };

  const { data: authData, error: authError } = await adminClient.auth.getUser(token);
  if (authError || !authData.user) throw new HttpError(401, "Invalid user token.");

  const { data: profile, error: profileError } = await adminClient
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError) throw profileError;

  return {
    userId: authData.user.id,
    canProcessAll: profile?.role === "admin",
  };
};

const scopedNotificationIds = async (
  adminClient: ReturnType<typeof createClient>,
  caller: CallerContext,
  batchSize: number,
) => {
  if (caller.canProcessAll || !caller.userId) return null;

  const { data, error } = await adminClient
    .from("notifications")
    .select("id")
    .or(`recipient_id.eq.${caller.userId},actor_id.eq.${caller.userId}`)
    .order("created_at", { ascending: true })
    .limit(batchSize * 5);
  if (error) throw error;

  return (data || []).map((row) => row.id).filter(Boolean);
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return jsonResponse({ ok: true });
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const caller = await assertAuthorized(request, adminClient, serviceRoleKey);

    const serviceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      return jsonResponse({
        ok: false,
        reason: "missing_fcm_service_account",
        message: "Set FCM_SERVICE_ACCOUNT_JSON in Supabase Edge Function secrets to enable killed-app Android push.",
        processed: 0,
      });
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error("FCM_SERVICE_ACCOUNT_JSON must contain project_id, client_email, and private_key.");
    }

    const requestedBatchSize = Number(new URL(request.url).searchParams.get("limit") || Deno.env.get("PUSH_BATCH_SIZE"));
    const batchSize = Math.min(
      MAX_BATCH_SIZE,
      Math.max(1, Number.isFinite(requestedBatchSize) ? requestedBatchSize : DEFAULT_BATCH_SIZE),
    );

    const notificationIds = await scopedNotificationIds(adminClient, caller, batchSize);
    if (notificationIds && notificationIds.length === 0) {
      return jsonResponse({ ok: true, processed: 0, sent: 0, failed: 0, skipped: 0, scoped: true });
    }

    let deliveriesQuery = adminClient
      .from("notification_deliveries")
      .select("id, notification_id, recipient_id, device_token_id, token, attempt_count, notifications(title, body, type, metadata, appointment_id, actor_id, recipient_id)")
      .eq("status", "pending")
      .lt("attempt_count", 3)
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (notificationIds) deliveriesQuery = deliveriesQuery.in("notification_id", notificationIds);

    const { data: deliveries, error: deliveriesError } = await deliveriesQuery;
    if (deliveriesError) throw deliveriesError;

    if (!deliveries?.length) {
      return jsonResponse({ ok: true, processed: 0, sent: 0, failed: 0, skipped: 0 });
    }

    const accessToken = await getGoogleAccessToken(serviceAccount);
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const delivery of deliveries) {
      const attemptCount = Number(delivery.attempt_count || 0) + 1;
      const { data: claimed, error: claimError } = await adminClient
        .from("notification_deliveries")
        .update({
          status: "processing",
          attempt_count: attemptCount,
          last_attempted_at: new Date().toISOString(),
        })
        .eq("id", delivery.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (claimError || !claimed) {
        skipped += 1;
        continue;
      }

      const notification = Array.isArray(delivery.notifications)
        ? delivery.notifications[0]
        : delivery.notifications;

      try {
        if (!notification) throw new Error("Notification row was not found for delivery.");
        await sendFcm(serviceAccount.project_id, accessToken, delivery, notification);
        await adminClient
          .from("notification_deliveries")
          .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
          .eq("id", delivery.id);
        sent += 1;
      } catch (error) {
        const errorMessage = compactError(error);
        const terminalFailure = attemptCount >= 3;
        await adminClient
          .from("notification_deliveries")
          .update({
            status: terminalFailure ? "failed" : "pending",
            last_error: errorMessage,
          })
          .eq("id", delivery.id);

        if (/UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT/i.test(errorMessage) && delivery.device_token_id) {
          await adminClient
            .from("device_tokens")
            .update({ enabled: false, updated_at: new Date().toISOString() })
            .eq("id", delivery.device_token_id);
        }

        failed += 1;
      }
    }

    return jsonResponse({ ok: true, processed: deliveries.length, sent, failed, skipped });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({ ok: false, error: compactError(error) }, status);
  }
});
