# תיק ההשקעות שלי — Portfolio Tracker

אפליקציית React + Node/Express למעקב תיק השקעות עם מחירים בזמן אמת מ-Finnhub.

---

## מבנה הפרויקט

```
portfolio-app/
├── server/          ← Express backend (Node.js)
│   ├── index.js     ← שרת + נקודות API
│   ├── db.js        ← שמירת פוזיציות ב-JSON
│   ├── data/        ← נוצר אוטומטית, מכיל positions.json
│   ├── .env         ← מפתח Finnhub (צור בעצמך)
│   └── .env.example
└── client/          ← React frontend (Vite)
    ├── index.html
    └── src/
        ├── App.jsx
        ├── api.js
        ├── utils.js
        └── components/
```

---

## הגדרה ראשונית

### 1. קבל מפתח Finnhub API (חינמי)

1. היכנס ל-[finnhub.io](https://finnhub.io) ולחץ **Get free API key**
2. הרשם עם אימייל
3. לך ל-[Dashboard](https://finnhub.io/dashboard) → תמצא את ה-API Key שלך

### 2. הגדר את קובץ ה-.env

```bash
cd server
cp .env.example .env
# ערוך את .env והכנס את המפתח שלך:
# FINNHUB_API_KEY=pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. התקן תלויות והרץ

**בטרמינל אחד — השרת:**
```bash
cd server
npm install
npm run dev       # או: npm start
# → http://localhost:3001
```

**בטרמינל שני — הקליינט:**
```bash
cd client
npm install
npm run dev
# → http://localhost:5173
```

פתח את [http://localhost:5173](http://localhost:5173) בדפדפן.

---

## API Endpoints

| Method | Path                  | תיאור                                      |
|--------|-----------------------|--------------------------------------------|
| GET    | `/api/positions`      | כל הפוזיציות                               |
| POST   | `/api/positions`      | הוסף פוזיציה חדשה                          |
| PUT    | `/api/positions/:id`  | עדכן פוזיציה (שדה בודד או כל השדות)       |
| DELETE | `/api/positions/:id`  | מחק פוזיציה                                |
| POST   | `/api/refresh-prices` | קבל מחירים עדכניים מ-Finnhub              |
| POST   | `/api/reset`          | אפס לנתוני ברירת מחדל                     |
| GET    | `/api/market-status`  | האם שוק NYSE פתוח כרגע?                   |

---

## רענון אוטומטי

- **ידני**: לחץ "↻ רענן מחירים" בכל עת
- **אוטומטי**: כל 5 דקות **בשעות המסחר בלבד**:
  - 16:30–23:00 שעון ישראל (IDT, UTC+3 קיץ)
  - ימים א'–ה' (מקביל ל-NYSE ב-09:30–16:00 ET)
  - מחוץ לשעות אלו — הרענון האוטומטי כבוי

---

## שמירת נתונים

הפוזיציות נשמרות ב-`server/data/positions.json`.  
הקובץ נוצר אוטומטית עם נתוני ברירת מחדל בהרצה הראשונה.

**לגיבוי**: שמור עותק של `server/data/positions.json`.

---

## הגבלות Finnhub (חשבון חינמי)

- 60 בקשות לדקה
- מחירים מתעדכנים בעיכוב של ~15 דקות (בשוק בארה"ב זה אמור להיות מספיק לניהול אישי)
- לנתונים בזמן אמת מלא — שדרג לתוכנית בתשלום בפינהאוב

---

## הצהרת אחריות

כלי זה הוא לצורכי מעקב אישי בלבד ואינו מהווה ייעוץ השקעות.
ההחלטה הסופית על קנייה, מכירה או שינוי יעדים היא של המשתמש בלבד.
