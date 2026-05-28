"""Announcement management endpoints."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4
import logging

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..database import announcements_collection, teachers_collection

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/announcements",
    tags=["announcements"]
)


class AnnouncementPayload(BaseModel):
    """Announcement create/update payload."""

    message: str
    start_date: Optional[str] = None
    expiration_date: str


def parse_datetime(value: Optional[str], field_name: str, required: bool = False) -> Optional[datetime]:
    """Parse an ISO-like datetime string from the client."""
    if not value:
        if required:
            raise HTTPException(status_code=400, detail=f"{field_name} is required")
        return None

    try:
        return datetime.fromisoformat(value)
    except ValueError as error:
        logger.warning("Invalid %s provided for announcement: %s", field_name, value)
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}") from error


def require_teacher(teacher_username: Optional[str]) -> Dict[str, Any]:
    """Ensure the request is performed by a signed-in teacher."""
    if not teacher_username:
        raise HTTPException(status_code=401, detail="Authentication required for this action")

    teacher = teachers_collection.find_one({"_id": teacher_username})
    if not teacher:
        raise HTTPException(status_code=401, detail="Invalid teacher credentials")

    return teacher


def validate_payload(payload: AnnouncementPayload) -> Dict[str, Optional[str]]:
    """Validate announcement dates and message content."""
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    start_date = parse_datetime(payload.start_date, "start_date")
    expiration_date = parse_datetime(payload.expiration_date, "expiration_date", required=True)

    if start_date and expiration_date <= start_date:
        raise HTTPException(
            status_code=400,
            detail="Expiration date must be later than the start date"
        )

    return {
        "message": message,
        "start_date": payload.start_date or None,
        "expiration_date": payload.expiration_date,
    }


def is_active(announcement: Dict[str, Any], now: datetime) -> bool:
    """Return whether an announcement should currently be shown."""
    start_date = parse_datetime(announcement.get("start_date"), "start_date")
    expiration_date = parse_datetime(announcement.get("expiration_date"), "expiration_date", required=True)
    return expiration_date >= now and (start_date is None or start_date <= now)


def serialize_announcement(announcement: Dict[str, Any], now: Optional[datetime] = None) -> Dict[str, Any]:
    """Convert a Mongo announcement document into a JSON-safe dict."""
    current_time = now or datetime.utcnow()
    return {
        "id": announcement["_id"],
        "message": announcement["message"],
        "start_date": announcement.get("start_date"),
        "expiration_date": announcement["expiration_date"],
        "created_by": announcement.get("created_by"),
        "updated_at": announcement.get("updated_at"),
        "is_active": is_active(announcement, current_time),
    }


def list_announcements(include_inactive: bool = False) -> List[Dict[str, Any]]:
    """Fetch and sort announcements."""
    now = datetime.utcnow()
    serialized = [serialize_announcement(item, now) for item in announcements_collection.find({})]

    if not include_inactive:
        serialized = [item for item in serialized if item["is_active"]]

    return sorted(
        serialized,
        key=lambda item: (
            0 if item["is_active"] else 1,
            item["expiration_date"],
            item["start_date"] or ""
        )
    )


@router.get("", response_model=List[Dict[str, Any]])
@router.get("/", response_model=List[Dict[str, Any]])
def get_active_announcements() -> List[Dict[str, Any]]:
    """Get the announcements that should currently be displayed publicly."""
    return list_announcements(include_inactive=False)


@router.get("/manage", response_model=List[Dict[str, Any]])
def get_manageable_announcements(teacher_username: Optional[str] = Query(None)) -> List[Dict[str, Any]]:
    """Get all announcements for announcement management."""
    require_teacher(teacher_username)
    return list_announcements(include_inactive=True)


@router.post("", response_model=Dict[str, Any])
@router.post("/", response_model=Dict[str, Any])
def create_announcement(payload: AnnouncementPayload, teacher_username: Optional[str] = Query(None)) -> Dict[str, Any]:
    """Create a new announcement."""
    teacher = require_teacher(teacher_username)
    announcement_data = validate_payload(payload)
    announcement_document = {
        "_id": uuid4().hex,
        **announcement_data,
        "created_by": teacher["display_name"],
        "updated_at": datetime.utcnow().isoformat(timespec="minutes"),
    }

    announcements_collection.insert_one(announcement_document)
    return serialize_announcement(announcement_document)


@router.put("/{announcement_id}", response_model=Dict[str, Any])
def update_announcement(
    announcement_id: str,
    payload: AnnouncementPayload,
    teacher_username: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Update an existing announcement."""
    teacher = require_teacher(teacher_username)
    announcement_data = validate_payload(payload)
    updated_document = {
        **announcement_data,
        "created_by": teacher["display_name"],
        "updated_at": datetime.utcnow().isoformat(timespec="minutes"),
    }

    result = announcements_collection.update_one(
        {"_id": announcement_id},
        {"$set": updated_document}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")

    announcement = announcements_collection.find_one({"_id": announcement_id})
    return serialize_announcement(announcement)


@router.delete("/{announcement_id}", response_model=Dict[str, str])
def delete_announcement(announcement_id: str, teacher_username: Optional[str] = Query(None)) -> Dict[str, str]:
    """Delete an announcement."""
    require_teacher(teacher_username)
    result = announcements_collection.delete_one({"_id": announcement_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")

    return {"message": "Announcement deleted"}