
# 📊 SmartRate - Documentazione Funzionalità Complete

## 🎯 **PANORAMICA GENERALE**

**SmartRate** è un'applicazione web full-stack per la gestione fiscale avanzata di:
- **Regime Forfettario** (Partite IVA forfettarie)
- **SRL** (Società a Responsabilità Limitata)

L'applicazione offre calcoli fiscali precisi, pianificazione intelligente e gestione completa delle scadenze fiscali italiane.

---

## 🏠 **1. HOMEPAGE E NAVIGAZIONE**

### **Homepage Principale**
- **Design responsivo** con gradient blu-viola
- **Logo SmartRate** centralizzato
- **Scelta calcolatore**: Forfettari vs SRL
- **Confronto visivo** tra i due regimi
- **Call-to-action** per ogni categoria

### **Caratteristiche Homepage:**
```
✅ Responsive design (mobile-first)
✅ Confronto tasse: 5-15% (Forfettari) vs 24%+3.9% (SRL)
✅ Limiti fatturato evidenziati
✅ Navigation tra sezioni
✅ Branding professionale
```

---

## 💰 **2. CALCOLATORE FORFETTARI (Completo)**

### **2.1 Input Dati Economici**
- **Fatturato 2024** (€) - Campo obbligatorio
- **Fatturato Presunto 2025** (€) - Per proiezioni
- **Validazione real-time** dei dati inseriti

### **2.2 Selezione Categoria Professionale**
**67 categorie organizzate per settori:**

#### **🏪 COMMERCIO**
- Commercio al dettaglio: 40%
- Commercio all'ingrosso: 54%
- Commercio di alimentari e bevande: 40%
- Commercio ambulante: 54%

#### **🔧 ARTIGIANATO**
- Attività manifatturiere: 54%
- Attività di costruzioni e affini: 86%
- Altre attività artigianali: 67%

#### **💼 SERVIZI PROFESSIONALI**
- Servizi di consulenza: 78%
- Servizi informatici: 78%
- Servizi di formazione: 78%
- Servizi di comunicazione: 78%

#### **🏥 SERVIZI ALLA PERSONA**
- Attività delle professioni sanitarie: 78%
- Attività veterinarie: 78%
- Attività di servizi alla persona: 67%

#### **🎨 ATTIVITÀ CREATIVE**
- Attività professionali, scientifiche e tecniche: 78%
- Altre attività di servizi: 67%

### **2.3 Regime Contributivo INPS**
- **IVS Artigiani** - Per attività artigianali
- **IVS Commercianti** - Per attività commerciali
- **Gestione Separata** - Per professionisti

### **2.4 Riduzioni Contributive**
- **Nessuna riduzione** (standard)
- **35%** - Forfettari generici
- **50%** - Nuovi iscritti 2025 (primi 36 mesi)

### **2.5 Regime Fiscale**
- **Data inizio attività** (campo date)
- **Regime Startup automatico** (primi 5 anni - tasse al 5%)
- **Regime normale** (oltre 5 anni - tasse al 15%)

### **2.6 Situazione Finanziaria**
- **Saldo attuale accantonato** (€) - Opzionale

---

## 🏢 **3. CALCOLATORE SRL AVANZATO**

### **3.1 Modalità Standard**
#### **Dati Economici Base:**
- **Fatturato Annuo 2025** (€)
- **Costi Operativi** (€)
- **Numero Dipendenti** (intero)
- **Costi Dipendenti** (€)
- **Compenso Amministratore** (€)

#### **Localizzazione e IVA:**
- **Regione** (per calcolo IRAP) - 20 regioni italiane
- **Regime IVA**: Mensile, Trimestrale, Annuale
- **Debiti IVA pregressi** (opzionale)

### **3.2 Modalità Pianificazione Avanzata**
**Switch per abilitare raccolta dati 2024-2025:**

#### **📊 Dati Definitivi 2024 (Anno Chiuso):**
- **Fatturato 2024** (€)
- **Reddito Imponibile 2024** (€)
- **Acconti IRES Versati 2024** (€)
- **Acconti IRAP Versati 2024** (€)

#### **🔄 Situazione Parziale 2025 (Anno in Corso):**
- **Data Situazione Attuale** (date picker)
- **Fatturato Parziale 2025** (€)
- **IRES Già Versata 2025** (€)
- **IRAP Già Versata 2025** (€)
- **IVA Già Versata 2025** (€)
- **INPS Già Versati 2025** (€)

### **3.3 Calcoli Fiscali SRL**
```
IRES: 24% su reddito imponibile
IRAP: 3.9% (variabile per regione)
IVA: Stimata in base al regime
INPS Amministratore: Contributi obbligatori
INPS Dipendenti: Contributi su costi personale
```

---

## 📊 **4. FUNZIONALITÀ RISULTATI E REPORT**

### **4.1 Sistema Lead Generation**
#### **Anteprima Bloccata (Non Autenticati):**
- **2 risultati visibili** (Reddito Imponibile + Imposta Sostitutiva)
- **2 risultati bloccati** con effetto blur
- **Call-to-action** per sblocco gratuito

#### **Form di Sblocco:**
- **Nome e Cognome** (validazione minimo 2 caratteri)
- **Email** con **verifica codice OTP**
- **Consenso privacy** obbligatorio
- **Auto-salvataggio** dopo verifica email

### **4.2 Sistema Verifica Email**
- **Invio codice OTP** automatico
- **Verifica real-time** del codice
- **Sblocco immediato** dopo verifica
- **Salvataggio automatico** nel database

### **4.3 Report Completi (Sbloccati)**

#### **Per Forfettari:**
- **Reddito Imponibile** calcolato
- **Imposta Sostitutiva** (5% o 15%)
- **Contributi INPS** dettagliati
- **Totale Dovuto** annuale

#### **Per SRL:**
- **Utile Lordo** aziendale
- **IRES** (24%)
- **IRAP** (variabile per regione)
- **INPS Totale** (amministratore + dipendenti)
- **IVA Stimata**
- **Totale Dovuto** complessivo

---

## 📅 **5. SCADENZE FISCALI INTELLIGENTI**

### **5.1 Scadenze Forfettari**
#### **Scadenze 2025:**
- **30 Giugno 2025**: Saldo 2024 + 1° Acconto 2025
- **30 Novembre 2025**: 2° Acconto 2025

#### **INPS Trimestrale:**
- **16 Maggio**: 1° trimestre
- **20 Agosto**: 2° trimestre  
- **16 Novembre**: 3° trimestre
- **16 Febbraio** (anno successivo): 4° trimestre

### **5.2 Scadenze SRL con Indicatori di Urgenza**
#### **Sistema di Alert Visivo:**
```
🚨 SCADUTO: Colore rosso
🚨 < 30 giorni: Colore rosso (urgente)
⚠️ 30-60 giorni: Colore giallo (attenzione)
✅ > 60 giorni: Colore verde (normale)
```

#### **Scadenze Dettagliate:**
- **30 Giugno 2025**: IRES Saldo + 1° Acconto + IRAP Saldo + 1° Acconto
- **30 Novembre 2025**: IRES 2° Acconto + IRAP 2° Acconto
- **Scadenze IVA**: Mensili/Trimestrali/Annuali in base al regime

---

## 💰 **6. PIANIFICAZIONE ACCANTONAMENTO AVANZATA**

### **6.1 Accantonamento Forfettari**
#### **Piano Progressivo Intelligente:**
- **Calcolo per ogni scadenza** (Giugno 2025, Novembre 2025, Giugno 2026)
- **Considegiorazione saldo attuale** accantonato
- **Fabbisogno progressivo** per ogni scadenza
- **Accantonamento mensile ottimizzato**

#### **Raccomandazioni Finali:**
- **Importo mensile totale** da accantonare
- **Suddivisione per scadenza**
- **Percentuale su fatturato mensile**
- **Copertura automatica** di tutte le scadenze

### **6.2 Accantonamento SRL**
#### **Standard con Margine Sicurezza:**
- **Accantonamento mensile base**
- **Margine sicurezza 10%** automatico
- **Distribuzione cashflow ottimizzata**
- **% copertura totale dovuto**

#### **Ottimizzazione Avanzata (Pianificazione):**
- **Proiezioni basate su dati reali** 2024-2025
- **Calcoli più precisi** con storico
- **Riduzione margine errore**
- **Ottimizzazione liquidità** aziendale

---

## 📄 **7. EXPORT E COMUNICAZIONI**

### **7.1 Export Excel Avanzato**
#### **Forfettari - Report Completo:**
```
- Dati attività (categoria, regime, date)
- Calcoli fiscali 2024
- Scadenze 2025 e 2026
- Piano accantonamento mensile
- Contributi INPS trimestrali
- Formattazione professionale
```

#### **SRL - Report Avanzato:**
```
- Dati società (fatturato, costi, personale)
- Pianificazione avanzata 2024-2025 (se abilitata)
- Calcoli fiscali dettagliati
- Scadenze con indicatori urgenza
- Piano accantonamento con margine sicurezza
- Distribuzione cashflow ottimizzata
```

### **7.2 Sistema Email Automatico**
- **Invio report automatico** dopo sblocco
- **Email di verifica** con codice OTP
- **Template professionali** HTML
- **Allegati Excel** inclusi
- **Tracking invii** e aperture

---

## 🎯 **8. DASHBOARD LEAD (CRM Integrato)**

### **8.1 Statistiche Globali**
- **Totali lead** raccolti
- **Nuovi lead** (blu)
- **Lead contattati** (giallo)
- **Lead convertiti** (verde)
- **Lead persi** (rosso)

### **8.2 Gestione Lead Avanzata**
#### **Filtri e Ricerca:**
- **Ricerca testuale** (nome, email, settore)
- **Filtro per stato** (NEW, CONTACTED, CONVERTED, LOST)
- **Export Excel** completo

#### **Dettagli Lead:**
- **Dati anagrafici** completi
- **Dati fiscali** dal calcolatore utilizzato
- **Gestione stato** con colori
- **Sistema note** integrato
- **Storico modifiche**

### **8.3 Workflow CRM**
```
1. Lead acquisito da calcolatore
2. Notifica nuovo lead
3. Visualizzazione dettagli calcolo
4. Aggiornamento stato (contattato)
5. Aggiunta note di follow-up
6. Conversione o perdita lead
7. Analisi performance
```

---

## 🔧 **9. FUNZIONALITÀ TECNICHE**

### **9.1 Autenticazione e Sicurezza**
- **JWT Tokens** per sessioni
- **Hashing password** con bcrypt
- **Protezione API** con middleware
- **Validazione input** con Zod

### **9.2 Database e Persistenza**
- **SQLite** con Drizzle ORM
- **Tabelle ottimizzate**: users, businesses, calculations, leads
- **Relazioni foreign key**
- **Backup automatico** Replit

### **9.3 UI/UX Avanzata**
- **Responsive design** completo
- **Dark/Light mode** ready
- **Componenti Shadcn/UI**
- **Animazioni fluide**
- **Touch-friendly** mobile

### **9.4 Performance**
- **React Query** per caching
- **Lazy loading** componenti
- **Ottimizzazione bundle** Vite
- **CDN assets** Replit

---

## 📈 **10. METRICHE E ANALYTICS**

### **10.1 Metriche Business**
- **Conversion rate** lead
- **Settori più richiesti**
- **Fatturati medi** per categoria
- **Utilizzo calcolatori** (Forfettari vs SRL)

### **10.2 Metriche Tecniche**
- **Page load time**
- **API response time**
- **Error rates**
- **User sessions**

---

## 🚀 **11. ROADMAP FUTURE**

### **11.1 Prossime Funzionalità**
- **Dashboard analytics** avanzate
- **Gestione fatture** complete
- **Calendario scadenze** interattivo
- **Notifiche push** browser
- **Integrazione gestionale**

### **11.2 Integrazioni Planned**
- **PagoPA** per pagamenti
- **Agenzia Entrate** API
- **Google Calendar** sync
- **WhatsApp Business** API

---

## 📞 **12. SUPPORTO E DOCUMENTAZIONE**

### **12.1 Supporto Utenti**
- **FAQ integrate**
- **Guide step-by-step**
- **Video tutorial**
- **Supporto email**

### **12.2 Documentazione Tecnica**
- **API Documentation**
- **Component Library**
- **Database Schema**
- **Deployment Guide**

---

## 🎯 **RIEPILOGO VALORE BUSINESS**

**SmartRate** offre una soluzione completa per:

✅ **Professionisti Forfettari**: Calcoli precisi, scadenze intelligenti, accantonamento ottimizzato
✅ **SRL**: Pianificazione fiscale avanzata, margini sicurezza, cashflow ottimizzato  
✅ **Consulenti**: CRM integrato, lead qualificati, gestione clienti
✅ **Commercialisti**: Strumento professionale, report Excel, dati strutturati

**ROI Immediato**: Risparmio tempo, ottimizzazione fiscale, acquisition lead qualificati

---

*Documento generato da analisi completa del codebase SmartRate*
*Ultimo aggiornamento: Gennaio 2025*
