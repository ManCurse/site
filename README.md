# Secure Low-Latency Screen Share

This project is a fully functional frontend implementation of a secure,
low-latency screen sharing application. It uses a mock signaling server
that runs in-memory, allowing for a complete demonstration of the user flow
in a single browser (by opening two tabs).

This is a static-only project and can be run by serving the files with any simple web server.

---

## Architecture Overview

1.  **Frontend**: React 18, TypeScript, Tailwind CSS
    -   Manages UI, state, and user interactions.
    -   Handles all WebRTC logic for peer-to-peer media streaming.

2.  **Signaling**: Mock WebSocket Server (`mockSignalingService.ts`)
    -   This is an in-memory event emitter that simulates a real WebSocket server.
    -   It manages rooms, validates mock access keys, and relays WebRTC signaling messages (offers, answers, ICE candidates) between peers.
    -   This component is designed to be easily replaced by a real WebSocket client implementation without changing the core WebRTC logic.

3.  **Media Streaming**: WebRTC (`useWebRTC.ts` hook)
    -   `RTCPeerConnection` is used for direct peer-to-peer connection.
    -   `getDisplayMedia` API is used for screen and system audio capture.
    -   `RTCRtpSender.setParameters()` allows for dynamic quality adjustments (resolution, bitrate) without interrupting the stream.

---

## Core Features Implemented

-   Room-based sessions with a host and viewers.
-   Secure access via a unique Room ID and a one-time Access Key (mocked).
-   Ultra-low latency streaming.
-   Dynamic quality control (Native, 1440p, 1080p, 720p).
-   Guaranteed stream termination: The mock server immediately notifies viewers if the host closes their tab or loses connection.
-   Real-time stream statistics overlay (resolution, bitrate).
-   Responsive, modern UI with a dark theme.

---

## How to Test Manually (using two browser tabs)

1.  Open the application in a browser tab **(Tab A)**. This is the **HOST**.
2.  Click **"Create New Session"**.
3.  A Room ID and Access Key will be displayed. Click the copy icon for both.
4.  Click **"Start Screen Share"** and select a screen/window/tab to share in the browser prompt. You should see your screen preview.
5.  Open the application in a second browser tab **(Tab B)**. This is the **VIEWER**.
6.  Paste the Room ID and Access Key from Tab A into the join fields.
7.  Click **"Join Session"**.
8.  The screen share from Tab A should appear in Tab B with very low latency.
9.  In **Tab A (Host)**, use the quality selector dropdown to change the stream quality. Observe the change in the Stats Overlay in both tabs.
10. In **Tab A (Host)**, click **"Stop Sharing"**. The stream should immediately stop in Tab B, displaying a "Stream has ended" message.
11. Refresh **Tab A (Host)** to start a new session. Go back to Step 2. This time, after connecting the viewer, close the **HOST tab (Tab A)** directly.
12. Observe that the stream in Tab B stops within a few seconds, demonstrating the guaranteed termination feature.

---

## Backend API Contract (for a real implementation)

A real backend would replace `mockSignalingService.ts` and run on its own server (e.g., on port 2512).

### 1. REST API (e.g., HTTPS on port 2512)

**`POST /api/rooms`**

-   **Description**: Creates a new sharing room.
-   **Body**: `{}`
-   **Response (201 Created)**:
    ```json
    {
      "roomId": "unique-room-id",
      "token": "short-lived-jwt-or-hash"
    }
    ```

**`GET /api/rooms/:roomId/validate?token=:token`**

-   **Description**: Validates if a token is valid for a room.
-   **Response (200 OK)**: `{ "valid": true }`
-   **Response (401 Unauthorized)**: `{ "valid": false, "reason": "Invalid token" }`
-   **Response (404 Not Found)**: `{ "valid": false, "reason": "Room not found" }`

**`GET /api/ice-servers`**

-   **Description**: Provides STUN/TURN server configurations.
-   **Response (200 OK)**:
    ```json
    {
      "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" },
        {
          "urls": "turn:your-turn-server.com:3478",
          "username": "user",
          "credential": "password"
        }
      ]
    }
    ```

### 2. WebSocket API (e.g., WSS on port 2512)

-   **Connection URL**: `wss://your-domain:2512/ws?roomId=:roomId&token=:token`
-   The server validates the `roomId` and `token` on connection.

#### Client-to-Server Messages:

-   `{ "type": "webrtc-offer", "payload": { "sdp": "..." } }`
    (Sent by host to initiate connection with a new viewer)
-   `{ "type": "webrtc-answer", "payload": { "sdp": "..." } }`
    (Sent by viewer in response to an offer)
-   `{ "type": "webrtc-ice-candidate", "payload": { "candidate": "..." } }`
    (Sent by both host and viewer)

#### Server-to-Client Messages:

-   `{ "type": "viewer-joined", "payload": { "viewerId": "..." } }`
    (Sent to host when a new viewer connects)
-   `{ "type": "webrtc-offer", "payload": { "sdp": "..." } }`
    (Relayed from host to a specific viewer)
-   `{ "type": "webrtc-answer", "payload": { "sdp": "..." } }`
    (Relayed from a viewer to the host)
-   `{ "type": "webrtc-ice-candidate", "payload": { "candidate": "..." } }`
    (Relayed between peers)
-   `{ "type": "host-disconnected" }`
    (Sent to all viewers when the host's WebSocket disconnects)
-   `{ "type": "error", "payload": { "message": "..." } }`
