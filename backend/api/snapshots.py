from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Dict, Any, List, Optional

from schemas.snapshot import SnapshotCreateRequest, SnapshotResponse
from core.permissions import get_current_user, instructor_or_admin_required
from database.snapshot_db import (
    create_snapshot,
    get_snapshots_by_session,
    get_latest_snapshot_by_student,
    get_snapshot_by_id
)
from database.session_db import get_session_by_id

router = APIRouter()

@router.post("", response_model=SnapshotResponse, status_code=status.HTTP_201_CREATED)
async def create_new_snapshot(
    snapshot_data: SnapshotCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lưu bản ghi ảnh chụp webcam định kỳ từ sinh viên vào bảng Snapshots"""
    session = get_session_by_id(snapshot_data.session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên làm bài")
        
    if current_user["role"] == "student" and session["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền tạo snapshot cho phiên của người khác")
        
    created = create_snapshot(
        session_id=snapshot_data.session_id,
        student_id=session["student_id"],
        image_url=snapshot_data.image_url,
        face_detected=snapshot_data.face_detected,
        face_count=snapshot_data.face_count,
        looking_at_screen=snapshot_data.looking_at_screen,
        confidence_score=snapshot_data.confidence_score
    )
    return created

@router.get("/session/{session_id}", response_model=List[SnapshotResponse])
async def list_session_snapshots(
    session_id: int,
    limit: int = Query(50, ge=1, le=200),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy danh sách ảnh chụp webcam định kỳ của phiên thi"""
    session = get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên làm bài")
        
    if current_user["role"] == "student" and session["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem snapshot của sinh viên khác")
        
    return get_snapshots_by_session(session_id, limit=limit)

@router.get("/session/{session_id}/student/{student_id}/latest", response_model=Optional[SnapshotResponse])
async def get_latest_student_snapshot(
    session_id: int,
    student_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy ảnh chụp webcam mới nhất của sinh viên trong phiên thi"""
    if current_user["role"] == "student" and student_id != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem snapshot của sinh viên khác")
        
    snapshot = get_latest_snapshot_by_student(session_id, student_id)
    if not snapshot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chưa có snapshot cho sinh viên này")
    return snapshot

@router.get("/{snapshot_id}", response_model=SnapshotResponse)
async def get_single_snapshot(
    snapshot_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy thông tin chi tiết một bản ghi snapshot"""
    snapshot = get_snapshot_by_id(snapshot_id)
    if not snapshot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bản ghi snapshot")
        
    if current_user["role"] == "student" and snapshot["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập snapshot này")
        
    return snapshot
