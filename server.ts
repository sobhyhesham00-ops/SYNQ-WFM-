import express from 'express';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import os from 'os';
import xlsx from 'xlsx';

const upload = multer({ dest: os.tmpdir() });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Username parsing logic
function formatUsername(fullName: any) {
  if (!fullName) return '';
  const nameStr = String(fullName).trim();
  const parts = nameStr.split(/\s+/);
  if (parts.length < 2) return nameStr.toLowerCase();
  
  const firstInitial = parts[0][0].toLowerCase();
  const lastName = parts[parts.length - 1].toLowerCase();
  
  return `${firstInitial}.${lastName}`;
}

const DB_FILE = path.join(process.cwd(), 'db.json');

function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    return { users: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    return { users: [] };
  }
}

function writeDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/users', (req, res) => {
    try {
      const db = readDb();
      res.json(db.users);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch users', details: error.message });
    }
  });

  // 1. Batch Seed Migration Script Endpoint
  app.post('/api/users/seed', async (req, res) => {
    try {
      const teamLeaders = [
        "Hesham Sobhy", "emad el sayed", "Amira Hassan"
      ];
      const agents = [
        "Hager Nagy", "AbdelRahman Al Sayed", "AbduAllah Salah Fahmy", "Salma Ahmed",
        "Mohamed Kamel", "Alaa Ashraf", "Farouk Darwish", "Bassant Alaa Eldin",
        "Hadeer Mohamed", "Jodie El Sayed", "Mohamed Mohamed", "Mariam walaa Gamal Mostafa",
        "Maryam Alaa Eldin", "Moaz Salah Al-Nagar", "Yomna Mohamed Ahmed", "Anan Ashraf",
        "farouk Darwish", "Eslam Samy Ashour Ali", "Hussein Ashraf", "Kholoud Fakhry",
        "Kotoz Sami Mohamed", "Mahmoud Mohamed Gamal Eldin", "Mennatallah Ahmed el sayed Salem",
        "Mohamed Amer Mohy El Din", "Mohamed Ashraf", "Mostafa Mahmoud Hamed Abd El Ghany",
        "Fatma Essam Abdelalem", "Kenzi Reda Ahmed Ali", "Mai Ashraf Elsayed", "Mariam Nagy Eraky",
        "Mohamed Alaa", "Nouran Mohamed", "Saad Eldin Tawfik", "Nouran Sharqawi", "Mohamed Youssef",
        "Magdy Hamad Abo Al Ainen", "Zeina Yasser Nessim Selim", "Ammar Ismail Helmy", "Amr Mohamed Farouk"
      ];

      const db = readDb();
      let added = 0;
      let skipped = 0;

      const processUser = (fullName: string, role: string) => {
        if (!fullName.trim()) return;
        const username = formatUsername(fullName);
        const tempPassword = Math.random().toString(36).slice(-8); // Generate temp password
        
        const existing = db.users.find((u: any) => u.username === username);
        if (existing) {
          skipped++;
        } else {
          db.users.push({
            id: Date.now() + Math.random(),
            fullName: fullName.trim(),
            username,
            password: tempPassword,
            role,
            isManualAddition: false
          });
          added++;
        }
      };

      for (const name of teamLeaders) {
        processUser(name, 'team_leader');
      }

      for (const name of agents) {
        processUser(name, 'agent');
      }

      writeDb(db);

      res.json({ message: 'Seed complete', added, skipped });
    } catch (error: any) {
      console.error('Seed error:', error);
      res.status(500).json({ error: 'Failed to seed database', details: error.message });
    }
  });

  // 2. Independent Manual Addition System
  app.post('/api/users/add-manual', async (req, res) => {
    try {
      const { fullName, role } = req.body;
      if (!fullName || !role) {
        return res.status(400).json({ error: 'fullName and role are required' });
      }

      const username = formatUsername(fullName);
      const tempPassword = Math.random().toString(36).slice(-8);

      const db = readDb();
      if (db.users.find((u: any) => u.username === username)) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const newUser = {
        id: Date.now() + Math.random(),
        fullName: fullName.trim(),
        username,
        password: tempPassword,
        role,
        isManualAddition: true
      };

      db.users.push(newUser);
      writeDb(db);

      res.json({
        message: 'User added successfully',
        user: newUser
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to add user', details: error.message });
    }
  });

  // 3. MIXED PARSER ARCHITECTURE (EXCEL + GEMINI)
  app.post('/api/schedule/upload-ai', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });
      
      // Find the first row that has more than 1 column filled
      let headerRowIndex = 0;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i].length > 1) {
          headerRowIndex = i;
          break;
        }
      }
      
      const rawDatesRow = rows[headerRowIndex].slice(1);
      const datesRow = rawDatesRow.map(dateVal => {
        if (!dateVal) return '';
        let formattedDate = String(dateVal);
        if (typeof dateVal === 'number') {
          const dateObj = xlsx.SSF.parse_date_code(dateVal);
          formattedDate = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
        } else if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
          formattedDate = dateVal.toISOString().split('T')[0];
        }
        return formattedDate;
      });
      const employeeDataList = [];
      
      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue;
        
        const fullName = String(row[0]).trim();
        const rawShifts = [];
        
        for (let j = 1; j <= datesRow.length; j++) {
          rawShifts.push(String(row[j] || '').trim());
        }
        
        employeeDataList.push({ employeeName: fullName, rawShifts });
      }

      fs.unlinkSync(req.file.path);

      const systemInstruction = "You are an expert workforce management AI parsing a call center shift roster. Analyze the provided array of text strings representing daily schedule allocations. Translate every single cell entry into standardized operational shifts, break windows, and structural status parameters.\nFollow these exact classification rules:\n- Text containing '7 AM to 4 PM' or 'Morning' -> { shiftType: 'morning', startTime: '07:00', endTime: '16:00', breaks: ['10:00', '14:00'], lunch: '12:00' }\n- Text containing '1 PM to 10 PM' or 'Evening' -> { shiftType: 'evening', startTime: '13:00', endTime: '22:00', breaks: ['16:00', '20:00'], lunch: '18:00' }\n- Text containing '10 PM to 7 AM' or 'Night' -> { shiftType: 'night', startTime: '22:00', endTime: '07:00', breaks: ['01:00', '05:00'], lunch: '03:00' }\n- Text containing 'Off' or 'Day Off' -> { shiftType: 'off', startTime: null, endTime: null, breaks: [], lunch: null }\n- Text containing 'Annual', 'Vacation', or 'Leave' -> { shiftType: 'annual_leave', startTime: null, endTime: null, breaks: [], lunch: null }\nIf an entry does not match, flag it gracefully as 'unknown_anomaly' instead of crashing.";

      const responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            employeeName: { type: Type.STRING },
            shifts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  shiftType: {
                    type: Type.STRING,
                    enum: ['morning', 'evening', 'night', 'off', 'annual_leave', 'unknown_anomaly']
                  },
                  startTime: { type: Type.STRING, nullable: true },
                  endTime: { type: Type.STRING, nullable: true },
                  breaks: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  lunch: { type: Type.STRING, nullable: true }
                },
                required: ['shiftType']
              }
            }
          },
          required: ['employeeName', 'shifts']
        }
      };

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: JSON.stringify(employeeDataList) }]
          }
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
        }
      });
      
      const parsedSchedules = JSON.parse(response.text || '[]');
      
      const db = readDb();
      if (!db.schedules) db.schedules = {};
      
      // DATABASE CONVERSION MAPPING
      for (const employeeSchedule of parsedSchedules) {
        const username = formatUsername(employeeSchedule.employeeName);
        
        const scheduleTracks = employeeSchedule.shifts.map((shiftInfo: any, index: number) => ({
          date: datesRow[index],
          ...shiftInfo
        }));
        
        if (!db.schedules[username]) {
           db.schedules[username] = [];
        }
        
        for (const track of scheduleTracks) {
          const existingTrackIndex = db.schedules[username].findIndex((t: any) => t.date === track.date);
          if (existingTrackIndex >= 0) {
            db.schedules[username][existingTrackIndex] = track;
          } else {
            db.schedules[username].push(track);
          }
        }
      }
      
      writeDb(db);
      
      res.json({ message: 'AI Parsing and database update successful', processedCount: parsedSchedules.length });

    } catch (error: any) {
      console.error('Error processing schedule with AI:', error);
      res.status(500).json({ error: 'Failed to process the schedule file with AI.', details: error.message, stack: error.stack });
    }
  });

  
  app.post('/api/schedule/upload-ai', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      
      if (rows.length < 2) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Invalid schedule format' });
      }
      
      let headerRowIndex = 0;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i].length > 1) {
          headerRowIndex = i;
          break;
        }
      }
      
      const datesRow = rows[headerRowIndex];
      const employeeData = [];
      
      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue;
        
        const fullName = row[0];
        const scheduleEntries = [];
        
        for (let j = 1; j < datesRow.length; j++) {
          const dateVal = datesRow[j];
          if (!dateVal) continue;
          
          let formattedDate = dateVal;
          if (typeof dateVal === 'number') {
            const dateObj = xlsx.SSF.parse_date_code(dateVal);
            formattedDate = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
          } else if (dateVal instanceof Date) {
            formattedDate = dateVal.toISOString().split('T')[0];
          }
          
          const shiftVal = row[j] || 'Off';
          scheduleEntries.push({
            date: formattedDate,
            text: String(shiftVal)
          });
        }
        
        employeeData.push({
          fullName,
          scheduleEntries
        });
      }
      
      fs.unlinkSync(req.file.path);

      // Pass to Gemini
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: JSON.stringify(employeeData),
        config: {
          systemInstruction: `You are an expert workforce management AI parsing a call center shift roster. Analyze the provided array of text strings representing daily schedule allocations. Translate every single cell entry into standardized operational shifts, break windows, and structural status parameters.
Follow these exact classification rules:
- Text containing '7 AM to 4 PM' or 'Morning' -> { shiftType: 'morning', startTime: '07:00', endTime: '16:00', breaks: ['10:00', '14:00'], lunch: '12:00' }
- Text containing '1 PM to 10 PM' or 'Evening' -> { shiftType: 'evening', startTime: '13:00', endTime: '22:00', breaks: ['16:00', '20:00'], lunch: '18:00' }
- Text containing '10 PM to 7 AM' or 'Night' -> { shiftType: 'night', startTime: '22:00', endTime: '07:00', breaks: ['01:00', '05:00'], lunch: '03:00' }
- Text containing 'Off' or 'Day Off' -> { shiftType: 'off', startTime: null, endTime: null, breaks: [], lunch: null }
- Text containing 'Annual', 'Vacation', or 'Leave' -> { shiftType: 'annual_leave', startTime: null, endTime: null, breaks: [], lunch: null }
If an entry does not match, flag it gracefully as 'unknown_anomaly' instead of crashing.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                fullName: { type: Type.STRING },
                schedules: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      date: { type: Type.STRING },
                      shiftType: { type: Type.STRING },
                      startTime: { type: Type.STRING, nullable: true },
                      endTime: { type: Type.STRING, nullable: true },
                      breaks: { type: Type.ARRAY, items: { type: Type.STRING } },
                      lunch: { type: Type.STRING, nullable: true }
                    }
                  }
                }
              }
            }
          }
        }
      });
      
      const parsedData = JSON.parse(response.text || '[]');
      
      const db = readDb();
      if (!db.schedules) {
        db.schedules = {};
      }
      
      const processedAgents = [];
      const allShifts = [];
      
      for (const item of parsedData) {
        const username = formatUsername(item.fullName);
        const dbUser = db.users.find((u: any) => u.username === username);
        const role = dbUser ? (dbUser.role === 'team_leader' ? 'Team Leader' : 'Tier 1') : 'Tier 1';
        
        processedAgents.push({
          name: item.fullName,
          username: username,
          tier: role,
          totalHours: 40
        });
        
        if (!db.schedules[username]) {
          db.schedules[username] = [];
        }
        
        for (const shift of item.schedules) {
          const shiftRecord = {
            username: username,
            date: shift.date,
            shiftType: shift.shiftType,
            startTime: shift.startTime,
            endTime: shift.endTime,
            breaks: shift.breaks || [],
            lunch: shift.lunch
          };
          allShifts.push(shiftRecord);
          db.schedules[username].push(shiftRecord);
        }
      }
      
      writeDb(db);
      
      res.json({ agents: processedAgents, shifts: allShifts, message: 'AI Parsing and database sync complete' });
    } catch (error: any) {
      console.error('Error processing schedule with AI:', error);
      res.status(500).json({ error: 'Failed to process the schedule file with AI.', details: error.message, stack: error.stack });
    }
  });


  app.post('/api/upload-schedule', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Expected output format
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      // Convert sheet to a 2D array
      const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      
      if (rows.length < 2) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Invalid schedule format' });
      }
      
      // Find the first row that has more than 1 column filled
      let headerRowIndex = 0;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i].length > 1) {
          headerRowIndex = i;
          break;
        }
      }
      
      const datesRow = rows[headerRowIndex];
      const shifts: any[] = [];
      const agents: any[] = [];
      
      const db = readDb();
      
      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue;
        
        const fullName = row[0];
        const username = formatUsername(fullName);
        
        const dbUser = db.users.find((u: any) => u.username === username);
        const role = dbUser ? (dbUser.role === 'team_leader' ? 'Team Leader' : 'Tier 1') : 'Tier 1';
        
        agents.push({
          name: fullName,
          username: username,
          tier: role,
          totalHours: 40
        });
        
        for (let j = 1; j < datesRow.length; j++) {
          const dateVal = datesRow[j];
          if (!dateVal) continue;
          
          const shiftVal = row[j] || 'Off';
          let shiftType = shiftVal;
          let startTime = null;
          let endTime = null;
          
          const match = typeof shiftVal === 'string' ? shiftVal.match(/(\d+(?:\.\d+)?\s*(?:AM|PM|am|pm))\s+to\s+(\d+(?:\.\d+)?\s*(?:AM|PM|am|pm))/i) : null;
          
          if (match) {
            const parseTime = (timeStr: string) => {
              const t = timeStr.trim().toLowerCase();
              const isPM = t.includes('pm');
              let [h] = t.replace(/(am|pm)/, '').trim().split(':');
              let numH = parseInt(h, 10);
              if (isPM && numH < 12) numH += 12;
              if (!isPM && numH === 12) numH = 0;
              return `${numH.toString().padStart(2, '0')}:00`;
            };
            
            startTime = parseTime(match[1]);
            endTime = parseTime(match[2]);
            
            const startH = parseInt(startTime.split(':')[0], 10);
            if (startH >= 4 && startH < 12) {
              shiftType = 'Early';
            } else if (startH >= 12 && startH < 20) {
              shiftType = 'Late';
            } else {
              shiftType = 'Night';
            }
          } else {
            shiftType = shiftVal;
          }
          
          let formattedDate = dateVal;
          if (typeof dateVal === 'number') {
            const dateObj = xlsx.SSF.parse_date_code(dateVal);
            formattedDate = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
          } else if (dateVal instanceof Date) {
            formattedDate = dateVal.toISOString().split('T')[0];
          }
          
          shifts.push({
            username: username,
            date: formattedDate,
            shiftType: shiftType,
            startTime: startTime,
            endTime: endTime
          });
        }
      }

      // Cleanup
      fs.unlinkSync(req.file.path);

      res.json({ agents, shifts });
    } catch (error: any) {
      console.error('Error processing schedule:', error);
      res.status(500).json({ error: 'Failed to process the schedule file.', details: error.message, stack: error.stack });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
