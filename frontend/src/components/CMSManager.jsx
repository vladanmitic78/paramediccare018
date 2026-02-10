import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Switch } from '../components/ui/switch';
import { 
  FileText,
  Plus,
  Edit,
  Trash2,
  Save,
  Loader2,
  Image,
  Globe,
  Stethoscope,
  Ambulance,
  Info,
  CheckCircle,
  X,
  Home,
  PanelTop,
  PanelBottom,
  Lock,
  Upload,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const iconOptions = [
  'Siren', 'HeartPulse', 'Stethoscope', 'UserCheck', 'Ambulance', 
  'Building2', 'Home', 'Shield', 'Heart', 'Users', 'Clock', 'Target',
  'Phone', 'Mail', 'MapPin', 'Star', 'Award', 'CheckCircle'
];

// Section configuration per page - defines which sections are fixed vs addable
const PAGE_SECTIONS_CONFIG = {
  transport: {
    fixed: [
      { id: 'hero', name_sr: 'Glavni Baner', name_en: 'Hero Banner', desc_sr: 'Glavni naslov i slika na vrhu stranice', desc_en: 'Main title and image at the top of the page' },
      { id: 'transport-phone', name_sr: 'Telefon za Rezervacije', name_en: 'Booking Phone', desc_sr: 'Broj telefona pored dugmeta za rezervaciju', desc_en: 'Phone number next to booking button' },
      { id: 'emergency-phone', name_sr: 'Hitna Linija', name_en: 'Emergency Phone', desc_sr: 'Broj za hitne slučajeve u plutajućoj kartici', desc_en: 'Emergency number in floating card' },
      { id: 'services-title', name_sr: 'Naslov Usluga', name_en: 'Services Title', desc_sr: 'Naslov sekcije "Vrste Transporta"', desc_en: 'Title for "Transport Types" section' },
      { id: 'fleet', name_sr: 'Flota Vozila', name_en: 'Vehicle Fleet', desc_sr: 'Sekcija sa slikom i opisom flote', desc_en: 'Section with fleet image and description' },
      { id: 'cta', name_sr: 'Poziv na Akciju', name_en: 'Call to Action', desc_sr: 'Sekcija na dnu stranice sa dugmićima', desc_en: 'Bottom section with action buttons' },
    ],
    addable: [
      { prefix: 'service', name_sr: 'Kartica Usluge', name_en: 'Service Card', desc_sr: 'Kartica u sekciji "Vrste Transporta" (service-1, service-2...)', desc_en: 'Card in "Transport Types" section (service-1, service-2...)', max: 6 },
      { prefix: 'feature', name_sr: 'Karakteristika', name_en: 'Feature Icon', desc_sr: 'Ikonica u crvenoj traci (feature-1, feature-2...)', desc_en: 'Icon in the red bar (feature-1, feature-2...)', max: 6 },
    ]
  },
  home: {
    fixed: [
      { id: 'hero', name_sr: 'Glavni Baner', name_en: 'Hero Banner', desc_sr: 'Glavni naslov i slika na početnoj stranici', desc_en: 'Main title and image on homepage' },
      { id: 'cta', name_sr: 'Poziv na Akciju', name_en: 'Call to Action', desc_sr: 'Sekcija sa dugmićima za akciju', desc_en: 'Section with action buttons' },
    ],
    addable: [
      { prefix: 'service', name_sr: 'Kartica Usluge', name_en: 'Service Card', desc_sr: 'Kartica usluge na početnoj stranici', desc_en: 'Service card on homepage', max: 6 },
      { prefix: 'feature', name_sr: 'Karakteristika', name_en: 'Feature', desc_sr: 'Stavka u sekciji karakteristika', desc_en: 'Item in features section', max: 8 },
    ]
  },
  'medical-care': {
    fixed: [
      { id: 'hero', name_sr: 'Glavni Baner', name_en: 'Hero Banner', desc_sr: 'Glavni naslov stranice medicinske nege', desc_en: 'Main title of medical care page' },
      { id: 'cta', name_sr: 'Poziv na Akciju', name_en: 'Call to Action', desc_sr: 'Sekcija na dnu stranice', desc_en: 'Bottom section of page' },
    ],
    addable: [
      { prefix: 'service', name_sr: 'Medicinska Usluga', name_en: 'Medical Service', desc_sr: 'Kartica medicinske usluge', desc_en: 'Medical service card', max: 8 },
    ]
  },
  contact: {
    fixed: [
      { id: 'hero', name_sr: 'Glavni Baner', name_en: 'Hero Banner', desc_sr: 'Naslov kontakt stranice', desc_en: 'Contact page title' },
      { id: 'phone', name_sr: 'Telefon', name_en: 'Phone', desc_sr: 'Glavni broj telefona', desc_en: 'Main phone number' },
      { id: 'email', name_sr: 'Email', name_en: 'Email', desc_sr: 'Email adresa', desc_en: 'Email address' },
      { id: 'address', name_sr: 'Adresa', name_en: 'Address', desc_sr: 'Fizička adresa', desc_en: 'Physical address' },
      { id: 'hours', name_sr: 'Radno Vreme', name_en: 'Working Hours', desc_sr: 'Radno vreme', desc_en: 'Working hours' },
    ],
    addable: []
  },
  about: {
    fixed: [
      { id: 'hero', name_sr: 'Glavni Baner', name_en: 'Hero Banner', desc_sr: 'Naslov stranice o nama', desc_en: 'About page title' },
      { id: 'mission', name_sr: 'Misija', name_en: 'Mission', desc_sr: 'Naša misija', desc_en: 'Our mission' },
      { id: 'vision', name_sr: 'Vizija', name_en: 'Vision', desc_sr: 'Naša vizija', desc_en: 'Our vision' },
    ],
    addable: [
      { prefix: 'team', name_sr: 'Član Tima', name_en: 'Team Member', desc_sr: 'Profil člana tima', desc_en: 'Team member profile', max: 10 },
      { prefix: 'value', name_sr: 'Vrednost', name_en: 'Value', desc_sr: 'Naše vrednosti', desc_en: 'Our values', max: 6 },
    ]
  },
  header: {
    fixed: [
      { id: 'logo', name_sr: 'Logo', name_en: 'Logo', desc_sr: 'Logo sajta', desc_en: 'Website logo' },
      { id: 'company-name', name_sr: 'Naziv Firme', name_en: 'Company Name', desc_sr: 'Naziv koji se prikazuje u headeru', desc_en: 'Name displayed in header' },
    ],
    addable: []
  },
  footer: {
    fixed: [
      { id: 'copyright', name_sr: 'Copyright', name_en: 'Copyright', desc_sr: 'Tekst autorskih prava', desc_en: 'Copyright text' },
      { id: 'contact-info', name_sr: 'Kontakt Info', name_en: 'Contact Info', desc_sr: 'Kontakt informacije u footeru', desc_en: 'Contact information in footer' },
    ],
    addable: [
      { prefix: 'social', name_sr: 'Društvena Mreža', name_en: 'Social Link', desc_sr: 'Link na društvenu mrežu', desc_en: 'Social media link', max: 6 },
    ]
  }
};

const CMSManager = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [content, setContent] = useState([]);
  const [selectedPage, setSelectedPage] = useState('home');
  const [editingItem, setEditingItem] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    page: 'home',
    section: '',
    title_sr: '',
    title_en: '',
    subtitle_sr: '',
    subtitle_en: '',
    content_sr: '',
    content_en: '',
    features_sr: '',
    features_en: '',
    image_url: '',
    icon: '',
    order: 0,
    is_active: true
  });

  const isSuperAdmin = user?.role === 'superadmin';
  const fileInputRef = useRef(null);
  const [showAddGuide, setShowAddGuide] = useState(false);
  const [selectedAddType, setSelectedAddType] = useState(null);

  useEffect(() => {
    fetchContent();
  }, []);

  // Get page configuration
  const getPageConfig = (page) => PAGE_SECTIONS_CONFIG[page] || { fixed: [], addable: [] };
  
  // Check if a section is fixed (edit-only) or addable (can have multiples)
  const getSectionType = (page, section) => {
    const config = getPageConfig(page);
    const isFixed = config.fixed.some(f => f.id === section);
    if (isFixed) return 'fixed';
    
    const addableMatch = config.addable.find(a => section.startsWith(a.prefix));
    if (addableMatch) return 'addable';
    
    return 'custom';
  };

  // Get next available section number for addable types
  const getNextSectionNumber = (prefix) => {
    const existingSections = content.filter(c => 
      c.page === selectedPage && c.section.startsWith(prefix + '-')
    );
    const numbers = existingSections.map(c => {
      const match = c.section.match(new RegExp(`^${prefix}-(\\d+)$`));
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    return maxNum + 1;
  };

  // Check if section already exists
  const sectionExists = (section) => {
    return content.some(c => c.page === selectedPage && c.section === section);
  };

  const fetchContent = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/pages`);
      setContent(response.data);
    } catch (error) {
      console.error('Error fetching content:', error);
      // If no content, try to seed it
      if (error.response?.status === 404 || (Array.isArray(error.response?.data) && error.response.data.length === 0)) {
        await seedContent();
      }
    } finally {
      setLoading(false);
    }
  };

  const seedContent = async () => {
    try {
      await axios.post(`${API}/pages/seed`);
      await fetchContent();
      toast.success(language === 'sr' ? 'Sadržaj inicijalizovan' : 'Content initialized');
    } catch (error) {
      console.error('Error seeding content:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked) => {
    setFormData(prev => ({ ...prev, is_active: checked }));
  };

  const openAddDialog = () => {
    // Show the guided add dialog instead of direct form
    setShowAddGuide(true);
    setSelectedAddType(null);
  };

  // Handle selection from the add guide
  const handleAddTypeSelect = (type, config) => {
    if (type === 'fixed') {
      // Fixed section - should edit existing, not add new
      const existingItem = content.find(c => c.page === selectedPage && c.section === config.id);
      if (existingItem) {
        openEditDialog(existingItem);
        setShowAddGuide(false);
        return;
      }
      // If doesn't exist yet, create it
      setFormData({
        page: selectedPage,
        section: config.id,
        title_sr: config.name_sr,
        title_en: config.name_en,
        subtitle_sr: '',
        subtitle_en: '',
        content_sr: '',
        content_en: '',
        features_sr: '',
        features_en: '',
        image_url: '',
        icon: '',
        order: content.filter(c => c.page === selectedPage).length + 1,
        is_active: true
      });
    } else {
      // Addable section - auto-generate section name
      const nextNum = getNextSectionNumber(config.prefix);
      setFormData({
        page: selectedPage,
        section: `${config.prefix}-${nextNum}`,
        title_sr: '',
        title_en: '',
        subtitle_sr: '',
        subtitle_en: '',
        content_sr: '',
        content_en: '',
        features_sr: '',
        features_en: '',
        image_url: '',
        icon: '',
        order: content.filter(c => c.page === selectedPage).length + 1,
        is_active: true
      });
    }
    setShowAddGuide(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setFormData({
      page: item.page,
      section: item.section,
      title_sr: item.title_sr,
      title_en: item.title_en,
      subtitle_sr: item.subtitle_sr || '',
      subtitle_en: item.subtitle_en || '',
      content_sr: item.content_sr,
      content_en: item.content_en,
      features_sr: item.features_sr || '',
      features_en: item.features_en || '',
      image_url: item.image_url || '',
      icon: item.icon || '',
      order: item.order,
      is_active: item.is_active
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.section || !formData.title_sr || !formData.title_en) {
      toast.error(language === 'sr' ? 'Popunite obavezna polja' : 'Fill required fields');
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        await axios.put(`${API}/pages/${editingItem.id}`, formData);
        toast.success(language === 'sr' ? 'Sadržaj ažuriran' : 'Content updated');
      } else {
        await axios.post(`${API}/pages`, formData);
        toast.success(language === 'sr' ? 'Sadržaj dodat' : 'Content added');
      }
      setIsDialogOpen(false);
      fetchContent();
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error(language === 'sr' ? 'Greška pri čuvanju' : 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(language === 'sr' ? 'Da li ste sigurni?' : 'Are you sure?')) return;
    
    try {
      await axios.delete(`${API}/pages/${id}`);
      toast.success(language === 'sr' ? 'Sadržaj obrisan' : 'Content deleted');
      fetchContent();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error(language === 'sr' ? 'Greška pri brisanju' : 'Error deleting');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(language === 'sr' 
        ? 'Nedozvoljen tip fajla. Dozvoljeni: JPG, PNG, GIF, WEBP, SVG' 
        : 'Invalid file type. Allowed: JPG, PNG, GIF, WEBP, SVG');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(language === 'sr' 
        ? 'Fajl je prevelik. Maksimalna veličina je 5MB' 
        : 'File too large. Maximum size is 5MB');
      return;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await axios.post(`${API}/upload/image`, formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        // Build the full URL for the uploaded image
        const baseUrl = process.env.REACT_APP_BACKEND_URL;
        const fullUrl = `${baseUrl}${response.data.url}`;
        
        setFormData(prev => ({ ...prev, image_url: fullUrl }));
        toast.success(language === 'sr' ? 'Slika uspešno otpremljena' : 'Image uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(language === 'sr' 
        ? 'Greška pri otpremanju slike' 
        : 'Error uploading image');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Filter content: show ALL entries for the selected page (including inactive for admin visibility)
  const filteredContent = content.filter(c => c.page === selectedPage);

  // Admin pages: Home, Medical Care, Transport, About
  // Super Admin pages: All admin pages + Header, Footer
  const adminPages = [
    { id: 'home', label: language === 'sr' ? 'Početna' : 'Home', icon: Home, color: 'text-emerald-600' },
    { id: 'medical-care', label: language === 'sr' ? 'Medicinska Nega' : 'Medical Care', icon: Stethoscope, color: 'text-sky-600' },
    { id: 'transport', label: 'Transport', icon: Ambulance, color: 'text-red-600' },
    { id: 'contact', label: language === 'sr' ? 'Kontakt' : 'Contact', icon: Phone, color: 'text-green-600' },
    { id: 'about', label: language === 'sr' ? 'O Nama' : 'About Us', icon: Info, color: 'text-slate-600' },
  ];

  const superAdminOnlyPages = [
    { id: 'header', label: 'Header', icon: PanelTop, color: 'text-purple-600', superAdminOnly: true },
    { id: 'footer', label: 'Footer', icon: PanelBottom, color: 'text-purple-600', superAdminOnly: true },
  ];

  const pages = isSuperAdmin ? [...adminPages, ...superAdminOnlyPages] : adminPages;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="cms-manager">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {language === 'sr' ? 'Upravljanje Sadržajem' : 'Content Management'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {language === 'sr' 
              ? 'Uređujte tekstove na stranicama na srpskom i engleskom jeziku'
              : 'Edit page content in Serbian and English languages'}
          </p>
        </div>
        <Button onClick={openAddDialog} className="btn-primary gap-2" data-testid="add-content-btn">
          <Plus className="w-4 h-4" />
          {language === 'sr' ? 'Dodaj Sadržaj' : 'Add Content'}
        </Button>
      </div>

      {/* Page Tabs */}
      <div className="flex flex-wrap gap-2">
        {pages.map((page) => (
          <button
            key={page.id}
            onClick={() => setSelectedPage(page.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPage === page.id
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            data-testid={`page-tab-${page.id}`}
          >
            <page.icon className={`w-4 h-4 ${selectedPage === page.id ? 'text-white' : page.color}`} />
            {page.label}
            {page.superAdminOnly && (
              <Lock className="w-3 h-3 text-purple-400" />
            )}
          </button>
        ))}
      </div>

      {/* Super Admin Notice for Header/Footer */}
      {(selectedPage === 'header' || selectedPage === 'footer') && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center gap-3">
          <Lock className="w-5 h-5 text-purple-600" />
          <p className="text-sm text-purple-800">
            {language === 'sr' 
              ? 'Ova sekcija je dostupna samo Super Administratorima. Promene će uticati na sve stranice.' 
              : 'This section is only available to Super Admins. Changes will affect all pages.'}
          </p>
        </div>
      )}

      {/* Content List */}
      <div className="space-y-4">
        {filteredContent.length === 0 ? (
          <div className="card-base text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              {language === 'sr' ? 'Nema sadržaja za ovu stranicu' : 'No content for this page'}
            </p>
            <Button onClick={seedContent} variant="outline" className="mt-4">
              {language === 'sr' ? 'Inicijalizuj podrazumevani sadržaj' : 'Initialize default content'}
            </Button>
          </div>
        ) : (
          filteredContent.sort((a, b) => a.order - b.order).map((item) => (
            <div 
              key={item.id} 
              className={`card-base border-l-4 ${item.is_active ? 'border-l-emerald-500' : 'border-l-red-400 opacity-60 bg-slate-50'}`}
              data-testid={`content-item-${item.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="font-mono text-xs">{item.section}</Badge>
                    <Badge className={item.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}>
                      {item.is_active 
                        ? (language === 'sr' ? 'Aktivno' : 'Active')
                        : (language === 'sr' ? 'Neaktivno' : 'Inactive')}
                    </Badge>
                    {item.icon && <Badge variant="secondary">{item.icon}</Badge>}
                  </div>
                  
                  {/* Description - explains what this section controls */}
                  {(item.description_sr || item.description_en) && (
                    <p className="text-xs text-sky-600 bg-sky-50 px-2 py-1 rounded mb-3">
                      📍 {language === 'sr' ? item.description_sr : item.description_en}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Serbian */}
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <img src="https://flagcdn.com/w20/rs.png" alt="SR" className="w-4 h-3 rounded-sm" />
                        <span className="text-xs font-medium text-slate-500">Srpski</span>
                      </div>
                      <h4 className="font-semibold text-slate-900">{item.title_sr}</h4>
                      {item.subtitle_sr && <p className="text-sm text-slate-500">{item.subtitle_sr}</p>}
                      <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{item.content_sr}</p>
                      {item.features_sr && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <p className="text-xs text-slate-400 mb-1">{language === 'sr' ? 'Stavke:' : 'Features:'}</p>
                          <div className="flex flex-wrap gap-1">
                            {item.features_sr.split('|').map((f, i) => (
                              <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">✓ {f.trim()}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* English */}
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <img src="https://flagcdn.com/w20/gb.png" alt="EN" className="w-4 h-3 rounded-sm" />
                        <span className="text-xs font-medium text-slate-500">English</span>
                      </div>
                      <h4 className="font-semibold text-slate-900">{item.title_en}</h4>
                      {item.subtitle_en && <p className="text-sm text-slate-500">{item.subtitle_en}</p>}
                      <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{item.content_en}</p>
                      {item.features_en && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <p className="text-xs text-slate-400 mb-1">Features:</p>
                          <div className="flex flex-wrap gap-1">
                            {item.features_en.split('|').map((f, i) => (
                              <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">✓ {f.trim()}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {item.image_url && (
                    <div className="mt-3">
                      <img 
                        src={item.image_url} 
                        alt="" 
                        className="h-16 w-24 object-cover rounded-lg"
                      />
                    </div>
                  )}

                  <p className="text-xs text-slate-400 mt-3">
                    {language === 'sr' ? 'Poslednja izmena' : 'Last updated'}: {item.updated_at?.split('T')[0]} 
                    {item.updated_by && ` • ${item.updated_by}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(item)}
                    className="text-slate-600 hover:text-sky-600"
                    data-testid={`edit-btn-${item.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    className="text-slate-600 hover:text-red-600"
                    data-testid={`delete-btn-${item.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem 
                ? (language === 'sr' ? 'Izmeni Sadržaj' : 'Edit Content')
                : (language === 'sr' ? 'Dodaj Novi Sadržaj' : 'Add New Content')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {language === 'sr' ? 'Stranica' : 'Page'} *
                </label>
                <Select value={formData.page} onValueChange={(v) => handleSelectChange('page', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">{language === 'sr' ? 'Početna' : 'Home'}</SelectItem>
                    <SelectItem value="medical-care">{language === 'sr' ? 'Medicinska Nega' : 'Medical Care'}</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="contact">{language === 'sr' ? 'Kontakt' : 'Contact'}</SelectItem>
                    <SelectItem value="about">{language === 'sr' ? 'O Nama' : 'About Us'}</SelectItem>
                    {isSuperAdmin && (
                      <>
                        <SelectItem value="header">Header</SelectItem>
                        <SelectItem value="footer">Footer</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {language === 'sr' ? 'Sekcija' : 'Section'} *
                </label>
                <Input
                  name="section"
                  value={formData.section}
                  onChange={handleInputChange}
                  placeholder="hero, service-1, mission..."
                  data-testid="section-input"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {language === 'sr' ? 'Redosled' : 'Order'}
                </label>
                <Input
                  name="order"
                  type="number"
                  value={formData.order}
                  onChange={handleInputChange}
                  data-testid="order-input"
                />
                <p className="text-xs text-slate-400">
                  {language === 'sr' 
                    ? 'Manji broj = prikazuje se prvi na stranici (1 je na vrhu)'
                    : 'Lower number = appears first on page (1 is at top)'}
                </p>
              </div>
            </div>

            {/* Serbian Content */}
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-4">
                <img src="https://flagcdn.com/w20/rs.png" alt="SR" className="w-5 h-4 rounded-sm" />
                <span className="font-medium text-slate-900">Srpski (Serbian)</span>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Naslov *</label>
                    <Input
                      name="title_sr"
                      value={formData.title_sr}
                      onChange={handleInputChange}
                      placeholder="Naslov na srpskom"
                      data-testid="title-sr-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Podnaslov</label>
                    <Input
                      name="subtitle_sr"
                      value={formData.subtitle_sr}
                      onChange={handleInputChange}
                      placeholder="Podnaslov na srpskom"
                      data-testid="subtitle-sr-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Sadržaj *</label>
                  <Textarea
                    name="content_sr"
                    value={formData.content_sr}
                    onChange={handleInputChange}
                    placeholder="Tekst na srpskom jeziku..."
                    rows={4}
                    data-testid="content-sr-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Stavke / Bullet Points
                  </label>
                  <Input
                    name="features_sr"
                    value={formData.features_sr}
                    onChange={handleInputChange}
                    placeholder="Stavka 1|Stavka 2|Stavka 3 (odvojite sa |)"
                    data-testid="features-sr-input"
                  />
                  <p className="text-xs text-slate-400">Odvojite stavke sa | znakom</p>
                </div>
              </div>
            </div>

            {/* English Content */}
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
              <div className="flex items-center gap-2 mb-4">
                <img src="https://flagcdn.com/w20/gb.png" alt="EN" className="w-5 h-4 rounded-sm" />
                <span className="font-medium text-slate-900">English</span>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Title *</label>
                    <Input
                      name="title_en"
                      value={formData.title_en}
                      onChange={handleInputChange}
                      placeholder="Title in English"
                      data-testid="title-en-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Subtitle</label>
                    <Input
                      name="subtitle_en"
                      value={formData.subtitle_en}
                      onChange={handleInputChange}
                      placeholder="Subtitle in English"
                      data-testid="subtitle-en-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Content *</label>
                  <Textarea
                    name="content_en"
                    value={formData.content_en}
                    onChange={handleInputChange}
                    placeholder="Text in English..."
                    rows={4}
                    data-testid="content-en-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Features / Bullet Points
                  </label>
                  <Input
                    name="features_en"
                    value={formData.features_en}
                    onChange={handleInputChange}
                    placeholder="Feature 1|Feature 2|Feature 3 (separate with |)"
                    data-testid="features-en-input"
                  />
                  <p className="text-xs text-slate-400">Separate features with | character</p>
                </div>
              </div>
            </div>

            {/* Media & Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  {language === 'sr' ? 'Slika' : 'Image'}
                </label>
                <div className="flex gap-2">
                  <Input
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleInputChange}
                    placeholder={language === 'sr' ? 'URL slike ili otpremi...' : 'Image URL or upload...'}
                    className="flex-1"
                    data-testid="image-url-input"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                    className="hidden"
                    data-testid="image-file-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="shrink-0 gap-2"
                    data-testid="upload-image-btn"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {language === 'sr' ? 'Otpremi' : 'Upload'}
                  </Button>
                </div>
                {formData.image_url && (
                  <div className="mt-2 p-2 border border-slate-200 rounded-lg bg-slate-50">
                    <div className="flex items-start gap-3">
                      <img 
                        src={formData.image_url} 
                        alt="Preview" 
                        className="h-20 w-auto object-cover rounded"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 truncate max-w-xs">{formData.image_url}</p>
                        <Button 
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="mt-2"
                          onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                          data-testid="delete-image-btn"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          {language === 'sr' ? 'Obriši sliku' : 'Delete image'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {language === 'sr' ? 'Ikonica' : 'Icon'}
                </label>
                <Select value={formData.icon || "none"} onValueChange={(v) => handleSelectChange('icon', v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'sr' ? 'Izaberi ikonicu' : 'Select icon'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{language === 'sr' ? 'Bez ikonice' : 'No icon'}</SelectItem>
                    {iconOptions.map((icon) => (
                      <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Switch */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="font-medium text-slate-900">
                  {language === 'sr' ? 'Aktivno' : 'Active'}
                </p>
                <p className="text-sm text-slate-500">
                  {language === 'sr' 
                    ? 'Kada je ISKLJUČENO, sekcija neće biti vidljiva na javnoj stranici'
                    : 'When OFF, this section will NOT appear on the public page'}
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={handleSwitchChange}
                data-testid="active-switch"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {language === 'sr' ? 'Otkaži' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {language === 'sr' ? 'Sačuvaj' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Content Guide Dialog */}
      <Dialog open={showAddGuide} onOpenChange={setShowAddGuide}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-600" />
              {language === 'sr' ? 'Dodaj ili Izmeni Sadržaj' : 'Add or Edit Content'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Explanation */}
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
              <p className="text-sm text-sky-800">
                {language === 'sr' 
                  ? '📌 Fiksne sekcije mogu se samo MENJATI (postoji samo jedna od svake). Sekcije koje možete DODAVATI omogućavaju kreiranje više stavki.'
                  : '📌 Fixed sections can only be EDITED (only one of each exists). Addable sections allow you to CREATE multiple items.'}
              </p>
            </div>

            {/* Fixed Sections */}
            {getPageConfig(selectedPage).fixed.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  {language === 'sr' ? 'Fiksne Sekcije (samo izmena)' : 'Fixed Sections (edit only)'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getPageConfig(selectedPage).fixed.map((section) => {
                    const exists = sectionExists(section.id);
                    return (
                      <button
                        key={section.id}
                        onClick={() => handleAddTypeSelect('fixed', section)}
                        className={`p-4 border rounded-xl text-left transition-all hover:shadow-md ${
                          exists 
                            ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-400' 
                            : 'border-slate-200 bg-white hover:border-sky-400'
                        }`}
                        data-testid={`add-fixed-${section.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-900">
                              {language === 'sr' ? section.name_sr : section.name_en}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {language === 'sr' ? section.desc_sr : section.desc_en}
                            </p>
                          </div>
                          {exists ? (
                            <Badge className="bg-emerald-100 text-emerald-700 shrink-0">
                              <Edit className="w-3 h-3 mr-1" />
                              {language === 'sr' ? 'Izmeni' : 'Edit'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="shrink-0">
                              <Plus className="w-3 h-3 mr-1" />
                              {language === 'sr' ? 'Kreiraj' : 'Create'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 font-mono">section: {section.id}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Addable Sections */}
            {getPageConfig(selectedPage).addable.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  {language === 'sr' ? 'Sekcije koje možete dodavati' : 'Sections you can add'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getPageConfig(selectedPage).addable.map((section) => {
                    const existingCount = content.filter(c => 
                      c.page === selectedPage && c.section.startsWith(section.prefix + '-')
                    ).length;
                    const canAddMore = existingCount < section.max;
                    const nextNum = getNextSectionNumber(section.prefix);
                    
                    return (
                      <button
                        key={section.prefix}
                        onClick={() => canAddMore && handleAddTypeSelect('addable', section)}
                        disabled={!canAddMore}
                        className={`p-4 border rounded-xl text-left transition-all ${
                          canAddMore 
                            ? 'border-emerald-200 bg-white hover:border-emerald-400 hover:shadow-md' 
                            : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                        }`}
                        data-testid={`add-addable-${section.prefix}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-900">
                              {language === 'sr' ? section.name_sr : section.name_en}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {language === 'sr' ? section.desc_sr : section.desc_en}
                            </p>
                          </div>
                          {canAddMore ? (
                            <Badge className="bg-emerald-100 text-emerald-700 shrink-0">
                              <Plus className="w-3 h-3 mr-1" />
                              {language === 'sr' ? 'Dodaj' : 'Add'}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="shrink-0">
                              {language === 'sr' ? 'Maksimum' : 'Max'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs text-slate-400 font-mono">
                            {language === 'sr' ? 'Sledeća' : 'Next'}: {section.prefix}-{nextNum}
                          </p>
                          <span className="text-xs text-slate-400">•</span>
                          <p className="text-xs text-slate-400">
                            {existingCount}/{section.max} {language === 'sr' ? 'kreirano' : 'created'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Existing addable items - quick edit list */}
            {getPageConfig(selectedPage).addable.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  {language === 'sr' ? 'Postojeće stavke (kliknite za izmenu)' : 'Existing items (click to edit)'}
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {content
                    .filter(c => c.page === selectedPage && getPageConfig(selectedPage).addable.some(a => c.section.startsWith(a.prefix + '-')))
                    .sort((a, b) => a.order - b.order)
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          openEditDialog(item);
                          setShowAddGuide(false);
                        }}
                        className="w-full p-3 border border-slate-200 rounded-lg text-left hover:border-sky-400 hover:bg-sky-50 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge variant="outline" className="font-mono text-xs shrink-0">{item.section}</Badge>
                          <span className="text-sm text-slate-700 truncate">
                            {language === 'sr' ? item.title_sr : item.title_en}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!item.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              {language === 'sr' ? 'Neaktivno' : 'Inactive'}
                            </Badge>
                          )}
                          <Edit className="w-4 h-4 text-slate-400" />
                        </div>
                      </button>
                    ))}
                  {content.filter(c => c.page === selectedPage && getPageConfig(selectedPage).addable.some(a => c.section.startsWith(a.prefix + '-'))).length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">
                      {language === 'sr' ? 'Nema postojećih stavki' : 'No existing items'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGuide(false)}>
              {language === 'sr' ? 'Zatvori' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CMSManager;
