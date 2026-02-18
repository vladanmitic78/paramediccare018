import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Plus, Trash2, Image, Upload, Loader2, GripVertical } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const GalleryManager = () => {
  const { language } = useLanguage();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const fetchGallery = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/api/gallery`);
      setImages(response.data || []);
    } catch (error) {
      console.error('Failed to fetch gallery:', error);
      toast.error(language === 'sr' ? 'Greška pri učitavanju galerije' : 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error(language === 'sr' ? 'Molimo izaberite sliku' : 'Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(language === 'sr' ? 'Slika ne sme biti veća od 5MB' : 'Image must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const token = localStorage.getItem('token');

    try {
      // First upload the image
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await axios.post(`${API}/api/upload/image`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const imageUrl = uploadResponse.data.url;

      // Then add to gallery
      const galleryFormData = new FormData();
      galleryFormData.append('image_url', imageUrl);

      await axios.post(`${API}/api/gallery`, galleryFormData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(language === 'sr' ? 'Slika je uspešno dodata' : 'Image added successfully');
      setSelectedFile(null);
      setPreviewUrl(null);
      fetchGallery();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(language === 'sr' ? 'Greška pri dodavanju slike' : 'Failed to add image');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm(language === 'sr' ? 'Da li ste sigurni da želite da obrišete ovu sliku?' : 'Are you sure you want to delete this image?')) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API}/api/gallery/${imageId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success(language === 'sr' ? 'Slika je obrisana' : 'Image deleted');
      fetchGallery();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(language === 'sr' ? 'Greška pri brisanju slike' : 'Failed to delete image');
    }
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="gallery-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image className="w-6 h-6 text-sky-500" />
          <h2 className="text-xl font-semibold text-slate-800">
            {language === 'sr' ? 'Galerija' : 'Gallery'}
          </h2>
          <span className="text-sm text-slate-500">
            ({images.length} {language === 'sr' ? 'slika' : 'images'})
          </span>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h3 className="text-sm font-medium text-slate-700 mb-4">
          {language === 'sr' ? 'Dodaj novu sliku' : 'Add New Image'}
        </h3>

        {!previewUrl ? (
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-sky-400 hover:bg-sky-50/50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-10 h-10 text-slate-400 mb-3" />
              <p className="text-sm text-slate-500">
                {language === 'sr' ? 'Kliknite za izbor slike' : 'Click to select image'}
              </p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP (max 5MB)</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
              data-testid="gallery-file-input"
            />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="relative w-full h-48 rounded-xl overflow-hidden bg-slate-200">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 bg-sky-500 hover:bg-sky-600"
                data-testid="gallery-upload-btn"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'sr' ? 'Dodavanje...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {language === 'sr' ? 'Dodaj u galeriju' : 'Add to Gallery'}
                  </>
                )}
              </Button>
              <Button
                onClick={cancelUpload}
                variant="outline"
                disabled={uploading}
              >
                {language === 'sr' ? 'Otkaži' : 'Cancel'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      {images.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <Image className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">
            {language === 'sr' ? 'Nema slika u galeriji' : 'No images in gallery'}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {language === 'sr' ? 'Dodajte slike iznad' : 'Add images above'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="group relative aspect-square rounded-xl overflow-hidden bg-slate-200 shadow-sm hover:shadow-md transition-shadow"
              data-testid={`gallery-item-${index}`}
            >
              <img
                src={image.image_url}
                alt={`Gallery ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Overlay with delete button */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  onClick={() => handleDelete(image.id)}
                  variant="destructive"
                  size="sm"
                  className="bg-red-500 hover:bg-red-600"
                  data-testid={`gallery-delete-${index}`}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {language === 'sr' ? 'Obriši' : 'Delete'}
                </Button>
              </div>
              {/* Order badge */}
              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GalleryManager;
