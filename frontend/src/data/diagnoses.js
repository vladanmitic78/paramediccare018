// ICD-10 Diagnoses for EMS - Bilingual (English/Serbian)
// Updated: January 28, 2026 - Full ICD-10 EMS-relevant codes

export const diagnoses = [
  // ============ Circulatory System / Sistem krvotoka ============
  { code: "I10", name_en: "Essential hypertension", name_sr: "Esencijalna hipertenzija", desc_en: "High blood pressure", desc_sr: "Povišen krvni pritisak", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "hypertension,blood pressure", keywords_sr: "hipertenzija,pritisak" },
  { code: "I11", name_en: "Hypertensive heart disease", name_sr: "Hipertenzivna bolest srca", desc_en: "Heart disease due to hypertension", desc_sr: "Bolest srca zbog hipertenzije", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "hypertensive heart", keywords_sr: "hipertenzija srce" },
  { code: "I20", name_en: "Angina pectoris", name_sr: "Angina pektoris", desc_en: "Ischemic chest pain", desc_sr: "Ishemijski bol u grudima", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "angina,chest pain", keywords_sr: "angina,bol u grudima" },
  { code: "I21", name_en: "Acute myocardial infarction", name_sr: "Akutni infarkt miokarda", desc_en: "Heart attack", desc_sr: "Srčani udar", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "heart attack,MI,AMI", keywords_sr: "infarkt,srčani udar" },
  { code: "I24", name_en: "Other acute ischemic heart disease", name_sr: "Akutna ishemijska bolest srca", desc_en: "Acute cardiac ischemia", desc_sr: "Akutna ishemija srca", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "acute ischemia,cardiac ischemia", keywords_sr: "ishemija,akutna ishemija" },
  { code: "I25", name_en: "Chronic ischemic heart disease", name_sr: "Hronična ishemijska bolest srca", desc_en: "Chronic heart ischemia", desc_sr: "Hronična ishemija srca", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "ischemic heart,chronic ischemia", keywords_sr: "hronična ishemija" },
  { code: "I26", name_en: "Pulmonary embolism", name_sr: "Plućna embolija", desc_en: "Clot in pulmonary artery", desc_sr: "Ugrušak u plućnoj arteriji", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "pulmonary embolism,PE,clot", keywords_sr: "embolija pluća,ugrušak" },
  { code: "I44", name_en: "Atrioventricular block", name_sr: "AV blok", desc_en: "Pulse conduction disorder", desc_sr: "Poremećaj provođenja srca", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "heart block,AV block,conduction", keywords_sr: "AV blok,blok srca" },
  { code: "I46", name_en: "Cardiac arrest", name_sr: "Srčani zastoj", desc_en: "Sudden cardiac arrest", desc_sr: "Iznenadni srčani zastoj", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "cardiac arrest,CPR,resuscitation", keywords_sr: "srčani zastoj,reanimacija" },
  { code: "I47", name_en: "Paroxysmal tachycardia", name_sr: "Paroksizmalna tahikardija", desc_en: "Rapid heart rhythm", desc_sr: "Ubrzan rad srca", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "tachycardia,rapid heart,SVT", keywords_sr: "tahikardija,ubrzan puls" },
  { code: "I48", name_en: "Atrial fibrillation", name_sr: "Atrijalna fibrilacija", desc_en: "Irregular heart rhythm", desc_sr: "Nepravilan srčani ritam", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "AF,arrhythmia,irregular heart", keywords_sr: "fibrilacija,aritmija" },
  { code: "I50", name_en: "Heart failure", name_sr: "Srčana insuficijencija", desc_en: "Failure of heart pump function", desc_sr: "Slabost rada srca", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "heart failure,CHF,weak heart", keywords_sr: "slabo srce,insuficijencija" },
  { code: "I60", name_en: "Subarachnoid hemorrhage", name_sr: "Subarahnoidalno krvarenje", desc_en: "Brain bleeding", desc_sr: "Krvarenje u mozgu", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "brain bleed,SAH,subarachnoid", keywords_sr: "krvarenje mozak,SAH" },
  { code: "I61", name_en: "Intracerebral hemorrhage", name_sr: "Intracerebralno krvarenje", desc_en: "Hemorrhagic stroke", desc_sr: "Hemoragijski moždani udar", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "hemorrhagic stroke,brain hemorrhage", keywords_sr: "hemoragija,krvarenje u mozgu" },
  { code: "I63", name_en: "Cerebral infarction", name_sr: "Moždani infarkt", desc_en: "Ischemic stroke", desc_sr: "Ishemijski moždani udar", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "stroke,CVA,ischemic stroke", keywords_sr: "šlog,moždani udar" },
  { code: "I64", name_en: "Stroke NOS", name_sr: "Moždani udar", desc_en: "Unspecified stroke", desc_sr: "Nedefinisani šlog", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "stroke,CVA", keywords_sr: "šlog,moždani udar" },

  // ============ Respiratory System / Respiratorni sistem ============
  { code: "J18", name_en: "Pneumonia", name_sr: "Pneumonija", desc_en: "Lung infection", desc_sr: "Infekcija pluća", category_en: "Respiratory system", category_sr: "Respiratorni sistem", keywords_en: "pneumonia,lung infection", keywords_sr: "pneumonija,upala pluća" },
  { code: "J44", name_en: "COPD", name_sr: "Hronična opstruktivna bolest pluća", desc_en: "Chronic lung disease", desc_sr: "Hronična bolest pluća", category_en: "Respiratory system", category_sr: "Respiratorni sistem", keywords_en: "COPD,emphysema,chronic bronchitis", keywords_sr: "HOBP,emfizem" },
  { code: "J45", name_en: "Asthma", name_sr: "Astma", desc_en: "Asthma attack", desc_sr: "Napad astme", category_en: "Respiratory system", category_sr: "Respiratorni sistem", keywords_en: "asthma,wheezing,bronchospasm", keywords_sr: "astma,pištanje" },
  { code: "J46", name_en: "Status asthmaticus", name_sr: "Status asthmaticus", desc_en: "Severe asthma attack", desc_sr: "Težak napad astme", category_en: "Respiratory system", category_sr: "Respiratorni sistem", keywords_en: "severe asthma,status asthmaticus", keywords_sr: "teška astma,status" },
  { code: "J69", name_en: "Aspiration pneumonitis", name_sr: "Aspiraciona pneumonija", desc_en: "Aspiration of gastric contents", desc_sr: "Aspiracija sadržaja", category_en: "Respiratory system", category_sr: "Respiratorni sistem", keywords_en: "aspiration,aspiration pneumonia", keywords_sr: "aspiracija,aspiraciona" },
  { code: "J80", name_en: "ARDS", name_sr: "ARDS", desc_en: "Acute respiratory distress", desc_sr: "Akutni respiratorni distres", category_en: "Respiratory system", category_sr: "Respiratorni sistem", keywords_en: "ARDS,respiratory distress,acute lung", keywords_sr: "respiratorni distres,ARDS" },
  { code: "J96", name_en: "Respiratory failure", name_sr: "Respiratorna insuficijencija", desc_en: "Failure of respiration", desc_sr: "Otkazivanje disanja", category_en: "Respiratory system", category_sr: "Respiratorni sistem", keywords_en: "respiratory failure,ARF", keywords_sr: "respiratorna slabost,insuficijencija" },

  // ============ Nervous System / Nervni sistem ============
  { code: "G40", name_en: "Epilepsy", name_sr: "Epilepsija", desc_en: "Seizure disorder", desc_sr: "Epileptični napadi", category_en: "Nervous system", category_sr: "Nervni sistem", keywords_en: "seizure,epilepsy,convulsion", keywords_sr: "epilepsija,napad" },
  { code: "G41", name_en: "Status epilepticus", name_sr: "Status epilepticus", desc_en: "Continuous seizures", desc_sr: "Produženi napadi", category_en: "Nervous system", category_sr: "Nervni sistem", keywords_en: "status epilepticus,prolonged seizure", keywords_sr: "status,produženi napad" },
  { code: "G45", name_en: "Transient ischemic attack", name_sr: "Prolazni ishemijski napad", desc_en: "TIA", desc_sr: "Mini moždani udar", category_en: "Nervous system", category_sr: "Nervni sistem", keywords_en: "TIA,mini stroke,transient", keywords_sr: "TIA,mini šlog" },

  // ============ Endocrine System / Endokrini sistem ============
  { code: "E10", name_en: "Type 1 diabetes mellitus", name_sr: "Dijabetes tip 1", desc_en: "Insulin dependent diabetes", desc_sr: "Insulin zavisan dijabetes", category_en: "Endocrine system", category_sr: "Endokrini sistem", keywords_en: "diabetes type 1,IDDM,insulin dependent", keywords_sr: "dijabetes,tip 1" },
  { code: "E11", name_en: "Type 2 diabetes mellitus", name_sr: "Dijabetes tip 2", desc_en: "Non insulin diabetes", desc_sr: "Neinsulin zavisan dijabetes", category_en: "Endocrine system", category_sr: "Endokrini sistem", keywords_en: "diabetes type 2,NIDDM", keywords_sr: "dijabetes,tip 2" },
  { code: "E15", name_en: "Hypoglycemic coma", name_sr: "Hipoglikemijska koma", desc_en: "Low glucose coma", desc_sr: "Koma zbog niskog šećera", category_en: "Endocrine system", category_sr: "Endokrini sistem", keywords_en: "hypoglycemia coma,diabetic coma", keywords_sr: "hipoglikemija,koma" },
  { code: "E16", name_en: "Hypoglycemia", name_sr: "Hipoglikemija", desc_en: "Low blood sugar", desc_sr: "Nizak šećer", category_en: "Endocrine system", category_sr: "Endokrini sistem", keywords_en: "low glucose,hypoglycemia,low sugar", keywords_sr: "nizak šećer,hipoglikemija" },
  { code: "E86", name_en: "Volume depletion", name_sr: "Dehidratacija", desc_en: "Loss of body fluids", desc_sr: "Gubitak tečnosti", category_en: "Endocrine system", category_sr: "Endokrini sistem", keywords_en: "dehydration,volume loss,hypovolemia", keywords_sr: "dehidratacija,gubitak tečnosti" },

  // ============ Injuries / Povrede ============
  { code: "S06", name_en: "Intracranial injury", name_sr: "Povreda mozga", desc_en: "Traumatic brain injury", desc_sr: "Traumatska povreda mozga", category_en: "Injuries", category_sr: "Povrede", keywords_en: "head injury,TBI,brain injury", keywords_sr: "povreda glave,mozak" },
  { code: "S09", name_en: "Head injury", name_sr: "Povreda glave", desc_en: "Head trauma", desc_sr: "Trauma glave", category_en: "Injuries", category_sr: "Povrede", keywords_en: "head trauma,head injury", keywords_sr: "povreda glave,trauma" },
  { code: "S22", name_en: "Fracture of ribs", name_sr: "Prelom rebara", desc_en: "Rib fracture", desc_sr: "Prelom rebara", category_en: "Injuries", category_sr: "Povrede", keywords_en: "rib fracture,chest trauma", keywords_sr: "prelom rebara,rebra" },
  { code: "S32", name_en: "Fracture of pelvis", name_sr: "Prelom karlice", desc_en: "Pelvic fracture", desc_sr: "Prelom karlice", category_en: "Injuries", category_sr: "Povrede", keywords_en: "pelvic fracture,pelvis", keywords_sr: "karlica,prelom karlice" },
  { code: "S42", name_en: "Shoulder fracture", name_sr: "Prelom ramena", desc_en: "Shoulder fracture", desc_sr: "Prelom ramena", category_en: "Injuries", category_sr: "Povrede", keywords_en: "shoulder fracture,humerus", keywords_sr: "rame,prelom ramena" },
  { code: "S52", name_en: "Forearm fracture", name_sr: "Prelom podlaktice", desc_en: "Arm fracture", desc_sr: "Prelom ruke", category_en: "Injuries", category_sr: "Povrede", keywords_en: "arm fracture,forearm,radius,ulna", keywords_sr: "ruka,prelom ruke" },
  { code: "S72", name_en: "Femur fracture", name_sr: "Prelom femura", desc_en: "Femur fracture", desc_sr: "Prelom butne kosti", category_en: "Injuries", category_sr: "Povrede", keywords_en: "femur fracture,hip fracture,thigh", keywords_sr: "femur,butna kost" },
  { code: "T07", name_en: "Multiple injuries", name_sr: "Višestruke povrede", desc_en: "Polytrauma", desc_sr: "Politrauma", category_en: "Injuries", category_sr: "Povrede", keywords_en: "polytrauma,multiple injuries,trauma", keywords_sr: "politrauma,višestruke povrede" },
  { code: "T14", name_en: "Unspecified injury", name_sr: "Nespecifična povreda", desc_en: "Unspecified trauma", desc_sr: "Nespecifična trauma", category_en: "Injuries", category_sr: "Povrede", keywords_en: "injury,trauma,unspecified", keywords_sr: "povreda,trauma" },

  // ============ Poisoning / Trovanja ============
  { code: "T36", name_en: "Antibiotic poisoning", name_sr: "Trovanje antibioticima", desc_en: "Drug poisoning", desc_sr: "Trovanje lekovima", category_en: "Poisoning", category_sr: "Trovanja", keywords_en: "drug poisoning,antibiotic overdose", keywords_sr: "trovanje,antibiotici" },
  { code: "T40", name_en: "Opioid poisoning", name_sr: "Trovanje opioidima", desc_en: "Opioid overdose", desc_sr: "Overdoza opioida", category_en: "Poisoning", category_sr: "Trovanja", keywords_en: "opioid overdose,narcotics,heroin", keywords_sr: "opijati,overdoza" },
  { code: "T42", name_en: "Sedative poisoning", name_sr: "Trovanje sedativima", desc_en: "Sedative overdose", desc_sr: "Overdoza sedativa", category_en: "Poisoning", category_sr: "Trovanja", keywords_en: "sedative overdose,benzodiazepine", keywords_sr: "sedativi,overdoza" },
  { code: "T51", name_en: "Alcohol intoxication", name_sr: "Trovanje alkoholom", desc_en: "Alcohol poisoning", desc_sr: "Alkoholna intoksikacija", category_en: "Poisoning", category_sr: "Trovanja", keywords_en: "alcohol intoxication,drunk,ethanol", keywords_sr: "alkohol,trovanje" },
  { code: "T58", name_en: "Carbon monoxide poisoning", name_sr: "Trovanje CO", desc_en: "CO poisoning", desc_sr: "Ugljen-monoksid trovanje", category_en: "Poisoning", category_sr: "Trovanja", keywords_en: "carbon monoxide,CO poisoning,gas", keywords_sr: "CO trovanje,ugljen-monoksid" },

  // ============ Symptoms / Simptomi ============
  { code: "R06", name_en: "Dyspnea", name_sr: "Dispneja", desc_en: "Shortness of breath", desc_sr: "Otežano disanje", category_en: "Symptoms", category_sr: "Simptomi", keywords_en: "dyspnea,shortness of breath,SOB", keywords_sr: "gušenje,otežano disanje" },
  { code: "R07", name_en: "Chest pain", name_sr: "Bol u grudima", desc_en: "Chest pain", desc_sr: "Bol u grudima", category_en: "Symptoms", category_sr: "Simptomi", keywords_en: "chest pain,thoracic pain", keywords_sr: "bol u grudima,grudi" },
  { code: "R41", name_en: "Altered mental status", name_sr: "Poremećaj svesti", desc_en: "Confusion", desc_sr: "Konfuzija", category_en: "Symptoms", category_sr: "Simptomi", keywords_en: "confusion,altered mental,AMS", keywords_sr: "poremećaj svesti,konfuzija" },
  { code: "R50", name_en: "Fever", name_sr: "Groznica", desc_en: "Elevated temperature", desc_sr: "Povišena temperatura", category_en: "Symptoms", category_sr: "Simptomi", keywords_en: "fever,temperature,pyrexia", keywords_sr: "temperatura,groznica" },
  { code: "R55", name_en: "Syncope", name_sr: "Sinkopa", desc_en: "Fainting", desc_sr: "Nesvestica", category_en: "Symptoms", category_sr: "Simptomi", keywords_en: "syncope,fainting,collapse", keywords_sr: "nesvestica,kolaps" },
  { code: "R56", name_en: "Convulsions", name_sr: "Konvulzije", desc_en: "Seizure activity", desc_sr: "Grčevi", category_en: "Symptoms", category_sr: "Simptomi", keywords_en: "convulsions,seizure,fits", keywords_sr: "grčevi,konvulzije" },
];

// Group diagnoses by category
export const getDiagnosesByCategory = (language = 'en') => {
  const categories = {};
  diagnoses.forEach(d => {
    const cat = language === 'sr' ? d.category_sr : d.category_en;
    if (!categories[cat]) {
      categories[cat] = [];
    }
    categories[cat].push(d);
  });
  return categories;
};

// Search diagnoses by query (searches code, name, keywords, and description)
export const searchDiagnoses = (query, language = 'en') => {
  if (!query || query.length < 2) return diagnoses;
  
  const lowerQuery = query.toLowerCase();
  return diagnoses.filter(d => {
    const name = language === 'sr' ? d.name_sr : d.name_en;
    const keywords = language === 'sr' ? d.keywords_sr : d.keywords_en;
    const desc = language === 'sr' ? d.desc_sr : d.desc_en;
    return (
      d.code.toLowerCase().includes(lowerQuery) ||
      name.toLowerCase().includes(lowerQuery) ||
      keywords.toLowerCase().includes(lowerQuery) ||
      (desc && desc.toLowerCase().includes(lowerQuery))
    );
  });
};

// Get diagnosis by ICD-10 code
export const getDiagnosisByCode = (code) => {
  return diagnoses.find(d => d.code === code);
};

// Get all unique categories
export const getCategories = (language = 'en') => {
  const cats = new Set();
  diagnoses.forEach(d => {
    cats.add(language === 'sr' ? d.category_sr : d.category_en);
  });
  return Array.from(cats);
};

export default diagnoses;
