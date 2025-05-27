# Prompt per Sviluppo App Full-Stack su Replit

## PROMPT OTTIMIZZATO:

```
Crea un'applicazione web full-stack completa su Replit per la gestione degli accantonamenti nel regime forfettario italiano. L'app deve includere frontend moderno, backend API REST, database per persistenza dati e sistema di autenticazione.

## CONFIGURAZIONE REPLIT:

### Stack Tecnologico:
- **Template Replit**: Node.js
- **Frontend**: React con Vite
- **Backend**: Express.js + Node.js  
- **Database**: SQLite con Sequelize ORM
- **Autenticazione**: JWT (JSON Web Tokens)
- **Styling**: Tailwind CSS

### Struttura Directory:
```
/
├── server/
│   ├── index.js              # Entry point server
│   ├── config/
│   │   ├── database.js       # Configurazione SQLite
│   │   └── constants.js      # Costanti fiscali
│   ├── models/
│   │   ├── User.js           # Modello utente
│   │   ├── Business.js       # Modello attività
│   │   ├── Invoice.js        # Modello fatture
│   │   └── Payment.js        # Modello pagamenti
│   ├── routes/
│   │   ├── auth.js           # Route autenticazione
│   │   ├── calculations.js   # Route calcoli
│   │   ├── businesses.js     # Route gestione attività
│   │   └── reports.js        # Route report/export
│   ├── middleware/
│   │   ├── auth.js           # Middleware JWT
│   │   └── validation.js     # Validazione input
│   └── services/
│       ├── taxCalculator.js  # Logica calcolo imposte
│       └── inpsCalculator.js # Logica calcolo contributi
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx      # Dashboard principale
│   │   │   ├── BusinessForm.jsx   # Form dati attività
│   │   │   ├── Calculator.jsx     # Calcolatore imposte
│   │   │   ├── Calendar.jsx       # Calendario scadenze
│   │   │   └── Reports.jsx        # Gestione report
│   │   ├── hooks/
│   │   │   ├── useAuth.js        # Hook autenticazione
│   │   │   └── useCalculations.js # Hook calcoli
│   │   ├── services/
│   │   │   └── api.js            # Client API
│   │   └── App.jsx               # Component principale
├── package.json
├── .env                          # Variabili ambiente
└── .replit                       # Config Replit
```

## DATABASE SCHEMA:

### Tabella: users
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabella: businesses
```sql
CREATE TABLE businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  business_name TEXT NOT NULL,
  macro_category TEXT NOT NULL,
  ateco_code TEXT,
  start_date DATE NOT NULL,
  is_startup BOOLEAN DEFAULT 0,
  contribution_regime TEXT NOT NULL, -- 'IVS_ARTIGIANI', 'IVS_COMMERCIANTI', 'GESTIONE_SEPARATA'
  contribution_reduction TEXT, -- 'NONE', '35', '50'
  has_other_coverage BOOLEAN DEFAULT 0,
  current_balance DECIMAL(10,2),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Tabella: invoices
```sql
CREATE TABLE invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);
```

### Tabella: tax_calculations
```sql
CREATE TABLE tax_calculations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  revenue DECIMAL(10,2),
  taxable_income DECIMAL(10,2),
  tax_rate DECIMAL(4,2),
  tax_amount DECIMAL(10,2),
  inps_amount DECIMAL(10,2),
  total_due DECIMAL(10,2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);
```

### Tabella: payment_deadlines
```sql
CREATE TABLE payment_deadlines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  due_date DATE NOT NULL,
  payment_type TEXT NOT NULL, -- 'TAX_BALANCE', 'TAX_ADVANCE_1', 'TAX_ADVANCE_2', 'INPS_Q1', etc.
  amount DECIMAL(10,2) NOT NULL,
  is_paid BOOLEAN DEFAULT 0,
  paid_date DATE,
  FOREIGN KEY (business_id) REFERENCES businesses(id)
);
```

## API ENDPOINTS:

### Autenticazione
- POST /api/auth/register - Registrazione nuovo utente
- POST /api/auth/login - Login utente
- GET /api/auth/profile - Profilo utente autenticato

### Gestione Attività
- GET /api/businesses - Lista attività dell'utente
- POST /api/businesses - Crea nuova attività
- PUT /api/businesses/:id - Aggiorna attività
- DELETE /api/businesses/:id - Elimina attività

### Fatture
- GET /api/businesses/:id/invoices - Lista fatture
- POST /api/businesses/:id/invoices - Registra fattura
- PUT /api/invoices/:id - Modifica fattura
- DELETE /api/invoices/:id - Elimina fattura

### Calcoli
- POST /api/calculations/tax - Calcola imposte e contributi
- GET /api/calculations/history/:businessId - Storico calcoli
- POST /api/calculations/installments - Calcola rate accantonamento

### Scadenze
- GET /api/deadlines/:businessId - Calendario scadenze
- PUT /api/deadlines/:id/pay - Marca come pagato
- GET /api/deadlines/upcoming - Prossime scadenze

### Report
- GET /api/reports/export/:businessId - Export Excel
- GET /api/reports/summary/:businessId/:year - Riepilogo annuale

## FUNZIONALITÀ FRONTEND:

### 1. Dashboard
```jsx
// Mostrare:
- Riepilogo attività registrate
- Prossime scadenze (con alert se saldo insufficiente)
- Grafico andamento fatturato
- Quick actions (nuovo calcolo, registra fattura)
```

### 2. Gestione Attività
```jsx
// Form per:
- Dati anagrafici attività
- Selezione macro-categoria con preview coefficiente
- Configurazione regime contributivo
- Upload documenti (futuro)
```

### 3. Calcolatore Imposte
```jsx
// Interfaccia per:
- Input fatturato mensile/annuale
- Visualizzazione calcoli in tempo reale
- Confronto anni precedenti
- Simulazioni "what-if"
```

### 4. Calendario Scadenze
```jsx
// Vista calendario con:
- Scadenze fiscali colorate per tipo
- Importi dovuti
- Status pagamento
- Integrazione con saldo conto
```

### 5. Gestione Fatture
```jsx
// CRUD fatture con:
- Import da file CSV/Excel
- Categorizzazione automatica
- Grafici andamento mensile
```

## LOGICHE DI BUSINESS:

### Calcolo Imposte (taxCalculator.js)
```javascript
const calculateTax = (revenue, category, isStartup, yearsActive) => {
  const coefficients = {
    'FOOD_COMMERCE': 0.40,
    'STREET_COMMERCE': 0.54,
    'INTERMEDIARIES': 0.62,
    'OTHER_ACTIVITIES': 0.67,
    'PROFESSIONAL': 0.78,
    'CONSTRUCTION': 0.86
  };
  
  const coefficient = coefficients[category];
  const taxableIncome = revenue * coefficient;
  const taxRate = (isStartup && yearsActive <= 5) ? 0.05 : 0.15;
  
  return {
    taxableIncome,
    taxRate,
    taxAmount: taxableIncome * taxRate
  };
};
```

### Calcolo Contributi INPS (inpsCalculator.js)
```javascript
const calculateINPS = (taxableIncome, regime, reduction, hasOtherCoverage) => {
  let amount = 0;
  
  if (regime === 'GESTIONE_SEPARATA') {
    const rate = hasOtherCoverage ? 0.24 : 0.26;
    amount = Math.min(taxableIncome, 120607) * rate;
  } else {
    // IVS calculations
    const minimums = {
      'IVS_ARTIGIANI': 4427.04,
      'IVS_COMMERCIANTI': 4515.43
    };
    
    let minimum = minimums[regime];
    if (reduction === '35') minimum *= 0.65;
    else if (reduction === '50') minimum *= 0.50;
    
    amount = minimum;
    if (taxableIncome > 18324) {
      const excess = (taxableIncome - 18324) * 0.24;
      amount += reduction ? excess * (1 - reduction/100) : excess;
    }
  }
  
  return amount;
};
```

### Calcolo Rate Accantonamento
```javascript
const calculateInstallments = (totalDue, currentBalance, monthsUntilDeadline) => {
  if (currentBalance >= totalDue) {
    return { monthlyAmount: 0, covered: true };
  }
  
  const deficit = totalDue - currentBalance;
  const monthlyAmount = deficit / monthsUntilDeadline;
  
  return {
    monthlyAmount: Math.ceil(monthlyAmount * 100) / 100,
    covered: false,
    deficit
  };
};
```

## FEATURES AVANZATE:

### 1. Notifiche
- Email reminder scadenze (con SendGrid)
- Push notification browser
- Dashboard alert

### 2. Multi-tenancy
- Gestione più attività per utente
- Switch rapido tra attività
- Confronti e aggregazioni

### 3. Integrations
- Import fatture da gestionale
- Export verso commercialista
- Sync con Google Calendar

### 4. Analytics
- Previsioni cashflow
- Ottimizzazione fiscale
- Benchmark di settore

## CONFIGURAZIONE .env:
```
DATABASE_URL=./database.sqlite
JWT_SECRET=your-secret-key-here
PORT=3000
NODE_ENV=production
```

## SCRIPT PACKAGE.JSON:
```json
{
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "nodemon server/index.js",
    "client": "cd client && npm run dev",
    "build": "cd client && npm run build",
    "start": "node server/index.js",
    "migrate": "node server/config/migrate.js"
  }
}
```

## ISTRUZIONI DEPLOYMENT REPLIT:

1. Crea nuovo Repl con template Node.js
2. Copia struttura file
3. Installa dipendenze:
   ```bash
   npm install express sqlite3 sequelize jsonwebtoken bcrypt cors
   cd client && npm install
   ```
4. Configura Secrets in Replit per JWT_SECRET
5. Run migration per creare database
6. Avvia con "Run" button

L'app sarà accessibile su: https://[nome-repl].repl.co
```

## VANTAGGI DI QUESTO APPROCCIO:

### 1. **Full-Stack Completo**
- ✅ Frontend React moderno e reattivo
- ✅ API REST ben strutturata
- ✅ Database relazionale con ORM
- ✅ Autenticazione sicura JWT

### 2. **Scalabilità**
- ✅ Architettura modulare
- ✅ Separazione concerns
- ✅ Facile aggiungere features
- ✅ Multi-utente ready

### 3. **Persistenza Dati**
- ✅ Storico completo fatture
- ✅ Tracking pagamenti
- ✅ Report annuali
- ✅ Backup automatico Replit

### 4. **User Experience**
- ✅ Dashboard intuitiva
- ✅ Calcoli real-time
- ✅ Export professionale
- ✅ Mobile responsive

## PERSONALIZZAZIONI SUGGERITE:

Dopo la generazione base, puoi richiedere:
- "Aggiungi grafici con Chart.js"
- "Implementa dark mode"
- "Aggiungi API per commercialista"
- "Integra pagamenti Stripe"
- "Aggiungi backup automatico su cloud"

## NOTE TECNICHE:

- **Replit Limits**: Database SQLite fino a 5GB
- **Performance**: Cache calculations in Redis
- **Security**: Rate limiting su API
- **Monitoring**: Integrate Sentry per errori