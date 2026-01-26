"""
CMS (Content Management System) Models
Pydantic models for content, page content, and services
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional


class ContentCreate(BaseModel):
    """Model for creating CMS content"""
    key: str
    title_sr: str
    title_en: str
    content_sr: str
    content_en: str
    image_url: Optional[str] = None
    category: str
    order: int = 0


class ContentResponse(BaseModel):
    """Model for CMS content response"""
    model_config = ConfigDict(extra="ignore")
    id: str
    key: str
    title_sr: str
    title_en: str
    content_sr: str
    content_en: str
    image_url: Optional[str] = None
    category: str
    order: int
    updated_at: str


class PageContentCreate(BaseModel):
    """Model for creating page content"""
    page: str  # medical-care, transport, about
    section: str  # hero, services, team, etc.
    title_sr: str
    title_en: str
    subtitle_sr: Optional[str] = None
    subtitle_en: Optional[str] = None
    content_sr: str
    content_en: str
    image_url: Optional[str] = None
    icon: Optional[str] = None
    order: int = 0
    is_active: bool = True


class PageContentResponse(BaseModel):
    """Model for page content response"""
    model_config = ConfigDict(extra="ignore")
    id: str
    page: str
    section: str
    title_sr: str
    title_en: str
    subtitle_sr: Optional[str] = None
    subtitle_en: Optional[str] = None
    content_sr: str
    content_en: str
    image_url: Optional[str] = None
    icon: Optional[str] = None
    order: int
    is_active: bool
    updated_at: str
    updated_by: Optional[str] = None


class ServiceCreate(BaseModel):
    """Model for creating a service"""
    name_sr: str
    name_en: str
    description_sr: str
    description_en: str
    icon: str
    category: str
    order: int = 0
    is_active: bool = True


class ServiceResponse(BaseModel):
    """Model for service response"""
    model_config = ConfigDict(extra="ignore")
    id: str
    name_sr: str
    name_en: str
    description_sr: str
    description_en: str
    icon: str
    category: str
    order: int
    is_active: bool
