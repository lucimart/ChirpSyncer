# Platform Integrations

This document describes the social platform integrations available in ChirpSyncer, their capabilities, and use cases.

## Available Platforms (Active)

### Traditional Social Networks

| Platform | Auth Type | Publish | Read | Metrics | Media | Status |
|----------|-----------|---------|------|---------|-------|--------|
| **Twitter/X** | API Key / Scraper | ✅ | ✅ | ✅ | Images, Video, GIF | Available |
| **Bluesky** | AT Protocol | ✅ | ✅ | ✅ | Images | Available |
| **Mastodon** | OAuth 2.0 | ✅ | ✅ | ✅ | Images, Video, GIF | Beta |
| **Instagram** | OAuth 2.0 | ✅ | ✅ | ✅ | Images, Video | Beta |
| **Threads** | OAuth 2.0 | ✅ | ✅ | ✅ | Images, Video | Beta |
| **LinkedIn** | OAuth 2.0 | ✅ | ✅ | ✅ | Images, Video | Beta |
| **Facebook** | OAuth 2.0 | ✅ | ✅ | ✅ | Images, Video | Beta |

### Decentralized Protocols

| Protocol | Auth Type | Publish | Read | Interactions | Status |
|----------|-----------|---------|------|--------------|--------|
| **Nostr** | Keypair | ✅ | ✅ | Reactions, Reposts | Beta |
| **Matrix** | Access Token | ✅ | ✅ | Reactions | Beta |

---

## Decentralized Protocols Detail

### Nostr (Notes and Other Stuff Transmitted by Relays)

**Overview:**
Nostr is a decentralized social protocol where identity is based on cryptographic key pairs (public/private keys). Content is distributed through relays - servers that store and forward signed events.

**Key Concepts:**
- **Events**: All content (posts, reactions, follows) is a signed event
- **Relays**: Servers that receive, store, and forward events
- **Keys**: Your identity is your public key (npub), signing with private key (nsec)
- **NIPs**: Nostr Implementation Possibilities (protocol specifications)

**Supported NIPs:**
- NIP-01: Basic protocol (events, subscriptions)
- NIP-02: Contact list / Follow list
- NIP-05: DNS-based verification (user@domain.com)
- NIP-10: Reply conventions
- NIP-25: Reactions

**Use Cases in ChirpSyncer:**
1. **Cross-posting**: Publish to Nostr when posting to other platforms
2. **Content backup**: Archive posts from centralized platforms to decentralized Nostr
3. **Audience expansion**: Reach users who prefer decentralized platforms
4. **Censorship resistance**: Maintain presence even if banned elsewhere

**API Endpoints:**
```
GET  /api/v1/nostr/profile          # Get profile metadata
PUT  /api/v1/nostr/profile          # Update profile
GET  /api/v1/nostr/notes            # Get notes from relays
POST /api/v1/nostr/note             # Create a note
GET  /api/v1/nostr/note/:id         # Get specific note
DELETE /api/v1/nostr/note/:id       # Delete note (deletion event)
GET  /api/v1/nostr/note/:id/reactions
POST /api/v1/nostr/note/:id/react
POST /api/v1/nostr/note/:id/repost
GET  /api/v1/nostr/following
POST /api/v1/nostr/follow
GET  /api/v1/nostr/relays
GET  /api/v1/nostr/relays/info
```

**Configuration:**
```json
{
  "private_key": "hex or nsec format",
  "public_key": "hex or npub format (optional if private key provided)",
  "relays": ["wss://relay.damus.io", "wss://nos.lol"]
}
```

---

### Matrix (Open Standard for Decentralized Communication)

**Overview:**
Matrix is an open standard for decentralized, secure communication. It's designed for interoperability with bridges to other platforms.

**Key Concepts:**
- **Homeserver**: Server that hosts user accounts and rooms
- **Rooms**: Persistent, decentralized chat rooms with history
- **Events**: Messages, state changes, reactions
- **Bridges**: Connect Matrix to other platforms (IRC, Slack, Discord, etc.)

**Use Cases in ChirpSyncer:**
1. **Notifications**: Send activity notifications to Matrix rooms
2. **Cross-posting**: Broadcast social media posts to Matrix channels
3. **Team collaboration**: Share posts with team via Matrix rooms
4. **Webhook alternative**: Use Matrix as a more interactive webhook destination

**API Endpoints:**
```
GET  /api/v1/matrix/whoami          # Get authenticated user
GET  /api/v1/matrix/profile         # Get profile
PUT  /api/v1/matrix/profile         # Update profile
GET  /api/v1/matrix/rooms           # List joined rooms
GET  /api/v1/matrix/room/:id        # Get room details
POST /api/v1/matrix/room            # Create room
POST /api/v1/matrix/room/:id/join
POST /api/v1/matrix/room/:id/leave
GET  /api/v1/matrix/room/:id/messages
POST /api/v1/matrix/room/:id/send
POST /api/v1/matrix/room/:id/send/notice
POST /api/v1/matrix/room/:id/react
GET  /api/v1/matrix/sync
POST /api/v1/matrix/broadcast       # Send to multiple rooms
```

**Configuration:**
```json
{
  "homeserver": "https://matrix.org",
  "access_token": "your_access_token"
}
```

**Broadcast Feature:**
The broadcast endpoint is perfect for cross-posting social media content:
```json
POST /api/v1/matrix/broadcast
{
  "room_ids": ["!room1:matrix.org", "!room2:matrix.org"],
  "body": "New post from Twitter: ...",
  "formatted_body": "<p><strong>New post</strong>: ...</p>",
  "as_notice": true
}
```

---

## Coming Soon Platforms

### Video Platforms

| Platform | Description | Use Case |
|----------|-------------|----------|
| **TikTok** | Short-form video | Sync video content, analytics |
| **YouTube** | Long-form video + Shorts | Video publishing, community posts |

### Visual Platforms

| Platform | Description | Use Case |
|----------|-------------|----------|
| **Pinterest** | Visual discovery | Pin images, track saves |

### Community Platforms

| Platform | Description | Use Case |
|----------|-------------|----------|
| **Reddit** | Community discussions | Cross-post to subreddits |
| **Tumblr** | Microblogging | Multimedia posts |
| **Discord** | Community chat (webhooks) | Notifications to channels |

### Experimental Protocols

| Protocol | Description | Complexity | Use Case |
|----------|-------------|------------|----------|
| **DSNP** | Decentralized Social Networking Protocol (Frequency blockchain) | High | Web3 social identity |
| **SSB** | Secure Scuttlebutt (P2P, offline-first) | High | P2P social networking |

---

## Integration Architecture

### Platform Connector Pattern

All platforms follow a consistent pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                      ChirpSyncer Hub                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend Client        │  Backend API        │  Protocol   │
│  (lib/platform.ts)      │  (api/v1/platform)  │  Connector  │
│                         │                     │             │
│  - TypeScript types     │  - Flask Blueprint  │  - Raw API  │
│  - API Client class     │  - Auth handling    │    adapter  │
│  - React Query hooks    │  - Rate limiting    │             │
│  - Utility functions    │  - Error handling   │             │
└─────────────────────────────────────────────────────────────┘
```

### Sync Flow

```
User Post → ChirpSyncer → Platform APIs
                 ↓
         ┌──────┴──────┐
         ↓             ↓
    Twitter API    Nostr Relays
         ↓             ↓
    Bluesky AT     Matrix HS
         ↓             ↓
      (etc.)        (etc.)
```

---

## Authentication Methods

| Method | Platforms | Security |
|--------|-----------|----------|
| **OAuth 2.0** | Instagram, Threads, LinkedIn, Facebook, Mastodon | Tokens stored encrypted |
| **API Keys** | Twitter (paid), Discord webhooks | AES-256-GCM encryption |
| **AT Protocol** | Bluesky | App password, session refresh |
| **Keypair** | Nostr | Private key for signing |
| **Access Token** | Matrix | Homeserver token |
| **Session/Scraper** | Twitter (free) | Cookie-based |

---

## Configuration Examples

### Multi-Platform Cross-Post

```javascript
// Post to all connected platforms
async function crossPost(content, media) {
  const platforms = ['twitter', 'bluesky', 'threads', 'nostr', 'matrix'];

  const results = await Promise.allSettled(
    platforms.map(p => api.post(p, { content, media }))
  );

  return results;
}
```

### Notification Pipeline

```javascript
// Forward social activity to Matrix
const matrixRooms = ['!social:matrix.org'];

onNewMention((mention) => {
  matrixApi.broadcast({
    room_ids: matrixRooms,
    body: `New mention from @${mention.author}: ${mention.text}`,
    as_notice: true
  });
});
```

---

## Rate Limits & Best Practices

| Platform | Rate Limit | Best Practice |
|----------|------------|---------------|
| Twitter API | 50 tweets/day | Batch operations |
| Nostr | Per-relay (varies) | Use multiple relays |
| Matrix | Per-homeserver | Respect server limits |
| LinkedIn | 100 posts/day | Schedule distribution |
| Facebook | Varies by endpoint | Use batch API |

---

## Future Roadmap

1. **Q1 2025**: TikTok and YouTube integration
2. **Q2 2025**: Pinterest and Tumblr
3. **Q3 2025**: Reddit integration
4. **Q4 2025**: DSNP and SSB experimental support
