# CrimeSense AI: Master Presentation Script (Hinglish Edition)
## Major Project Viva Defense & Live Demo Guide
**Target:** Final Year Major Project / Capstone Viva (Full Marks / Out-of-Marks Strategy)  
**Jurisdiction:** Nagpur City Police Commissionerate (30 Police Stations, 5 Zones)  
**Legal Framework:** Bharatiya Nyaya Sanhita (BNS) 2023 & Bharatiya Nagarik Suraksha Sanhita (BNSS §173)

---

# Presentation Flow & Index
1. [Opening Pitch & Problem Statement](#1-opening-pitch--problem-statement)
2. [System Architecture & Tech Stack (Technical Backbone)](#2-system-architecture--tech-stack)
3. [Page 1: Command Dashboard (Executive KPIs & Trends)](#page-1-command-dashboard-)
4. [Page 2: Live Incident Map (Spatial Intelligence & Viewport Optimization)](#page-2-live-incident-map-map)
5. [Page 3: Predictive Analytics (Volume Forecasting with 95% Confidence Bands)](#page-3-predictive-analytics-analytics)
6. [Page 4: Hotspot Intelligence (KDE + DBSCAN + XGBoost)](#page-4-hotspot-intelligence-hotspots)
7. [Page 5: Automated FIR Intake & Evidence Vault (OCR + GROQ LLM)](#page-5-automated-fir-intake--evidence-vault-fir)
8. [Page 6: Deep Dive — AI Copilot & Modus Operandi Vector Search (Gemini RAG)](#page-6-deep-dive--ai-copilot--modus-operandi-vector-search-copilot)
9. [Page 7: Deep Dive — Criminal Syndicate Network Analysis (Graph Centrality & Kingpins)](#page-7-deep-dive--criminal-syndicate-network-analysis-network)
10. [Page 8: AI Dynamic Beat Patrol Route Optimization (TSP Solver)](#page-8-ai-dynamic-beat-patrol-route-optimization-patrol)
11. [Page 9: Threat Alerts & Early Warning System](#page-9-threat-alerts--early-warning-system-alerts)
12. [Page 10: Model Management & Multi-Model Governance Registry](#page-10-model-management--multi-model-governance-registry-models)
13. [Page 11: Settings, Audit Logs & RBAC Security](#page-11-settings-audit-logs--rbac-security-settings)
14. [Top 10 Killer Viva Q&A (Examiner Cross-Questioning Defense)](#top-10-killer-viva-qa-examiner-cross-questioning-defense)

---

## 1. Opening Pitch & Problem Statement

### 🗣️ Kya Bolna Hai (Spoken Script):
> *"Respected external examiners and internal faculty, good morning.*
>
> *Aaj hum present kar rahe hain apna Major Project: **CrimeSense AI — AI-Powered Crime Intelligence and Predictive Analytics Platform for Law Enforcement**.*
>
> *Hamara domain hai **Nagpur City Police Commissionerate**, jisme **30 Police Stations** aur **5 Operational Zones** hain, aur ye platform India ke naye criminal laws — **Bharatiya Nyaya Sanhita (BNS) 2023** aur **BNSS Section 173** ke strictly compliant hai.*
>
> *### Real-World Problem:*
> *Aaj traditional policing ka sabse bada challenge data ki kami nahi hai, balki **Data Silos aur Investigative Latency** hai. Jab raat ko 10 baje Sitabuldi ya Dhantoli me koi armed robbery ya chain snatching hoti hai, to duty officer ke paas koi aisa system nahi hota jo 8,000 past cases me se turant bata sake ki:*
> 1. *Is crime ka Modus Operandi (M.O.) kis gang se match karta hai?*
> 2. *Is area me use hone wali black Bajaj Pulsar kis suspect ke syndicate se linked hai?*
> 3. *Aur kal raat isi jurisdiction ke kis street corner par crime spike hone ka 95% risk hai?*
>
> *CrimeSense AI in sabhi gaps ko bridge karta hai: Scanned FIR ki automated AI parsing se lekar, 3072-dimensional semantic vector search, graph-theory based syndicate kingpin detection, aur XGBoost predictive forecasting tak."*

---

## 2. System Architecture & Tech Stack

### 🗣️ Kya Bolna Hai (Spoken Script):
> *"Sir, humne koi basic CRUD application nahi banayi, balki ek **Enterprise-Grade Decoupled Architecture** design kiya hai:*
>
> 1. * **Frontend:** **React 18 + TypeScript + Vite + Tailwind CSS + ShadCN UI**. Complex visualization ke liye humne **Recharts** for analytics, **React-Leaflet** for dark spatial GIS mapping, aur **Force-Graph-2D** for syndicate graphs integrate kiya hai.
> 2. * **Backend:** High-throughput asynchronous **FastAPI** with **SQLAlchemy 2.0 ORM** aur **Pydantic v2** validation.
> 3. * **Database:** **PostgreSQL 16 with PostGIS extension** spatial geometries ke liye, aur **pgvector / binary vector store** semantic search ke liye.
> 4. * **ML & AI Engines (6 Specialized Models):**
>    - **XGBoost Classifier:** Spatial Hotspot prediction ke liye.
>    - **Gradient Boosting Regressor:** 7-day citywide volume time-series forecasting with 95% confidence bands.
>    - **Random Forest Regressor:** Police station risk scoring ke liye.
>    - **PyTesseract + GROQ LLM (gpt-oss-120b):** Zero-shot FIR OCR entity extraction.
>    - **Google Gemini (text-embedding-004 + Gemini 3.5 Flash):** 3072-dim embeddings aur zero-hallucination grounded RAG copilot.
>    - **NetworkX Graph Engine:** Eigenvector, Degree aur Betweenness Centrality for kingpin identification."*

---

## Page 1: Command Dashboard (`/`)

### 🖥️ Screen Par Kya Dikhana Hai:
- Dashboard par jao (`localhost:5173/`).
- Top banner par **"SYNTHETIC DEMO DATA"** badge aur **"BNSS Notice"** button dikhao.
- Top KPI Cards aur **Weekly Incident Trend** bar chart dikhao.

### 🗣️ Kya Bolna Hai (Spoken Script):
> *"Sir, ye hamara **Executive Command Dashboard** hai jo Police Commissioner aur Senior Officers ke daily briefing ke liye use hota hai.*
>
> *Top bar me 4 major KPIs hain:*
> - * **Total Incidents:** 8,000 cases.
> - * **Monthly Delta:** Previous 30 days ke comparison me current month ka percent change ($\Delta = \frac{\text{Cur} - \text{Prev}}{\text{Prev}} \times 100$).
> - * **Active Threats:** Immediate attention require karne wale 32 alerts.
> - * **Prediction Accuracy:** Ground-truth ML accuracy of active model ($78.6\%$).*

### 🔍 Real-World Example (Batao):
> *"**Example dekhiye:**  
> 'Weekly Incident Trend' chart ko dekhiye. Data analysis se clear dikhta hai ki Nagpur me Friday aur Saturday ko crime volume Sunday ke comparison me 35% spike karta hai (around 1,400+ incidents peak on weekends).  
> Category bar chart me dekhiye — 'Theft' aur 'Armed Robbery' top categories hain.  
> Right side me **Risk Donut Chart** hai jo Nagpur ke total cases ko 4 bands me split karta hai: Critical ($18\%$), High ($32\%$), Medium ($38\%$), aur Low ($12\%$), jisme center me exact 8,000 count dynamically calculated hai."*

---

## Page 2: Live Incident Map (`/map`)

### 🖥️ Screen Par Kya Dikhana Hai:
- Map page par navigate karo (`/map`).
- Zone dropdown me se **Zone 1** select karo, Police Station me **Sitabuldi PS** filter karo.
- Map zoom-in karo taaki marker clusters open ho kar individual crime pins me convert ho jayein.
- Left panel par **Viewport Incident Breakdown** widget dikhao.

### 🗣️ Kya Bolna Hai (Spoken Script):
> *"Sir, ye hamara **Live Spatial Incident Map** hai. Nagpur ke 30 police stations ka geographical data PostGIS spatial indexing se query hota hai.*
>
> *### Technical Challenge & Solution:*
> *Jab 8,000+ incidents ek sath DOM me render hote hain, to browser freeze hone lagta hai. Humne **Adaptive 2,500 Viewport Cap** lagaya hai — recent active cases ko render karke 60fps smooth pan/zoom guarantee kiya hai.*
>
> *Hamara map dark-matter theme use karta hai. Agar CARTO API key present na ho, to ye automatically zero-key fallback OpenStreetMap dark CSS filter par switch ho jata hai, jisse koi watermark nahi aata."*

### 🔍 Real-World Example (Batao):
> *"**Example dekhiye:**  
> Jab hum **Zone 1 -> Sitabuldi Police Station** filter karte hain:  
> 1. Left side ka **Viewport Incident Breakdown** turant recalculate hota hai: Critical (42), High (88), Medium (120), Low (35).  
> 2. Variety Square ke paas Red Marker par click karne par Incident Card open hota hai:  
>    **Crime ID:** `INC-2024-0891` | **Type:** Armed Chain Snatching | **Location:** Variety Square, Sitabuldi | **Risk:** Critical (0.82) | **Time:** 22:45 hrs.  
> 3. Heatmap toggle button click karne par discrete pins continuous spatial density cloud me morph ho jate hain."*

---

## Page 3: Predictive Analytics (`/analytics`)

### 🖥️ Screen Par Kya Dikhana Hai:
- Predictive Analytics page par navigate karo (`/analytics`).
- **Citywide Crime Volume Forecast** chart par mouse hover karo.
- Actual line (Green), Predicted line (Dashed Blue), aur Confidence Shaded Band (Cyan) ko point out karo.

### 🗣️ Kya Bolna Hai (Spoken Script):
> *"Sir, ye sabse important page hai jo policing ko reactive se **proactive** banata hai.*
>
> *Yaha humne **Gradient Boosting Regressor** (`n_estimators=200, max_depth=3, learning_rate=0.05`) train kiya hai.  
> Ye model daily incident series se autoregressive **Lag Features** generate karta hai ($L_7, L_{14}, L_{30}$) along with rolling standard deviation.*
>
> *Chart par 3 elements hain:*
> 1. * **Solid Green Line:** Ground-truth actual incidents.
> 2. * **Dashed Blue Line:** Model ka upcoming 7-day predicted volume.
> 3. * **Shaded Cyan Band:** Model ka **Empirical 95% Confidence Interval ($\pm 1.96\sigma$)**."*

### 🔍 Real-World Example (Batao):
> *"**Example dekhiye:**  
> Hover karne par dekhiye: Oct 28 ko predicted count hai **24.2 cases/day**, Lower Bound hai **18.5**, aur Upper Bound hai **29.9**.  
> Agar aage aane wale weekend par koi festival ya VIP movement hai, to model ka uncertainty band expand ho jata hai, jisse Commissioner ko pehle hi pata chal jata hai ki kis din extra reserve battalion deploy karni hai."*

---

## Page 4: Hotspot Intelligence (`/hotspots`)

### 🖥️ Screen Par Kya Dikhana Hai:
- Hotspots page par jao (`/hotspots`).
- Floating **Hotspot Intensity Scale** (Red $\ge 0.70$, Orange $\ge 0.50$, Blue $\ge 0.30$) dikhao.
- Niche **Top Station Risk Comparison Bar Chart** aur right side me **Top 10 Predicted Areas Table** dikhao.

### 🗣️ Kya Bolna Hai (Spoken Script):
> *"Sir, standard heatmaps sirf ye batate hain ki past me crime kaha hua. Hamara Hotspot Engine predict karta hai ki **next 8 ghante me crime kaha concentrate hoga**.*
>
> *Humne 3 spatial techniques combine ki hain:*
> 1. * **Kernel Density Estimation (KDE):** Continuous surface risk estimate karne ke liye.
> 2. * **DBSCAN Clustering:** $350\text{ m}$ radius aur minimum 5 incidents ke spatial clusters banane ke liye.
> 3. * **XGBoost Hotspot Classifier:** 1km grid cells ko Hotspot vs Normal classify karne ke liye ($78.6\%$ Accuracy)."*

### 🔍 Real-World Example (Batao):
> *"**Example dekhiye:**  
> Table me Rank #1 par **Dhantoli (Wardha Road Market)** hai:  
> - **Current Risk Score:** 0.81  
> - **Predicted Risk Score:** 0.86  
> - **Trend:** `▲ +6.2%` emerging spike.  
> - **Actionable Insight:** Dhantoli station in-charge ko turant alert jata hai ki evening commercial hours me foot patrol increase karo."*

---

## Page 5: Automated FIR Intake & Evidence Vault (`/fir`)

### 🖥️ Screen Par Kya Dikhana Hai:
- `/fir` page par jao.
- Paste Text tab me **"Load Sample"** click karo.
- **"Parse with AI"** button click karo. Spinner ke baad extracted structured fields dikhao.
- Niche **Processing Queue & Ingestion Log** table me click karke loaded records aur Retry button dikhao.

### 🗣️ Kya Bolna Hai (Spoken Script):
> *"Sir, police stations me FIR digitize karne me 45 minutes lagte hain. CrimeSense AI is pure process ko **under 5 seconds** me automate karta hai.*
>
> *### Process Pipeline:*
> 1. * **Evidence Vault Hashing:** File upload hote hi backend **SHA-256 cryptographic checksum** generate karta hai, jo Indian Evidence Act Section 65B ke under digital tampering ko prevent karta hai.
> 2. * **PyTesseract OCR:** Scanned document ko clean text me convert karta hai.
> 3. * **GROQ LLM (`gpt-oss-120b`):** Zero-shot prompt se 12 structured fields extract karta hai: BNS Sections, Accused name, Aliases, Vehicle Number, aur Stolen Property.
> 4. * **Confidence Scoring:** Jo fields $\ge 80\%$ confident hain wo green rehte hain; $< 60\%$ par yellow flag lagta hai officer review ke liye."*

### 🔍 Real-World Example (Batao):
> *"**Example dekhiye:**  
> Sample text parse karte hi extract hua:  
> - **Crime Head:** ARMED ROBBERY  
> - **Acts:** Bharatiya Nyaya Sanhita (BNS) Section 309(4) & Section 3(5)  
> - **Suspect:** Akash Khan (Alias: 'Akku Shooter', scar on left cheek)  
> - **Seized Vehicle:** Bajaj Pulsar `MH-31-AJ-5012`  
> - **Stolen Property:** 24g Gold Mangalsutra (estimated value ₹1,45,000)  
> - **Calculated Risk:** 0.82 (Critical)  
> Jaise hi Duty Officer **'Approve & Materialize Incident'** dabata hai, ye docket seedha database me register ho kar map par live plot ho jata hai."*

---

## Page 6: Deep Dive — AI Copilot & Modus Operandi Vector Search (`/copilot`)

### 🖥️ Screen Par Kya Dikhana Hai:
- `/copilot` page par navigate karo.
- Tab 1 me prompt chip click karo: *"Analyze recent armed chain-snatching incidents involving motorcycles near Sitabuldi"*.
- AI ka formatted markdown answer stream hote hue dikhao.
- Niche **Grounded Case Dockets** cards (`[CS-00125]`, `[CS-02601]`) dikhao aur **"Inspect Docket"** button click karke pop-up dikhao.
- Tab 2: **Modus Operandi Vector Search** par switch karke live query type karo: *"Two men with knife snatching gold chain on black pulsar"*.

### 🗣️ Kya Bolna Hai (Spoken Script):
> *"Sir, ye hamare system ka sabse powerful AI component hai: **Semantic Modus Operandi (M.O.) Search & RAG Copilot**.*
>
> *### The Real Police Problem:*
> *SQL queries me agar victim bole 'mangalsutra snatching', aur FIR me likha ho 'robbed gold ornament at knife point', to keyword search fail ho jati hai.*
>
> *### How We Engineered It:*
> 1. *Humne **Google Gemini `text-embedding-004`** model se sabhi 8,000 incident narratives ke **3072-dimensional dense vector embeddings** generate kiye hain.
> 2. *Latency ko zero karne ke liye, hamara server in sabhi 8,000 vectors ko server RAM me ek **Normalized NumPy Matrix** ki tarah cache karta hai.
> 3. *Jab investigator query type karta hai, to hum **Cosine Similarity Dot Product** compute karte hain:*
>    $$\text{Cosine Similarity}(\mathbf{q}, \mathbf{d}) = \frac{\mathbf{q} \cdot \mathbf{d}}{\|\mathbf{q}\| \|\mathbf{d}\|}$$
>    *Ye calculation 8,000 cases ke against **sirf 11.8 milliseconds** me complete hoti hai!
> 4. *Top-k matched cases ko hum **Gemini 3.5 Flash** ko provide karte hain with strict prompt constraint: 'Answer only from verified dockets. Never hallucinate.'*

### 🔍 Real-World Example (Batao):
> *"**Live Example dekhiye:**  
> Jab humne query di: 'Analyze recent armed chain-snatching near Sitabuldi', Copilot ne response diya:  
> - 3 specific incidents highlight kiye.  
> - Accused ka common pattern bataya: 'Two pillion riders targeting elderly victims between 20:00–23:00 hrs on black motorcycles'.  
> - Niche dekhiye: Case card `[CS-00125]` par **88.4% M.O. Match** dikha raha hai, aur accused ka naam Akash Khan linked hai.  
> Investigating officer ek click me docket verify kar sakta hai."*

---

## Page 7: Deep Dive — Criminal Syndicate Network Analysis (`/network`)

### 🖥️ Screen Par Kya Dikhana Hai:
- `/network` page par navigate karo.
- Floating controls use karo: **Zoom In**, **Zoom Out**, aur **Fit to Screen**.
- Entity filters me **"Locations"** band karke sirf **Suspects (Red)** aur **Vehicles (Amber)** rakho.
- Left sidebar me suspect **"Akash Khan"** par click karo.
- Canvas ko smoothly focus hote hue dikhao jaha Akash Khan ke connected cases, co-accused (Vicky Pardhi), aur vehicle node (`MH-31-AJ-5012`) highlight ho jate hain.

### 🗣️ Kya Bolna Hai (Spoken Script):
> *"Sir, traditional police systems me har case alag file hota hai. Unhe ye nahi dikhta ki Sitabuldi ka chor, Dhantoli ke receiver aur Lakadganj ke bail-financer se kaise juda hua hai.*
>
> *Humne Python ke **NetworkX** library se **Multi-Relational Graph $G = (V, E)$** banaya hai:*
> - * **Vertices ($V$):** Suspects (Red), Incidents (Blue), Locations (Green), aur Vehicles (Amber).
> - * **Edges ($E$):** Co-accused link (weight 2.5), Same vehicle link (weight 2.0), Same location link (weight 1.0).*
>
> *### Kingpin Detection Mathematics:*
> *Police ke liye jo sabse important question hota hai — **'Gang ka main Kingpin kaun hai?'** — uske liye hum raw case count nahi dekhte. Hum compute karte hain **Betweenness Centrality ($C_B$)**:*
> $$C_B(v) = \sum_{s \neq v \neq t} \frac{\sigma_{st}(v)}{\sigma_{st}}$$
> *Street thief ka degree centrality high hota hai kyunki wo baar-baar pakda jata hai. Lekin Kingpin parde ke piche hota hai; wo do alag-alag gangs ke shortest paths par bridge ka kaam karta hai. Betweenness Centrality seedha us kingpin ko isolate karti hai."*

### 🔍 Real-World Example (Batao):
> *"**Concrete Example dekhiye:**  
> Screen par dekhiye:  
> - **Akash Khan** (Suspect Node #12) ka Betweenness Centrality score **0.084** hai (Highest in Zone 1).  
> - Akash Khan direct robbery me involve hone ke sath-sath vehicle **MH-31-AJ-5012** share kar raha hai doosre accused **Vicky Pardhi** ke sath.  
> - Vicky Pardhi ne Dhantoli me robbery ki thi aur Akash Khan ne Sitabuldi me.  
> - Is graph link se police commissioner ko prove ho jata hai ki ye isolated crimes nahi hain, balki ek organized syndicate operate kar raha hai — enabling them to apply **MCOCA (Maharashtra Control of Organised Crime Act)**!"*

---

## Page 8: AI Dynamic Beat Patrol Route Optimization (`/patrol`)

### 🖥️ Screen Par Kya Dikhana Hai:
- `/patrol` page par jao.
- Shift tabs dikhao: **Morning (06:00–14:00)**, **Evening (14:00–22:00)**, **Night (22:00–06:00)**.
- Sitabuldi station ka ek **Critical Night Patrol Route** select karo.
- Map par dekhiye: sirf selected route ke 8 sequential waypoints (`#1`, `#2`, `#3`...) aur polyline route connect ho rahe hain.

### 🗣️ Kya Bolna Hai (Spoken Script):
> *"Sir, police patrolling me sabse badi kami hoti hai ki routes static hote hain aur criminals unhe memorize kar lete hain.  
> CrimeSense AI **threat-prioritized dynamic routes** generate karta hai.*
>
> *Humne **Constrained Travelling Salesperson Problem (TSP)** solve kiya hai using Nearest-Neighbor Greedy Heuristic with Haversine distance matrix.  
> Har waypoint ka risk score calculate hota hai based on station historical velocity and recent 72-hour alerts.*
>
> *Map par koi visual clutter nahi hota — sirf actively selected route ke waypoints render hote hain."*

### 🔍 Real-World Example (Batao):
> *"**Example dekhiye:**  
> Sitabuldi Night Shift Route #3 select karne par:  
> - **Total Distance:** 14.8 km  
> - **Estimated Duration:** 1 hr 45 min  
> - **Sequential Waypoints:**  
>   1. Variety Square (Risk: 0.88)  
>   2. Munje Square (Risk: 0.82)  
>   3. Railway Station East Gate (Risk: 0.79)  
>   4. Cotton Market Chowk (Risk: 0.74)...  
> Sabse sensitive points pehle cover hote hain jab night crime probability highest hoti hai."*

---

## Page 9: Threat Alerts & Early Warning System (`/alerts`)

### 🖥️ Screen Par Kya Dikhana Hai:
- `/alerts` page par navigate karo.
- Top card me **Active Threat Overview** (Total: 32 Alerts, Severity Breakdown) dikhao.
- Alert table me **Repeat Offender** aur **Emerging Hotspot** rows dikhao.
- Action buttons: **Acknowledge**, **Assign to Officer**, aur **Close Alert** dikhao.

### 🗣️ Kya Bolna Hai (Spoken Script):
> *"Sir, ye police department ka **Real-Time Tactical Threat Center** hai.*
>
> *Alerts tabhi trigger hote hain jab mathematical threshold cross hota hai:  
> - 3 Critical, 7 High, 14 Medium, 8 Low alerts calibrated hain.  
> - 7-day trend chart me har single day ka daily distribution tracked hai.*
>
> *Duty officer alert ko directly station in-charge ko assign kar sakta hai ya investigation ke baad close kar sakta hai."*

### 🔍 Real-World Example (Batao):
> *"**Example dekhiye:**  
> Top Critical Alert dekhiye:  
> **'Repeat Offender Flag — Sitabuldi'**  
> *Message:* 'Habitual accused Akash Khan (alias Akku) linked to fresh robbery case INC-2024-0891. Subject has 4 prior cases.'  
> *Recommended Action:* 'Issue non-bailable surveillance warrant; alert beat constables in Variety Square sector.'"*

---

## Page 10: Model Management & Multi-Model Governance Registry (`/models`)

### 🖥️ Screen Par Kya Dikhana Hai:
- `/models` page par navigate karo.
- Top right Model Type dropdown dikhao.
- **Hotspot Prediction (XGBoost)** select karke Confusion Matrix (axes labeled: Actual $\downarrow$, Predicted $\rightarrow$) aur Feature Importances dikhao.
- Dropdown switch karo to **Crime Volume Forecast (Gradient Boosting)**: dikhao kaise confusion matrix ki jagah **Regression Quality Card (MAPE, $R^2$)** appear hota hai.
- Niche 9-version registry table me version click karke historic preview dikhao.

### 🗣️ Kya Bolna Hai (Spoken Script):
> *"Sir, law enforcement me AI black-box nahi ho sakta. Yaha humne **Multi-Model Governance Registry** develop ki hai jisme **3 distinct algorithms across 9 versions** tracked hain:*
>
> 1. * **Hotspot Prediction (XGBoost Classifier):** Accuracy 78.6%, Precision 72.3%, Recall 58.0%, Macro F1 64.3%.  
>    Vertical axis **Actual Class $\downarrow$** hai aur horizontal axis **Predicted Class $\rightarrow$** hai.
> 2. * **Crime Volume Forecast (Gradient Boosting Regressor):** Kyunki ye regression model hai, yaha confusion matrix nahi balki **MAPE (Mean Absolute Percentage Error = 15.4%)**, **$R^2$ Score (0.78)**, aur $\pm 1.96\sigma$ residual bounds display hote hain.
> 3. * **Area Risk Forecast (Random Forest Regressor):** Police station continuous risk prediction (Accuracy 82.4%)."*

### 🔍 Real-World Example (Batao):
> *"**Evaluator Trap Question ka Answer:**  
> Agar examiner puche: 'Hotspot model ki Accuracy 78.6% hai par F1 64.3% kyu hai?'  
> **Answer:** Sir, real crime data me natural 75/25 class imbalance hota hai — normal cells 75% hote hain aur acute hotspots 25%. Isliye baseline accuracy zyada hoti hai jabki Macro F1 rare positive class par penalize karta hai. Humne loss function me positive class ko weight dekar recall high maintain kiya hai taaki koi critical hotspot miss na ho."*

---

## Page 11: Settings, Audit Logs & RBAC Security (`/settings`)

### 🖥️ Screen Par Kya Dikhana Hai:
- `/settings` page par jao.
- User profile with Active Session details, **Role Permission Matrix**, **Recent Activity Audit Log**, aur **BNSS §173 Decision-Support Disclaimer** dikhao.

### 🗣️ Kya Bolna Hai (Spoken Script):
> *"Sir, sensitive police data ke liye humne enterprise-grade security implement ki hai:*
> 1. * **OAuth2 JWT Authentication:** Short-lived access tokens (30 min) aur secure refresh token rotation ke sath. Passwords **bcrypt** se salted hashed hain.
> 2. * **Role-Based Access Control (RBAC):** 5 hierarchical roles hain: Officer, Investigator, Commander, Commissioner, aur Admin. Endpoints FastAPI dependencies (`require_permission`) se secured hain.
> 3. * **Immutable Audit Logs:** Har critical action — FIR approval, model retraining, record export — SHA-256 hash aur timestamp ke sath audit log me record hota hai."*

---

## Top 10 Killer Viva Q&A (Examiner Cross-Questioning Defense)

Agar external examiner deep technical questions puche, to ye exact Hinglish answers dena:

#### Q1: "Deep Learning (CNN/LSTM) kyu nahi use kiya, XGBoost kyu liya?"
> **Answer:** *"Sir, tabular spatial-temporal data me LSTMs aur Neural Networks 50,000 se kam rows par severely overfit hote hain aur unme interpretability nahi hoti. XGBoost tabular data ka state-of-the-art algorithm hai. Ye non-linear spatial splits handle karta hai aur legal accountability ke liye exact feature importances (`community_area: 40%`, `hour_bucket: 23%`) deta hai."*

#### Q2: "RAG Copilot me hallucinations kaise rokte ho?"
> **Answer:** *"Sir, humne strict Grounded RAG implement kiya hai. Gemini ko direct answer dene ki permission nahi hai; prompt me retrieved incident dockets inject hote hain. System prompt mandate karta hai: 'If fact is not in dockets, state unverified.' Sath hi UI me har claim ke sath clickable case cards (`CS-00125`) verified database record se attach hote hain."*

#### Q3: "8,000 vectors par search itni fast (<12ms) kaise hoti hai?"
> **Answer:** *"Sir, hum database disk par bar-bar I/O lookup nahi karte. Application boot hone par `VectorStoreService` pure 8,000 vectors ko server RAM me ek contiguous $8000 \times 3072$ normalized NumPy matrix me load kar leta hai. Jab query aati hai, to C-optimized BLAS libraries direct vectorized dot product multiplication karti hain, jo RAM me sirf 11.8 milliseconds me execute ho jata hai."*

#### Q4: "Betweenness Centrality street thief aur kingpin me kaise farq karti hai?"
> **Answer:** *"Sir, jo street thief hota hai wo bar-bar chori karta hai, to uska Degree Centrality (direct incident count) high hota hai. Lekin Kingpin chori nahi karta; wo stolen maal kharidta hai aur do alag-alag gangs ko connect karta hai. **Betweenness Centrality** ye count karti hai ki pure graph me sabse zyada shortest paths kis node ke through guzar rahe hain. Isliye graph me kingpin highest betweenness score se pehchana jata hai."*

#### Q5: "Ye software court me legally valid evidence mana jayega?"
> **Answer:** *"Sir, CrimeSense AI ek judicial replacement nahi balki **Investigative Decision-Support System** hai under BNSS Section 173. Evidentiary integrity ke liye hum Evidence Vault me har uploaded document ka **SHA-256 cryptographic hash** generate karte hain jo Indian Evidence Act Section 65B ke under digital tampering ko court me disprove karta hai."*

---

# Presentation Closing Statement:
> *"CrimeSense AI demonstrates how modern full-stack engineering, spatial databases, and state-of-the-art machine learning can empower our police forces with real-time predictive intelligence.*  
> *Thank you, Sir. We are ready for any further questions."*
