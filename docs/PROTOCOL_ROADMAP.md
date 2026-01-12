# Protocol Roadmap - Open Social Hub
> Decentralized protocol integration strategy

## Protocol Overview

| Protocol | Purpose | Platforms | Priority |
|----------|---------|-----------|----------|
| **AT Protocol** | Bluesky ecosystem | Bluesky, future apps | P0 (Sprint 17) |
| **ActivityPub** | Fediverse (decentralized) | Mastodon, Pixelfed, PeerTube | P1 (Sprint 22) |
| **DSNP** | Decentralized social | Project Liberty apps | P2 (Sprint 24) |
| **SSB** | Peer-to-peer | Manyverse, Planetary | P3 (Future) |
| **Matrix** | Secure messaging | Element, bridges | P3 (Future) |

---

## Phase F: Decentralized Protocols (Sprints 22-26)

### Sprint 22: ActivityPub Implementation

**ActivityPub** - Fediverse standard used by Mastodon, Pixelfed, PeerTube

```typescript
// ActivityPub Actor structure
interface APActor {
  "@context": "https://www.w3.org/ns/activitystreams";
  type: "Person";
  id: string;           // https://instance.social/users/username
  inbox: string;        // https://instance.social/users/username/inbox
  outbox: string;       // https://instance.social/users/username/outbox
  followers: string;
  following: string;
  preferredUsername: string;
  name: string;
  publicKey: {
    id: string;
    owner: string;
    publicKeyPem: string;
  };
}

// ActivityPub Activity
interface APActivity {
  "@context": "https://www.w3.org/ns/activitystreams";
  type: "Create" | "Delete" | "Follow" | "Like" | "Announce";
  actor: string;
  object: APObject;
  to: string[];
  cc: string[];
}

interface APNote {
  type: "Note";
  id: string;
  content: string;
  attributedTo: string;
  published: string;
  attachment?: APAttachment[];
}
```

**Tasks:**
| Task | Description | Estimate |
|------|-------------|----------|
| AP-001 | HTTP Signature implementation for requests | M |
| AP-002 | WebFinger discovery (.well-known/webfinger) | S |
| AP-003 | Actor endpoint (JSON-LD responses) | M |
| AP-004 | Inbox/Outbox handlers | L |
| AP-005 | Follow/Unfollow activities | M |
| AP-006 | Create/Delete note activities | M |
| AP-007 | Instance discovery and registration | M |

**Capabilities:**
```python
class ActivityPubConnector(PlatformConnector):
    def get_capabilities(self) -> PlatformCapabilities:
        return PlatformCapabilities(
            can_publish=True,
            can_delete=True,
            can_read_timeline=True,
            can_read_mentions=True,
            can_read_metrics=False,  # Limited in AP
            can_search=True,  # Instance-specific
            max_text_length=500,  # Varies by instance
            supports_threads=True,
            auth_method='http_signature',
            rate_limits={'outbox': 300}  # Per 5 min, varies
        )
```

---

### Sprint 23: AT Protocol Deep Integration

**AT Protocol** - Bluesky's protocol for portable identity

Already started in Sprint 17, now adding advanced features:

```typescript
// AT Protocol Identity
interface ATIdentity {
  did: string;            // did:plc:xxxx or did:web:domain
  handle: string;         // user.bsky.social
  pds: string;            // Personal Data Server URL
  signingKey: string;
  recoveryKey: string;
}

// Lexicon record types
type ATRecordType =
  | 'app.bsky.feed.post'
  | 'app.bsky.feed.like'
  | 'app.bsky.feed.repost'
  | 'app.bsky.graph.follow'
  | 'app.bsky.actor.profile';
```

**Advanced Tasks:**
| Task | Description | Estimate |
|------|-------------|----------|
| AT-001 | DID resolution (plc, web) | M |
| AT-002 | PDS discovery and migration | L |
| AT-003 | Custom feed generator | XL |
| AT-004 | Labeler integration | M |
| AT-005 | Account portability support | L |

**Custom Feed Generator:**
```python
# Open Social Hub can become a Bluesky feed generator
class OSHFeedGenerator:
    """
    Generate custom feeds based on user's Feed Lab rules.
    Published to Bluesky as algorithmic feed.
    """
    async def get_feed_skeleton(
        self,
        user: str,
        cursor: str = None,
        limit: int = 50
    ) -> FeedSkeleton:
        # Apply user's Feed Lab rules
        rules = self.feed_lab.get_user_rules(user)
        posts = await self.fetch_candidates()
        scored = self.score_posts(posts, rules)
        return FeedSkeleton(feed=scored[:limit])
```

---

### Sprint 24: DSNP Foundation

**DSNP** - Decentralized Social Networking Protocol by Project Liberty

```typescript
// DSNP Message types
type DSNPMessageType =
  | 'Broadcast'       // Public posts
  | 'Reply'           // Replies to broadcasts
  | 'Reaction'        // Likes, etc.
  | 'Profile'         // Profile updates
  | 'GraphChange';    // Follow/unfollow

interface DSNPBroadcast {
  fromId: bigint;           // DSNP User ID
  contentHash: string;      // IPFS CID
  url: string;              // Content URL
  announcementType: number; // 2 = Broadcast
}

// DSNP uses blockchain for identity, IPFS for content
interface DSNPIdentity {
  dsnpId: bigint;
  handle: string;
  publicKey: Uint8Array;
  chain: 'frequency' | 'testnet';
}
```

**Tasks:**
| Task | Description | Estimate |
|------|-------------|----------|
| DSNP-001 | Frequency chain integration | L |
| DSNP-002 | IPFS content storage | M |
| DSNP-003 | Graph query service | M |
| DSNP-004 | Broadcast announcement | M |
| DSNP-005 | Identity creation flow | L |

**Capabilities:**
```python
class DSNPConnector(PlatformConnector):
    def get_capabilities(self) -> PlatformCapabilities:
        return PlatformCapabilities(
            can_publish=True,
            can_delete=False,  # Blockchain immutability
            can_read_timeline=True,
            can_read_mentions=True,
            can_read_metrics=False,
            can_search=False,  # Decentralized search TBD
            max_text_length=2000,
            supports_threads=True,
            auth_method='blockchain_signature',
            rate_limits={}  # Pay per transaction
        )
```

---

### Sprint 25-26: SSB & Matrix (Future)

**Secure Scuttlebutt (SSB)** - True P2P, offline-first

```typescript
// SSB Message format
interface SSBMessage {
  key: string;          // Hash of message
  value: {
    previous: string;   // Previous message hash
    author: string;     // Public key (feed ID)
    sequence: number;   // Message number in feed
    timestamp: number;
    hash: 'sha256';
    content: SSBContent;
    signature: string;
  };
}

// SSB stores data locally, syncs with peers
interface SSBPeer {
  feedId: string;
  address: string;      // net:host:port~shs:pubkey
  connections: SSBPeer[];
}
```

**Matrix** - Federated, encrypted messaging

```typescript
// Matrix room events
interface MatrixEvent {
  type: 'm.room.message' | 'm.room.create' | 'm.room.member';
  room_id: string;
  sender: string;       // @user:homeserver.org
  origin_server_ts: number;
  content: MatrixContent;
}

// Matrix identity
interface MatrixIdentity {
  user_id: string;      // @username:homeserver.org
  device_id: string;
  access_token: string;
  homeserver: string;
}
```

---

## Protocol Comparison Matrix

| Feature | ActivityPub | AT Protocol | DSNP | SSB | Matrix |
|---------|-------------|-------------|------|-----|--------|
| **Decentralization** | Federated | Federated | Blockchain | P2P | Federated |
| **Identity** | WebFinger | DID | Blockchain | Crypto keys | @user:server |
| **Portability** | Limited | Full | Full | Full (local) | Limited |
| **Delete posts** | Yes | Yes | No | No | Yes |
| **Encryption** | Optional | No | No | Yes | Yes (E2E) |
| **Offline** | No | No | No | Yes | No |
| **Media** | Yes | Yes | IPFS | Local | Yes |
| **Threads** | Yes | Yes | Yes | Yes | Yes |

---

## Implementation Priority

### Phase 1: Core Protocols (Sprints 17-18)
```
[DONE] Twitter (twscrape) - Read-only scraping
[TODO] Bluesky (AT Protocol) - Full integration
[TODO] Mastodon (ActivityPub) - Full integration
[TODO] Instagram (Graph API) - Read-only
```

### Phase 2: Advanced ActivityPub (Sprint 22)
```
[TODO] Generic ActivityPub connector
[TODO] Pixelfed support (images)
[TODO] PeerTube support (videos)
[TODO] Lemmy support (communities)
```

### Phase 3: Decentralized Identity (Sprint 23-24)
```
[TODO] AT Protocol DID management
[TODO] DSNP identity on Frequency
[TODO] Cross-protocol identity linking
```

### Phase 4: True Decentralization (Sprint 25-26)
```
[TODO] SSB local-first storage
[TODO] IPFS content addressing
[TODO] Matrix bridges
```

---

## Architecture Updates for Protocols

### New Components Needed

```
app/protocols/
├── __init__.py
├── activitypub/
│   ├── actor.py          # Actor management
│   ├── signatures.py     # HTTP signatures
│   ├── webfinger.py      # Discovery
│   └── inbox.py          # Activity processing
├── atprotocol/
│   ├── did.py            # DID resolution
│   ├── pds.py            # PDS client
│   ├── feeds.py          # Feed generators
│   └── labelers.py       # Content labeling
├── dsnp/
│   ├── frequency.py      # Blockchain client
│   ├── ipfs.py           # Content storage
│   └── graph.py          # Social graph
└── ssb/
    ├── feed.py           # Local feed
    ├── peers.py          # Peer discovery
    └── sync.py           # Replication
```

### Database Extensions

```sql
-- Protocol-specific tables
CREATE TABLE protocol_identities (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    protocol TEXT NOT NULL,           -- 'activitypub', 'atprotocol', 'dsnp', 'ssb'
    identity_data JSON NOT NULL,      -- Protocol-specific identity
    created_at INTEGER,
    UNIQUE(user_id, protocol)
);

CREATE TABLE federated_follows (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    protocol TEXT NOT NULL,
    remote_actor TEXT NOT NULL,       -- Full actor URI
    direction TEXT NOT NULL,          -- 'following', 'follower'
    created_at INTEGER
);

CREATE TABLE protocol_keys (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    protocol TEXT NOT NULL,
    key_type TEXT NOT NULL,           -- 'signing', 'encryption', 'recovery'
    public_key BLOB NOT NULL,
    encrypted_private_key BLOB,       -- Encrypted with master key
    created_at INTEGER
);
```

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `MASTER_ROADMAP.md` | Overall project roadmap |
| `chirp-connector-framework.md` | Connector architecture |
| `chirp-open-social-hub.md` | Vision and principles |
| `USER_STORIES.md` | Protocol user stories |
