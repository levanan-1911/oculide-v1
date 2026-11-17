from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class NotificationItem(BaseModel):
    id: str
    title: str
    desc: str
    time: str
    type: str  # 'danger' | 'warning' | 'success' | 'info'
    read: bool = False
    link: str

class NotificationListResponse(BaseModel):
    notifications: List[NotificationItem]
    unread_count: int
