import { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  sr: {
    // Navigation
    nav_home: 'Početna',
    nav_medical: 'Medicinska Nega',
    nav_transport: 'Transport',
    nav_booking: 'Rezervacija',
    nav_about: 'O Nama',
    nav_contact: 'Kontakt',
    nav_login: 'Prijava',
    nav_dashboard: 'Kontrolna Tabla',
    nav_logout: 'Odjava',
    
    // Hero
    hero_title: 'Profesionalna Medicinska Nega i Transport',
    hero_subtitle: 'Pružamo vrhunsku hitnu medicinsku pomoć i siguran transport pacijenata širom Srbije. Dostupni smo 24/7.',
    hero_cta_booking: 'Zakažite Transport',
    hero_cta_contact: 'Kontaktirajte Nas',
    
    // Services
    services_title: 'Naše Usluge',
    services_subtitle: 'Pružamo kompletnu medicinsku negu i transport',
    
    // Medical Care
    medical_title: 'Medicinska Nega',
    medical_subtitle: 'Profesionalna medicinska pomoć i nega',
    medical_emergency: 'Hitna medicinska pomoć',
    medical_stabilization: 'Medicinska stabilizacija na licu mesta',
    medical_staff: 'Profesionalno medicinsko osoblje',
    
    // Transport
    transport_title: 'Transport',
    transport_subtitle: 'Siguran i pouzdan medicinski transport',
    transport_ambulance: 'Transport sanitetom',
    transport_hospital: 'Transport između bolnica',
    transport_home: 'Transport od kuće do bolnice',
    
    // Booking
    booking_title: 'Rezervacija Transporta',
    booking_subtitle: 'Zakažite medicinski transport brzo i jednostavno',
    booking_start: 'Polazna tačka',
    booking_end: 'Odredište',
    booking_date: 'Datum',
    booking_patient: 'Ime pacijenta',
    booking_phone: 'Telefon',
    booking_email: 'Email',
    booking_notes: 'Napomene',
    booking_documents: 'Dokumenta',
    booking_submit: 'Pošalji Rezervaciju',
    booking_success: 'Rezervacija uspešno poslata!',
    booking_select_map: 'Izaberite lokaciju na mapi',
    
    // About
    about_title: 'O Nama',
    about_subtitle: 'Paramedic Care 018 - Vaš partner u zdravlju',
    about_text: 'Paramedic Care 018 je vodeća kompanija za medicinski transport i hitnu pomoć u Srbiji. Sa sedištem u Nišu, pružamo profesionalne usluge širom zemlje.',
    about_mission: 'Naša Misija',
    about_mission_text: 'Pružiti najkvalitetniju medicinsku negu i transport, osiguravajući bezbednost i udobnost svakog pacijenta.',
    about_values: 'Naše Vrednosti',
    about_value_1: 'Profesionalnost',
    about_value_2: 'Pouzdanost',
    about_value_3: 'Empatija',
    about_value_4: 'Dostupnost 24/7',
    
    // Contact
    contact_title: 'Kontakt',
    contact_subtitle: 'Javite nam se',
    contact_name: 'Vaše ime',
    contact_email: 'Email adresa',
    contact_phone: 'Telefon',
    contact_message: 'Poruka',
    contact_submit: 'Pošalji Poruku',
    contact_success: 'Poruka uspešno poslata!',
    contact_address: 'Adresa',
    contact_company: 'Paramedics Care 018',
    
    // Footer
    footer_rights: 'Sva prava zadržana',
    footer_platform: 'Platforma',
    footer_license: 'Korišćeno pod licencom',
    footer_designed: 'Dizajnirao i razvio',
    
    // Auth
    auth_login: 'Prijava',
    auth_register: 'Registracija',
    auth_email: 'Email',
    auth_password: 'Lozinka',
    auth_name: 'Puno ime',
    auth_phone: 'Telefon',
    auth_submit_login: 'Prijavite se',
    auth_submit_register: 'Registrujte se',
    auth_no_account: 'Nemate nalog?',
    auth_have_account: 'Već imate nalog?',
    
    // Dashboard
    dashboard_title: 'Kontrolna Tabla',
    dashboard_bookings: 'Rezervacije',
    dashboard_users: 'Korisnici',
    dashboard_content: 'Sadržaj',
    dashboard_services: 'Usluge',
    dashboard_contacts: 'Kontakti',
    dashboard_stats: 'Statistika',
    
    // Common
    loading: 'Učitavanje...',
    error: 'Greška',
    success: 'Uspešno',
    save: 'Sačuvaj',
    cancel: 'Otkaži',
    delete: 'Obriši',
    edit: 'Izmeni',
    add: 'Dodaj',
    search: 'Pretraži',
    filter: 'Filter',
    status: 'Status',
    actions: 'Akcije',
    pending: 'Na čekanju',
    confirmed: 'Potvrđeno',
    in_progress: 'U toku',
    completed: 'Završeno',
    cancelled: 'Otkazano',
  },
  en: {
    // Navigation
    nav_home: 'Home',
    nav_medical: 'Medical Care',
    nav_transport: 'Transport',
    nav_booking: 'Booking',
    nav_about: 'About Us',
    nav_contact: 'Contact',
    nav_login: 'Login',
    nav_dashboard: 'Dashboard',
    nav_logout: 'Logout',
    
    // Hero
    hero_title: 'Professional Medical Care and Transport',
    hero_subtitle: 'We provide top-quality emergency medical assistance and safe patient transport across Serbia. Available 24/7.',
    hero_cta_booking: 'Book Transport',
    hero_cta_contact: 'Contact Us',
    
    // Services
    services_title: 'Our Services',
    services_subtitle: 'Complete medical care and transport solutions',
    
    // Medical Care
    medical_title: 'Medical Care',
    medical_subtitle: 'Professional medical assistance and care',
    medical_emergency: 'Emergency medical assistance',
    medical_stabilization: 'On-site medical stabilization',
    medical_staff: 'Professional medical staff',
    
    // Transport
    transport_title: 'Transport',
    transport_subtitle: 'Safe and reliable medical transport',
    transport_ambulance: 'Ambulance transport',
    transport_hospital: 'Hospital-to-hospital transport',
    transport_home: 'Home-to-hospital transport',
    
    // Booking
    booking_title: 'Book Transport',
    booking_subtitle: 'Schedule medical transport quickly and easily',
    booking_start: 'Starting Point',
    booking_end: 'Destination',
    booking_date: 'Date',
    booking_patient: 'Patient Name',
    booking_phone: 'Phone',
    booking_email: 'Email',
    booking_notes: 'Notes',
    booking_documents: 'Documents',
    booking_submit: 'Submit Booking',
    booking_success: 'Booking submitted successfully!',
    booking_select_map: 'Select location on map',
    
    // About
    about_title: 'About Us',
    about_subtitle: 'Paramedic Care 018 - Your Health Partner',
    about_text: 'Paramedic Care 018 is a leading medical transport and emergency services company in Serbia. Based in Niš, we provide professional services throughout the country.',
    about_mission: 'Our Mission',
    about_mission_text: 'To provide the highest quality medical care and transport, ensuring the safety and comfort of every patient.',
    about_values: 'Our Values',
    about_value_1: 'Professionalism',
    about_value_2: 'Reliability',
    about_value_3: 'Empathy',
    about_value_4: 'Availability 24/7',
    
    // Contact
    contact_title: 'Contact',
    contact_subtitle: 'Get in touch with us',
    contact_name: 'Your Name',
    contact_email: 'Email Address',
    contact_phone: 'Phone',
    contact_message: 'Message',
    contact_submit: 'Send Message',
    contact_success: 'Message sent successfully!',
    contact_address: 'Address',
    contact_company: 'Paramedics Care 018',
    
    // Footer
    footer_rights: 'All rights reserved',
    footer_platform: 'Website platform',
    footer_license: 'Used under license',
    footer_designed: 'Designed and developed by',
    
    // Auth
    auth_login: 'Login',
    auth_register: 'Register',
    auth_email: 'Email',
    auth_password: 'Password',
    auth_name: 'Full Name',
    auth_phone: 'Phone',
    auth_submit_login: 'Sign In',
    auth_submit_register: 'Sign Up',
    auth_no_account: "Don't have an account?",
    auth_have_account: 'Already have an account?',
    
    // Dashboard
    dashboard_title: 'Dashboard',
    dashboard_bookings: 'Bookings',
    dashboard_users: 'Users',
    dashboard_content: 'Content',
    dashboard_services: 'Services',
    dashboard_contacts: 'Contacts',
    dashboard_stats: 'Statistics',
    
    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    status: 'Status',
    actions: 'Actions',
    pending: 'Pending',
    confirmed: 'Confirmed',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'sr';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => {
    return translations[language][key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'sr' ? 'en' : 'sr');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
