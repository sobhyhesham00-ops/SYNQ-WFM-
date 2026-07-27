import { env } from "../../config/env";

/**
 * Issue a client token to join an Agora voice channel.
 *
 * TODO(provider: agora): replace this stub with real token generation using
 * `agora-token` (RtcTokenBuilder.buildTokenWithUid) signed by AGORA_APP_CERTIFICATE.
 * The backend must be the only place tokens are minted so joins can be authorized
 * (room membership, bans, ticketed access, language-lock rules).
 */
export function issueAgoraToken(channel: string, uid: string): { appId: string; channel: string; token: string; uid: string } {
  if (!env.agora.appId) {
    // Dev fallback so the app runs without Agora credentials.
    return { appId: "dev-app-id", channel, token: `dev-token:${channel}:${uid}`, uid };
  }
  // const token = RtcTokenBuilder.buildTokenWithUid(env.agora.appId, env.agora.appCertificate, channel, 0, RtcRole.PUBLISHER, ttl);
  return { appId: env.agora.appId, channel, token: "TODO-real-agora-token", uid };
}
