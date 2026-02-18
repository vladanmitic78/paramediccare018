"""
CMS routes - /content/*, /pages/*, /gallery/*, /services/*, /upload/*
Handles: Content management, page content, gallery, services, file uploads
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from datetime import datetime, timezone
from typing import List
import uuid
import base64
import os

from config import db, logger
from models import (
    UserRole,
    ContentCreate, ContentResponse,
    PageContentCreate, PageContentResponse,
    ServiceCreate, ServiceResponse
)
from utils.auth import require_roles

router = APIRouter(tags=["CMS"])


# ============ CONTENT MANAGEMENT ============

@router.get("/content")
async def get_all_content():
    """Get all content items"""
    content = await db.content.find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    return content


@router.get("/content/{key}")
async def get_content(key: str):
    """Get content by key"""
    content = await db.content.find_one({"key": key}, {"_id": 0})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return content


@router.post("/content", response_model=ContentResponse)
async def create_content(content: ContentCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    """Create new content item"""
    content_id = str(uuid.uuid4())
    content_doc = {
        "id": content_id,
        **content.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.content.insert_one(content_doc)
    return ContentResponse(**{k: v for k, v in content_doc.items() if k != "_id"})


@router.put("/content/{content_id}", response_model=ContentResponse)
async def update_content(content_id: str, content: ContentCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    """Update content item"""
    update_doc = {**content.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.content.update_one({"id": content_id}, {"$set": update_doc})
    updated = await db.content.find_one({"id": content_id}, {"_id": 0})
    return ContentResponse(**updated)


@router.delete("/content/{content_id}")
async def delete_content(content_id: str, user: dict = Depends(require_roles([UserRole.SUPERADMIN]))):
    """Delete content item"""
    await db.content.delete_one({"id": content_id})
    return {"success": True}


# ============ PAGE CONTENT MANAGEMENT (CMS) ============

@router.get("/pages")
async def get_all_pages():
    """Get all page content"""
    content = await db.page_content.find({}, {"_id": 0}).sort([("page", 1), ("order", 1)]).to_list(1000)
    return content


@router.get("/pages/{page}")
async def get_page_content(page: str):
    """Get content for a specific page"""
    content = await db.page_content.find({"page": page, "is_active": True}, {"_id": 0}).sort("order", 1).to_list(1000)
    return content


@router.get("/pages/{page}/{section}")
async def get_page_section(page: str, section: str):
    """Get specific section content"""
    content = await db.page_content.find_one({"page": page, "section": section}, {"_id": 0})
    return content


@router.post("/pages", response_model=PageContentResponse)
async def create_page_content(content: PageContentCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    """Create new page content"""
    content_id = str(uuid.uuid4())
    content_doc = {
        "id": content_id,
        **content.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["full_name"]
    }
    await db.page_content.insert_one(content_doc)
    return PageContentResponse(**{k: v for k, v in content_doc.items() if k != "_id"})


@router.put("/pages/{content_id}", response_model=PageContentResponse)
async def update_page_content(content_id: str, content: PageContentCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    """Update page content"""
    update_doc = {
        **content.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["full_name"]
    }
    await db.page_content.update_one({"id": content_id}, {"$set": update_doc})
    updated = await db.page_content.find_one({"id": content_id}, {"_id": 0})
    return PageContentResponse(**updated)


@router.delete("/pages/{content_id}")
async def delete_page_content(content_id: str, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    """Delete page content"""
    await db.page_content.delete_one({"id": content_id})
    return {"success": True}


# ============ GALLERY MANAGEMENT ============

@router.get("/gallery")
async def get_gallery():
    """Get all gallery images"""
    images = await db.gallery.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return images


@router.post("/gallery")
async def add_gallery_image(
    image_url: str = Form(...),
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Add a new image to the gallery"""
    last_image = await db.gallery.find_one(sort=[("order", -1)])
    next_order = (last_image.get("order", 0) + 1) if last_image else 1
    
    image_id = str(uuid.uuid4())
    gallery_image = {
        "id": image_id,
        "image_url": image_url,
        "order": next_order,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("email", "unknown")
    }
    
    await db.gallery.insert_one(gallery_image)
    logger.info(f"Gallery image added: {image_id} by {user.get('email', 'unknown')}")
    
    return {"success": True, "id": image_id, "image_url": image_url, "order": next_order}


@router.delete("/gallery/{image_id}")
async def delete_gallery_image(
    image_id: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Delete a gallery image"""
    image = await db.gallery.find_one({"id": image_id})
    if not image:
        raise HTTPException(status_code=404, detail="Gallery image not found")
    
    await db.gallery.delete_one({"id": image_id})
    logger.info(f"Gallery image deleted: {image_id} by {user.get('email', 'unknown')}")
    
    return {"success": True, "message": "Gallery image deleted"}


@router.put("/gallery/reorder")
async def reorder_gallery(
    image_orders: List[dict],
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Reorder gallery images. Expects list of {id: string, order: number}"""
    for item in image_orders:
        await db.gallery.update_one(
            {"id": item["id"]},
            {"$set": {"order": item["order"]}}
        )
    logger.info(f"Gallery reordered by {user.get('email', 'unknown')}")
    return {"success": True, "message": "Gallery order updated"}


# ============ SERVICES MANAGEMENT ============

@router.get("/services")
async def get_services():
    """Get all services"""
    services = await db.services.find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    return services


@router.get("/services/{category}")
async def get_services_by_category(category: str):
    """Get services by category"""
    services = await db.services.find({"category": category, "is_active": True}, {"_id": 0}).sort("order", 1).to_list(1000)
    return services


@router.post("/services", response_model=ServiceResponse)
async def create_service(service: ServiceCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    """Create new service"""
    service_id = str(uuid.uuid4())
    service_doc = {"id": service_id, **service.model_dump()}
    await db.services.insert_one(service_doc)
    return ServiceResponse(**{k: v for k, v in service_doc.items() if k != "_id"})


@router.put("/services/{service_id}", response_model=ServiceResponse)
async def update_service(service_id: str, service: ServiceCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))):
    """Update service"""
    await db.services.update_one({"id": service_id}, {"$set": service.model_dump()})
    updated = await db.services.find_one({"id": service_id}, {"_id": 0})
    return ServiceResponse(**updated)


@router.delete("/services/{service_id}")
async def delete_service(service_id: str, user: dict = Depends(require_roles([UserRole.SUPERADMIN]))):
    """Delete service"""
    await db.services.delete_one({"id": service_id})
    return {"success": True}


# ============ FILE UPLOAD ============

UPLOAD_DIR = "/app/backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a file and return base64 encoded content"""
    try:
        content = await file.read()
        encoded = base64.b64encode(content).decode()
        file_id = str(uuid.uuid4())
        file_doc = {
            "id": file_id,
            "filename": file.filename,
            "content_type": file.content_type,
            "data": encoded,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
        await db.files.insert_one(file_doc)
        return {"id": file_id, "filename": file.filename, "content_type": file.content_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload/image")
async def upload_image(
    file: UploadFile = File(...),
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DOCTOR, UserRole.NURSE]))
):
    """Upload an image file and save to disk"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Generate unique filename
        ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        unique_filename = f"{uuid.uuid4()}.{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Generate URL path
        image_url = f"/api/uploads/{unique_filename}"
        
        # Log upload
        await db.file_uploads.insert_one({
            "id": str(uuid.uuid4()),
            "filename": unique_filename,
            "original_filename": file.filename,
            "content_type": file.content_type,
            "size": len(content),
            "url": image_url,
            "uploaded_by": user.get("email"),
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        })
        
        logger.info(f"Image uploaded: {unique_filename} by {user.get('email')}")
        
        return {
            "success": True,
            "url": image_url,
            "filename": unique_filename
        }
    except Exception as e:
        logger.error(f"Image upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.delete("/upload/image/{filename}")
async def delete_uploaded_image(
    filename: str,
    user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.SUPERADMIN]))
):
    """Delete an uploaded image"""
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        os.remove(file_path)
        await db.file_uploads.delete_one({"filename": filename})
        logger.info(f"Image deleted: {filename} by {user.get('email')}")
        return {"success": True, "message": "Image deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
