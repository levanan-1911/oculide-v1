from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    def __init__(self):
        # Dictionary to store active connections: {room_id: {user_id: websocket}}
        self.active_connections: Dict[int, Dict[str, WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, room_id: int, user_id: str):
        user_id = str(user_id)
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
        self.active_connections[room_id][user_id] = websocket
        print(f"✅ User {user_id} connected to room {room_id}")
    
    def disconnect(self, websocket: WebSocket, room_id: int, user_id: str):
        user_id = str(user_id)
        if room_id in self.active_connections and user_id in self.active_connections[room_id]:
            del self.active_connections[room_id][user_id]
            print(f"❌ User {user_id} disconnected from room {room_id}")
            
            # Clean up empty rooms
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
    
    async def send_personal_message(self, message: str, room_id: int, user_id: str):
        user_id = str(user_id)
        if room_id in self.active_connections and user_id in self.active_connections[room_id]:
            websocket = self.active_connections[room_id][user_id]
            await websocket.send_text(message)
    
    async def broadcast(self, room_id: int, message: str):
        if room_id in self.active_connections:
            for user_id, connection in list(self.active_connections[room_id].items()):
                try:
                    await connection.send_text(message)
                except Exception as e:
                    print(f"Error sending to user {user_id}: {e}")
    
    async def broadcast_json(self, room_id: int, data: dict):
        message = json.dumps(data)
        await self.broadcast(room_id, message)
    
    def get_connected_users(self, room_id: int) -> List[str]:
        if room_id in self.active_connections:
            return list(self.active_connections[room_id].keys())
        return []
    
    def is_user_connected(self, room_id: int, user_id: str) -> bool:
        user_id = str(user_id)
        return (
            room_id in self.active_connections 
            and user_id in self.active_connections[room_id]
        )

# Global connection manager instance
manager = ConnectionManager()
