from pydantic import BaseModel
from typing import Optional, List

class LiveKitTokenRequest(BaseModel):
    room_id: int

class LiveKitTokenResponse(BaseModel):
    token: str
    server_url: str
    participant_identity: str
    room_name: str

class LiveKitRoomResponse(BaseModel):
    room_name: str
    num_participants: int = 0
    creation_time: Optional[int] = None
