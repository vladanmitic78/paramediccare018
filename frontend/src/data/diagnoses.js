// ICD-10 Diagnoses for EMS - Bilingual (English/Serbian)
export const diagnoses = [
  // Circulatory System / Sistem krvotoka
  { code: "I10", name_en: "Essential hypertension", name_sr: "Esencijalna hipertenzija", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "hypertension,blood pressure", keywords_sr: "pritisak,hipertenzija" },
  { code: "I20", name_en: "Angina pectoris", name_sr: "Angina pektoris", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "angina,chest pain", keywords_sr: "angina,bol u grudima" },
  { code: "I21", name_en: "Acute myocardial infarction", name_sr: "Akutni infarkt miokarda", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "heart attack,MI,AMI", keywords_sr: "infarkt,srčani udar" },
  { code: "I46", name_en: "Cardiac arrest", name_sr: "Srčani zastoj", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "cardiac arrest,CPR", keywords_sr: "srčani zastoj,reanimacija" },
  { code: "I48", name_en: "Atrial fibrillation", name_sr: "Atrijalna fibrilacija", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "AF,arrhythmia", keywords_sr: "aritmija,fibrilacija" },
  { code: "I50", name_en: "Heart failure", name_sr: "Srčana insuficijencija", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "heart failure,CHF", keywords_sr: "srčana slabost,insuficijencija" },
  { code: "I63", name_en: "Cerebral infarction", name_sr: "Moždani infarkt", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "stroke,CVA", keywords_sr: "šlog,moždani udar" },
  { code: "I64", name_en: "Stroke", name_sr: "Moždani udar", category_en: "Circulatory system", category_sr: "Sistem krvotoka", keywords_en: "stroke,cerebrovascular", keywords_sr: "šlog,moždani udar" },
  
  // Respiratory System / Respiratorni sistem
  { code: "J18", name_en: "Pneumonia", name_sr: "Pneumonija", category_en: "Respiratory system", category_sr: "Respiratorni sistem", keywords_en: "pneumonia,lung infection", keywords_sr: "pneumonija,pluća" },
  { code: "J44", name_en: "COPD", name_sr: "Hronična opstruktivna bolest pluća", category_en: "Respiratory system", category_sr: "Respiratorni sistem", keywords_en: "COPD,emphysema", keywords_sr: "HOBP,emfizem" },
  { code: "J45", name_en: "Asthma", name_sr: "Astma", category_en: "Respiratory system", category_sr: "Respiratorni sistem", keywords_en: "asthma,wheezing", keywords_sr: "astma,pištanje" },
  { code: "J96", name_en: "Respiratory failure", name_sr: "Respiratorna insuficijencija", category_en: "Respiratory system", category_sr: "Respiratorni sistem", keywords_en: "respiratory failure,ARF", keywords_sr: "respiratorna insuficijencija" },
  { code: "J06", name_en: "Acute upper respiratory infection", name_sr: "Akutna infekcija gornjih disajnih puteva", category_en: "Respiratory system", category_sr: "Respiratorni sistem", keywords_en: "URI,cold,flu", keywords_sr: "prehlada,grip" },
  
  // Nervous System / Nervni sistem
  { code: "G40", name_en: "Epilepsy", name_sr: "Epilepsija", category_en: "Nervous system", category_sr: "Nervni sistem", keywords_en: "seizure,epilepsy", keywords_sr: "epilepsija,napad" },
  { code: "G41", name_en: "Status epilepticus", name_sr: "Epileptički status", category_en: "Nervous system", category_sr: "Nervni sistem", keywords_en: "status epilepticus,prolonged seizure", keywords_sr: "epileptički status" },
  { code: "G45", name_en: "Transient ischemic attack", name_sr: "Prolazni ishemijski napad", category_en: "Nervous system", category_sr: "Nervni sistem", keywords_en: "TIA,mini stroke", keywords_sr: "TIA,mini šlog" },
  { code: "G43", name_en: "Migraine", name_sr: "Migrena", category_en: "Nervous system", category_sr: "Nervni sistem", keywords_en: "migraine,headache", keywords_sr: "migrena,glavobolja" },
  { code: "G20", name_en: "Parkinson's disease", name_sr: "Parkinsonova bolest", category_en: "Nervous system", category_sr: "Nervni sistem", keywords_en: "parkinson,tremor", keywords_sr: "parkinson,tremor" },
  
  // Endocrine System / Endokrini sistem
  { code: "E10", name_en: "Type 1 diabetes mellitus", name_sr: "Dijabetes tip 1", category_en: "Endocrine system", category_sr: "Endokrini sistem", keywords_en: "diabetes,type 1", keywords_sr: "dijabetes,tip 1" },
  { code: "E11", name_en: "Type 2 diabetes mellitus", name_sr: "Dijabetes tip 2", category_en: "Endocrine system", category_sr: "Endokrini sistem", keywords_en: "diabetes,type 2", keywords_sr: "dijabetes,tip 2" },
  { code: "E16", name_en: "Hypoglycemia", name_sr: "Hipoglikemija", category_en: "Endocrine system", category_sr: "Endokrini sistem", keywords_en: "hypoglycemia,low sugar", keywords_sr: "hipoglikemija,nizak šećer" },
  { code: "E87", name_en: "Electrolyte imbalance", name_sr: "Elektrolitni disbalans", category_en: "Endocrine system", category_sr: "Endokrini sistem", keywords_en: "electrolyte,dehydration", keywords_sr: "elektroliti,dehidracija" },
  
  // Injuries / Povrede
  { code: "S06", name_en: "Intracranial injury", name_sr: "Povreda mozga", category_en: "Injuries", category_sr: "Povrede", keywords_en: "head injury,TBI", keywords_sr: "povreda glave,mozak" },
  { code: "S72", name_en: "Fracture of femur", name_sr: "Prelom butne kosti", category_en: "Injuries", category_sr: "Povrede", keywords_en: "femur fracture", keywords_sr: "prelom femura" },
  { code: "S82", name_en: "Fracture of lower leg", name_sr: "Prelom potkolenice", category_en: "Injuries", category_sr: "Povrede", keywords_en: "tibia fracture,fibula", keywords_sr: "prelom tibije" },
  { code: "S42", name_en: "Fracture of shoulder/arm", name_sr: "Prelom ramena/ruke", category_en: "Injuries", category_sr: "Povrede", keywords_en: "arm fracture,shoulder", keywords_sr: "prelom ruke,rame" },
  { code: "S32", name_en: "Fracture of spine", name_sr: "Prelom kičme", category_en: "Injuries", category_sr: "Povrede", keywords_en: "spine fracture,vertebra", keywords_sr: "prelom kičme,pršljen" },
  { code: "T14", name_en: "Unspecified injury", name_sr: "Nespecifična povreda", category_en: "Injuries", category_sr: "Povrede", keywords_en: "trauma,injury", keywords_sr: "povreda,trauma" },
  { code: "T07", name_en: "Multiple injuries", name_sr: "Višestruke povrede", category_en: "Injuries", category_sr: "Povrede", keywords_en: "polytrauma,multiple injuries", keywords_sr: "politrauma,višestruke povrede" },
  
  // Burns / Opekotine
  { code: "T30", name_en: "Burns", name_sr: "Opekotine", category_en: "Burns", category_sr: "Opekotine", keywords_en: "burn,thermal injury", keywords_sr: "opekotina,termička povreda" },
  { code: "T31", name_en: "Burns by body surface", name_sr: "Opekotine po površini tela", category_en: "Burns", category_sr: "Opekotine", keywords_en: "burn percentage,TBSA", keywords_sr: "procenat opekotine" },
  
  // Poisoning / Trovanja
  { code: "T51", name_en: "Toxic effect of alcohol", name_sr: "Trovanje alkoholom", category_en: "Poisoning", category_sr: "Trovanja", keywords_en: "alcohol intoxication", keywords_sr: "alkohol,trovanje" },
  { code: "T50", name_en: "Drug overdose", name_sr: "Predoziranje lekovima", category_en: "Poisoning", category_sr: "Trovanja", keywords_en: "overdose,drug poisoning", keywords_sr: "predoziranje,trovanje" },
  { code: "T58", name_en: "Carbon monoxide poisoning", name_sr: "Trovanje ugljen-monoksidom", category_en: "Poisoning", category_sr: "Trovanja", keywords_en: "CO poisoning,carbon monoxide", keywords_sr: "ugljen-monoksid,CO" },
  
  // Symptoms / Simptomi
  { code: "R07", name_en: "Chest pain", name_sr: "Bol u grudima", category_en: "Symptoms", category_sr: "Simptomi", keywords_en: "chest pain", keywords_sr: "bol u grudima" },
  { code: "R50", name_en: "Fever", name_sr: "Groznica", category_en: "Symptoms", category_sr: "Simptomi", keywords_en: "fever,temperature", keywords_sr: "temperatura,groznica" },
  { code: "R55", name_en: "Syncope", name_sr: "Sinkopa", category_en: "Symptoms", category_sr: "Simptomi", keywords_en: "syncope,fainting", keywords_sr: "sinkopa,nesvestica" },
  { code: "R56", name_en: "Convulsions", name_sr: "Konvulzije", category_en: "Symptoms", category_sr: "Simptomi", keywords_en: "convulsions,seizures", keywords_sr: "grčevi,konvulzije" },
  { code: "R40", name_en: "Altered consciousness", name_sr: "Poremećaj svesti", category_en: "Symptoms", category_sr: "Simptomi", keywords_en: "altered mental status,AMS", keywords_sr: "poremećaj svesti" },
  { code: "R41", name_en: "Confusion", name_sr: "Konfuzija", category_en: "Symptoms", category_sr: "Simptomi", keywords_en: "confusion,disorientation", keywords_sr: "konfuzija,dezorijentacija" },
  { code: "R06", name_en: "Dyspnea", name_sr: "Dispneja", category_en: "Symptoms", category_sr: "Simptomi", keywords_en: "shortness of breath,dyspnea", keywords_sr: "otežano disanje,dispneja" },
  { code: "R00", name_en: "Abnormal heartbeat", name_sr: "Nepravilan rad srca", category_en: "Symptoms", category_sr: "Simptomi", keywords_en: "palpitations,arrhythmia", keywords_sr: "palpitacije,aritmija" },
  { code: "R10", name_en: "Abdominal pain", name_sr: "Bol u stomaku", category_en: "Symptoms", category_sr: "Simptomi", keywords_en: "abdominal pain,stomach", keywords_sr: "bol u stomaku,abdomen" },
  { code: "R11", name_en: "Nausea and vomiting", name_sr: "Mučnina i povraćanje", category_en: "Symptoms", category_sr: "Simptomi", keywords_en: "nausea,vomiting", keywords_sr: "mučnina,povraćanje" },
  { code: "R51", name_en: "Headache", name_sr: "Glavobolja", category_en: "Symptoms", category_sr: "Simptomi", keywords_en: "headache,cephalgia", keywords_sr: "glavobolja" },
  { code: "R52", name_en: "Pain", name_sr: "Bol", category_en: "Symptoms", category_sr: "Simptomi", keywords_en: "pain,acute pain", keywords_sr: "bol,akutni bol" },
  
  // Digestive System / Digestivni sistem
  { code: "K57", name_en: "Diverticulosis/Diverticulitis", name_sr: "Divertikuloza/Divertikulitis", category_en: "Digestive system", category_sr: "Digestivni sistem", keywords_en: "diverticulosis,diverticulitis", keywords_sr: "divertikuloza,divertikulitis" },
  { code: "K80", name_en: "Cholelithiasis", name_sr: "Kamenci u žuči", category_en: "Digestive system", category_sr: "Digestivni sistem", keywords_en: "gallstones,cholelithiasis", keywords_sr: "kamenci u žuči,žučna kesa" },
  { code: "K35", name_en: "Acute appendicitis", name_sr: "Akutni apendicitis", category_en: "Digestive system", category_sr: "Digestivni sistem", keywords_en: "appendicitis,appendix", keywords_sr: "apendicitis,slepo crevo" },
  { code: "K92", name_en: "GI bleeding", name_sr: "GI krvarenje", category_en: "Digestive system", category_sr: "Digestivni sistem", keywords_en: "GI bleed,gastrointestinal bleeding", keywords_sr: "krvarenje,GI" },
  
  // Skin / Koža
  { code: "L03", name_en: "Cellulitis", name_sr: "Celulitis", category_en: "Skin", category_sr: "Koža", keywords_en: "cellulitis,skin infection", keywords_sr: "celulitis,infekcija kože" },
  { code: "L50", name_en: "Urticaria", name_sr: "Koprivnjača", category_en: "Skin", category_sr: "Koža", keywords_en: "urticaria,hives", keywords_sr: "koprivnjača,osip" },
  
  // Allergic Reactions / Alergijske reakcije
  { code: "T78", name_en: "Allergic reaction", name_sr: "Alergijska reakcija", category_en: "Allergic reactions", category_sr: "Alergijske reakcije", keywords_en: "allergy,allergic reaction", keywords_sr: "alergija,alergijska reakcija" },
  { code: "T78.2", name_en: "Anaphylaxis", name_sr: "Anafilaksa", category_en: "Allergic reactions", category_sr: "Alergijske reakcije", keywords_en: "anaphylaxis,anaphylactic shock", keywords_sr: "anafilaksa,anafilaktički šok" },
  
  // Mental Health / Mentalno zdravlje
  { code: "F10", name_en: "Alcohol use disorder", name_sr: "Poremećaj upotrebe alkohola", category_en: "Mental health", category_sr: "Mentalno zdravlje", keywords_en: "alcohol,alcoholism", keywords_sr: "alkoholizam" },
  { code: "F32", name_en: "Depression", name_sr: "Depresija", category_en: "Mental health", category_sr: "Mentalno zdravlje", keywords_en: "depression,major depressive", keywords_sr: "depresija" },
  { code: "F41", name_en: "Anxiety disorder", name_sr: "Anksiozni poremećaj", category_en: "Mental health", category_sr: "Mentalno zdravlje", keywords_en: "anxiety,panic", keywords_sr: "anksioznost,panika" },
  { code: "F20", name_en: "Schizophrenia", name_sr: "Šizofrenija", category_en: "Mental health", category_sr: "Mentalno zdravlje", keywords_en: "schizophrenia,psychosis", keywords_sr: "šizofrenija,psihoza" },
  
  // Urinary System / Urinarni sistem
  { code: "N39", name_en: "Urinary tract infection", name_sr: "Infekcija urinarnog trakta", category_en: "Urinary system", category_sr: "Urinarni sistem", keywords_en: "UTI,urinary infection", keywords_sr: "UTI,urinarna infekcija" },
  { code: "N17", name_en: "Acute kidney failure", name_sr: "Akutna bubrežna insuficijencija", category_en: "Urinary system", category_sr: "Urinarni sistem", keywords_en: "AKI,kidney failure", keywords_sr: "bubrežna insuficijencija" },
  
  // Obstetrics / Akušerstvo
  { code: "O80", name_en: "Normal delivery", name_sr: "Normalan porođaj", category_en: "Obstetrics", category_sr: "Akušerstvo", keywords_en: "delivery,childbirth", keywords_sr: "porođaj" },
  { code: "O60", name_en: "Preterm labor", name_sr: "Prevremeni porođaj", category_en: "Obstetrics", category_sr: "Akušerstvo", keywords_en: "preterm labor,premature", keywords_sr: "prevremeni porođaj" },
  { code: "O46", name_en: "Antepartum hemorrhage", name_sr: "Antepartalno krvarenje", category_en: "Obstetrics", category_sr: "Akušerstvo", keywords_en: "antepartum bleeding,placenta", keywords_sr: "krvarenje,placenta" },
  
  // Other / Ostalo
  { code: "Z99", name_en: "Dependence on medical equipment", name_sr: "Zavisnost od medicinske opreme", category_en: "Other", category_sr: "Ostalo", keywords_en: "dialysis,ventilator,oxygen", keywords_sr: "dijaliza,ventilator,kiseonik" },
  { code: "R99", name_en: "Unknown cause of death", name_sr: "Nepoznat uzrok smrti", category_en: "Other", category_sr: "Ostalo", keywords_en: "death,DOA", keywords_sr: "smrt,DOA" },
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

// Search diagnoses
export const searchDiagnoses = (query, language = 'en') => {
  if (!query || query.length < 2) return diagnoses;
  
  const lowerQuery = query.toLowerCase();
  return diagnoses.filter(d => {
    const name = language === 'sr' ? d.name_sr : d.name_en;
    const keywords = language === 'sr' ? d.keywords_sr : d.keywords_en;
    return (
      d.code.toLowerCase().includes(lowerQuery) ||
      name.toLowerCase().includes(lowerQuery) ||
      keywords.toLowerCase().includes(lowerQuery)
    );
  });
};

export default diagnoses;
