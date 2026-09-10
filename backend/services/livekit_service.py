from livekit.api import AccessToken, VideoGrants
from datetime import timedelta
from typing import Optional, Dict
from core.config import settings
import requests

class LiveKitService:
    def __init__(self):
        self.base_url = settings.LIVEKIT_URL.replace('ws://', 'http://').replace('wss://', 'https://')
        self.api_key = settings.LIVEKIT_API_KEY
        self.api_secret = settings.LIVEKIT_API_SECRET

    def _generate_admin_token(self) -> str:
        token = AccessToken(self.api_key, self.api_secret)
        token.with_grants(VideoGrants(room_admin=True))
        return token.to_jwt()

    def create_room(self, room_name: str, empty_timeout: int = 300) -> Dict:
        """Khởi tạo LiveKit Room qua Twirp HTTP API"""
        try:
            url = f"{self.base_url}/twirp/livekit.RoomService/CreateRoom"
            headers = {
                "Authorization": f"Bearer {self._generate_admin_token()}",
                "Content-Type": "application/json"
            }
            data = {
                "name": room_name,
                "empty_timeout": empty_timeout,
                "max_participants": 150
            }
            response = requests.post(url, json=data, headers=headers, timeout=5)
            response.raise_for_status()
            result = response.json()
            return {
                "sid": result.get("sid"),
                "name": result.get("name"),
                "creation_time": result.get("creation_time"),
                "num_participants": result.get("num_participants", 0),
                "max_participants": result.get("max_participants")
            }
        except Exception as e:
            # Fallback for offline/local simulation
            return {
                "sid": f"sim_{room_name}",
                "name": room_name,
                "creation_time": None,
                "num_participants": 0,
                "max_participants": 150
            }

    def delete_room(self, room_name: str) -> bool:
        """Đóng LiveKit Room"""
        try:
            url = f"{self.base_url}/twirp/livekit.RoomService/DeleteRoom"
            headers = {
                "Authorization": f"Bearer {self._generate_admin_token()}",
                "Content-Type": "application/json"
            }
            data = {"room": room_name}
            response = requests.post(url, json=data, headers=headers, timeout=5)
            response.raise_for_status()
            return True
        except Exception:
            return False

    def generate_token(
        self,
        room_name: str,
        participant_identity: str,
        participant_name: Optional[str] = None,
        can_publish: bool = True,
        can_subscribe: bool = True
    ) -> str:
        """Tạo Access Token LiveKit cho sinh viên hoặc giám thị"""
        token = AccessToken(self.api_key, self.api_secret)
        token.with_identity(participant_identity)
        if participant_name:
            token.with_name(participant_name)
        
        token.with_grants(VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=can_publish,
            can_subscribe=can_subscribe,
            can_publish_data=True
        ))
        token.with_ttl(timedelta(hours=6))
        return token.to_jwt()

livekit_service = LiveKitService()
