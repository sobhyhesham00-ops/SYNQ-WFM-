import { Agent, Shift, Request, User } from './types';
import { format, addDays, startOfWeek } from 'date-fns';

const today = new Date();
const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 0 }); // Sunday start

export const generateDatesForWeek = (startDate?: Date) => {
  const baseDate = startDate || today;
  const startOfSelectedWeek = startOfWeek(baseDate, { weekStartsOn: 0 }); // Sunday start
  return Array.from({ length: 7 }).map((_, i) => {
    return format(addDays(startOfSelectedWeek, i), 'yyyy-MM-dd');
  });
};

const weekDates = generateDatesForWeek();

export const getHeadsetAvatar = (index: number) => {
  const styles = [
    // 1. Amy Tan (Female, short dark bob, red shirt, pink background)
    {
      bg: '#FAF0F2',
      skin: '#FFDFD3',
      hair: '#4A314A',
      hairStyle: 'bob',
      shirt: '#D15252',
      headset: '#3A4D8F',
    },
    // 2. Andrea Edwards (Male, brown sweep, light blue/white shirt)
    {
      bg: '#EFF5FA',
      skin: '#FFDFD3',
      hair: '#8A5D3B',
      hairStyle: 'short-spike',
      shirt: '#6CA1C7',
      headset: '#3A4D8F',
    },
    // 3. Emily Prowse (Female, black bun, dark grey shirt)
    {
      bg: '#F3EFF7',
      skin: '#FFDFD3',
      hair: '#1E1A24',
      hairStyle: 'curly-bun',
      shirt: '#5E647A',
      headset: '#3A4D8F',
    },
    // 4. Harold Yuen (Male, blond hair, yellow striped shirt)
    {
      bg: '#FAF6EB',
      skin: '#FFDFD3',
      hair: '#EBC45E',
      hairStyle: 'blond-sweep',
      shirt: '#EBC45E',
      headset: '#3A4D8F',
    },
    // 5. Jack Lewis (Female, Hijab pink, white shirt)
    {
      bg: '#FAF0F4',
      skin: '#FFDFD3',
      hair: '#DB507C', // Hijab pink
      hairStyle: 'hijab',
      shirt: '#FFFFFF',
      headset: '#3A4D8F',
    },
    // 6. Mikel Musa (Male, glasses, reddish hair, dark overalls)
    {
      bg: '#F5ECE6',
      skin: '#FFDFD3',
      hair: '#C46246',
      hairStyle: 'glasses-short',
      shirt: '#2C3440',
      headset: '#3A4D8F',
    },
    // 7. Vaishvi Chowdhury (Female, orange bun, blue jacket)
    {
      bg: '#F7EFE8',
      skin: '#FFDFD3',
      hair: '#E57354',
      hairStyle: 'orange-bun',
      shirt: '#1E3670',
      headset: '#3A4D8F',
    },
    // 8. Andreas Gor (Male, spike black hair, green shirt)
    {
      bg: '#EEFAF7',
      skin: '#FFDFD3',
      hair: '#323446',
      hairStyle: 'black-spike',
      shirt: '#82A8A4',
      headset: '#3A4D8F',
    },
    // 9. Hesham Sobhy (Female/TL, dark brown curly hair, yellow shirt)
    {
      bg: '#FCF3EB',
      skin: '#FFDFD3',
      hair: '#644234',
      hairStyle: 'curly',
      shirt: '#E8A660',
      headset: '#3A4D8F',
    }
  ];

  const s = styles[index % styles.length];

  let hairPath = '';
  let extraElements = '';

  if (s.hairStyle === 'bob') {
    hairPath = `
      <path d="M25 45 C25 20, 75 20, 75 45 C75 52, 70 55, 70 58 L72 70 L28 70 L30 58 C30 55, 25 52, 25 45 Z" fill="${s.hair}" />
      <path d="M30 35 C38 25, 62 25, 70 35 C68 28, 55 24, 50 28 C45 24, 32 28, 30 35 Z" fill="${s.hair}" opacity="0.9" />
    `;
  } else if (s.hairStyle === 'short-spike') {
    hairPath = `
      <path d="M32 36 C30 25, 70 20, 68 36 C70 30, 60 22, 50 25 C45 22, 35 28, 32 36 Z" fill="${s.hair}" />
      <path d="M45 22 L50 16 L55 21 L60 16 L65 24 Z" fill="${s.hair}" />
    `;
  } else if (s.hairStyle === 'curly-bun') {
    hairPath = `
      <circle cx="50" cy="22" r="14" fill="${s.hair}" />
      <path d="M28 44 C28 25, 72 25, 72 44 Z" fill="${s.hair}" />
    `;
  } else if (s.hairStyle === 'blond-sweep') {
    hairPath = `
      <path d="M30 38 C32 24, 68 22, 70 34 C65 26, 52 24, 45 28 C38 25, 32 32, 30 38 Z" fill="${s.hair}" />
      <path d="M68 34 C72 30, 75 35, 70 40 Z" fill="${s.hair}" />
    `;
  } else if (s.hairStyle === 'hijab') {
    hairPath = `
      <path d="M30 32 C20 40, 20 75, 50 82 C80 75, 80 40, 70 32 C65 22, 35 22, 30 32 Z" fill="${s.hair}" />
      <path d="M34 38 C34 30, 66 30, 66 38 C66 48, 62 55, 50 55 C38 55, 34 48, 34 38 Z" fill="${s.skin}" />
    `;
  } else if (s.hairStyle === 'glasses-short') {
    hairPath = `
      <path d="M32 36 C30 25, 70 25, 68 36 Z" fill="${s.hair}" />
    `;
    extraElements = `
      <circle cx="42" cy="46" r="6" fill="none" stroke="#2B2D42" stroke-width="2" />
      <circle cx="58" cy="46" r="6" fill="none" stroke="#2B2D42" stroke-width="2" />
      <line x1="48" y1="46" x2="52" y2="46" stroke="#2B2D42" stroke-width="2" />
      <line x1="33" y1="45" x2="36" y2="45" stroke="#2B2D42" stroke-width="1.5" />
      <line x1="64" y1="45" x2="67" y2="45" stroke="#2B2D42" stroke-width="1.5" />
    `;
  } else if (s.hairStyle === 'orange-bun') {
    hairPath = `
      <circle cx="50" cy="20" r="10" fill="${s.hair}" />
      <path d="M32 38 C30 25, 70 25, 68 38 Z" fill="${s.hair}" />
    `;
  } else if (s.hairStyle === 'black-spike') {
    hairPath = `
      <path d="M30 38 C28 22, 72 22, 70 38 Z" fill="${s.hair}" />
      <path d="M35 25 L42 16 L48 22 L55 15 L62 23 L67 18 L70 26 Z" fill="${s.hair}" />
    `;
  } else {
    hairPath = `
      <circle cx="34" cy="32" r="8" fill="${s.hair}" />
      <circle cx="66" cy="32" r="8" fill="${s.hair}" />
      <circle cx="30" cy="42" r="9" fill="${s.hair}" />
      <circle cx="70" cy="42" r="9" fill="${s.hair}" />
      <circle cx="40" cy="24" r="9" fill="${s.hair}" />
      <circle cx="60" cy="24" r="9" fill="${s.hair}" />
      <circle cx="50" cy="22" r="9" fill="${s.hair}" />
      <path d="M32 38 C30 25, 70 25, 68 38 Z" fill="${s.hair}" />
    `;
  }

  const headsetElements = `
    <path d="M32 44 C 32 24, 68 24, 68 44" fill="none" stroke="${s.headset}" stroke-width="3.5" stroke-linecap="round" />
    <rect x="28" y="40" width="5" height="11" rx="2" fill="${s.headset}" />
    <rect x="67" y="40" width="5" height="11" rx="2" fill="${s.headset}" />
    <path d="M30 48 Q 38 56, 46 54" fill="none" stroke="${s.headset}" stroke-width="2.5" stroke-linecap="round" />
    <circle cx="47" cy="53" r="3" fill="#15171A" />
  `;

  let shirtElement = `<path d="M25 72 C25 60, 75 60, 75 72 L75 85 L25 85 Z" fill="${s.shirt}" />`;
  if (s.hairStyle === 'short-spike') {
    shirtElement = `
      <path d="M25 72 C25 60, 75 60, 75 72 L75 85 L25 85 Z" fill="${s.shirt}" />
      <path d="M42 63 L50 72 L58 63 Z" fill="#FFFFFF" />
      <path d="M36 63 L44 75 L50 72 L44 63 Z" fill="${s.shirt}" opacity="0.8" />
      <path d="M64 63 L56 75 L50 72 L56 63 Z" fill="${s.shirt}" opacity="0.8" />
    `;
  } else if (s.hairStyle === 'glasses-short') {
    shirtElement = `
      <path d="M25 72 C25 60, 75 60, 75 72 L75 85 L25 85 Z" fill="#E27355" />
      <path d="M35 63 L39 85 L44 85 L40 63 Z" fill="${s.shirt}" />
      <path d="M65 63 L61 85 L56 85 L60 63 Z" fill="${s.shirt}" />
      <rect x="38" y="70" width="24" height="15" rx="2" fill="${s.shirt}" />
    `;
  } else if (s.hairStyle === 'blond-sweep') {
    shirtElement = `
      <path d="M25 72 C25 60, 75 60, 75 72 L75 85 L25 85 Z" fill="${s.shirt}" />
      <path d="M25 76 L75 76" stroke="#FFFFFF" stroke-width="3" />
      <path d="M25 81 L75 81" stroke="#FFFFFF" stroke-width="3" />
    `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" fill="${s.bg}" />
      ${s.hairStyle !== 'hijab' ? `
        <rect x="45" y="55" width="10" height="15" rx="4" fill="${s.skin}" />
        <circle cx="50" cy="45" r="18" fill="${s.skin}" />
        <path d="M45 50 Q 50 55, 55 50" fill="none" stroke="#8E4A35" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="43" cy="41" r="2.5" fill="#2B2D42" />
        <circle cx="57" cy="41" r="2.5" fill="#2B2D42" />
        <circle cx="39" cy="45" r="2" fill="#F0A8A8" opacity="0.6" />
        <circle cx="61" cy="45" r="2" fill="#F0A8A8" opacity="0.6" />
      ` : ''}
      ${hairPath}
      ${s.hairStyle === 'hijab' ? `
        <path d="M45 42 Q 50 47, 55 42" fill="none" stroke="#8E4A35" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="43" cy="35" r="2.5" fill="#2B2D42" />
        <circle cx="57" cy="35" r="2.5" fill="#2B2D42" />
        <circle cx="39" cy="38" r="2" fill="#F0A8A8" opacity="0.6" />
        <circle cx="61" cy="38" r="2" fill="#F0A8A8" opacity="0.6" />
      ` : ''}
      ${extraElements}
      ${shirtElement}
      ${headsetElements}
    </svg>
  `.replace(/\s+/g, ' ').trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const MOCK_USERS: User[] = [
  { id: 'tl1', username: 'h.sobhy', name: 'Hesham Sobhy', role: 'TEAM_LEADER', avatarUrl: getHeadsetAvatar(8) },
  { id: 'a1', username: 'a.tan', name: 'Amy Tan', role: 'AGENT', avatarUrl: getHeadsetAvatar(0) },
  { id: 'a2', username: 'a.edwards', name: 'Andrea Edwards', role: 'AGENT', avatarUrl: getHeadsetAvatar(1) },
  { id: 'a3', username: 'e.prowse', name: 'Emily Prowse', role: 'AGENT', avatarUrl: getHeadsetAvatar(2) },
  { id: 'a4', username: 'h.yuen', name: 'Harold Yuen', role: 'AGENT', avatarUrl: getHeadsetAvatar(3) },
  { id: 'a5', username: 'j.lewis', name: 'Jack Lewis', role: 'AGENT', avatarUrl: getHeadsetAvatar(4) },
  { id: 'a6', username: 'm.musa', name: 'Mikel Musa', role: 'AGENT', avatarUrl: getHeadsetAvatar(5) },
  { id: 'a7', username: 'v.chowdhury', name: 'Vaishvi Chowdhury', role: 'AGENT', avatarUrl: getHeadsetAvatar(6) },
  { id: 'a8', username: 'a.gor', name: 'Andreas Gor', role: 'AGENT', avatarUrl: getHeadsetAvatar(7) },
];

export const MOCK_AGENTS: Agent[] = [
  { id: 'a1', username: 'a.tan', name: 'Amy Tan', avatarUrl: getHeadsetAvatar(0), tier: 'Tier 1', totalHours: 40 },
  { id: 'a2', username: 'a.edwards', name: 'Andrea Edwards', avatarUrl: getHeadsetAvatar(1), tier: 'Tier 1', totalHours: 40 },
  { id: 'a3', username: 'e.prowse', name: 'Emily Prowse', avatarUrl: getHeadsetAvatar(2), tier: 'Tier 1', totalHours: 40 },
  { id: 'a4', username: 'h.yuen', name: 'Harold Yuen', avatarUrl: getHeadsetAvatar(3), tier: 'Tier 1', totalHours: 40 },
  { id: 'a5', username: 'j.lewis', name: 'Jack Lewis', avatarUrl: getHeadsetAvatar(4), tier: 'Tier 1', totalHours: 40 },
  { id: 'a6', username: 'm.musa', name: 'Mikel Musa', avatarUrl: getHeadsetAvatar(5), tier: 'Tier 1', totalHours: 34 },
  { id: 'a7', username: 'v.chowdhury', name: 'Vaishvi Chowdhury', avatarUrl: getHeadsetAvatar(6), tier: 'Tier 1', totalHours: 40 },
  { id: 'a8', username: 'a.gor', name: 'Andreas Gor', avatarUrl: getHeadsetAvatar(7), tier: 'Finance dept.', totalHours: 32 },
];

export const MOCK_SHIFTS: Shift[] = [
  // 1. Amy Tan (Tier 1)
  { id: 's1', agentId: 'a1', date: weekDates[0], startTime: '10:00', endTime: '19:00', type: 'Late', activities: [] },
  { id: 's2', agentId: 'a1', date: weekDates[1], startTime: '10:00', endTime: '19:00', type: 'Late', activities: [] },
  { id: 's3', agentId: 'a1', date: weekDates[2], startTime: '10:00', endTime: '19:00', type: 'Late', activities: [] },
  { id: 's4', agentId: 'a1', date: weekDates[3], startTime: '10:00', endTime: '19:00', type: 'Late', activities: [] },
  { id: 's5', agentId: 'a1', date: weekDates[5], startTime: '10:00', endTime: '19:00', type: 'Late', activities: [] },

  // 2. Andrea Edwards (Tier 1)
  { id: 's6', agentId: 'a2', date: weekDates[1], startTime: '10:00', endTime: '19:00', type: 'Late', activities: [] },
  { id: 's7', agentId: 'a2', date: weekDates[2], startTime: '10:00', endTime: '19:00', type: 'Late', activities: [] },
  { id: 's8', agentId: 'a2', date: weekDates[3], startTime: '10:00', endTime: '19:00', type: 'Late', activities: [] },
  { id: 's9', agentId: 'a2', date: weekDates[4], startTime: '10:00', endTime: '19:00', type: 'Late', activities: [] },
  { id: 's10', agentId: 'a2', date: weekDates[5], startTime: '10:00', endTime: '19:00', type: 'Late', activities: [] },

  // 3. Emily Prowse (Tier 1)
  { id: 's11', agentId: 'a3', date: weekDates[1], startTime: '08:00', endTime: '17:00', type: 'Early', activities: [] },
  { id: 's12', agentId: 'a3', date: weekDates[2], startTime: '08:00', endTime: '17:00', type: 'Early', activities: [] },
  { id: 's13', agentId: 'a3', date: weekDates[3], startTime: '08:00', endTime: '17:00', type: 'Early', activities: [] },
  { id: 's14', agentId: 'a3', date: weekDates[4], startTime: '08:00', endTime: '17:00', type: 'Early', activities: [] },
  { id: 's15', agentId: 'a3', date: weekDates[5], startTime: '08:00', endTime: '17:00', type: 'Early', activities: [] },
  { id: 's16', agentId: 'a3', date: weekDates[6], startTime: '10:00', endTime: '14:00', type: 'Available', activities: [] },

  // 4. Harold Yuen (Tier 1)
  { id: 's17', agentId: 'a4', date: weekDates[1], startTime: '08:00', endTime: '17:00', type: 'Early', activities: [] },
  { id: 's18', agentId: 'a4', date: weekDates[2], startTime: '08:00', endTime: '17:00', type: 'Early', activities: [] },
  { id: 's19', agentId: 'a4', date: weekDates[3], startTime: '08:00', endTime: '17:00', type: 'Early', activities: [] },
  { id: 's20', agentId: 'a4', date: weekDates[4], startTime: '08:00', endTime: '17:00', type: 'Early', activities: [] },
  { id: 's21', agentId: 'a4', date: weekDates[5], startTime: '08:00', endTime: '17:00', type: 'Early', activities: [] },

  // 5. Jack Lewis (Tier 1)
  { id: 's22', agentId: 'a5', date: weekDates[0], startTime: '00:00', endTime: '24:00', type: 'Vacation', activities: [] },
  { id: 's23', agentId: 'a5', date: weekDates[1], startTime: '09:00', endTime: '18:00', type: 'Standard', activities: [] },
  { id: 's24', agentId: 'a5', date: weekDates[2], startTime: '09:00', endTime: '18:00', type: 'Standard', activities: [] },
  { id: 's25', agentId: 'a5', date: weekDates[3], startTime: '09:00', endTime: '18:00', type: 'Standard', activities: [] },
  { id: 's26', agentId: 'a5', date: weekDates[4], startTime: '09:00', endTime: '12:00', type: 'Standard', activities: [] },
  { id: 's26_vac', agentId: 'a5', date: weekDates[4], startTime: '12:00', endTime: '24:00', type: 'Vacation', activities: [] },
  { id: 's27', agentId: 'a5', date: weekDates[5], startTime: '00:00', endTime: '24:00', type: 'Vacation', activities: [] },
  { id: 's28', agentId: 'a5', date: weekDates[6], startTime: '00:00', endTime: '24:00', type: 'Vacation', activities: [] },

  // 6. Mikel Musa (Tier 1)
  { id: 's29', agentId: 'a6', date: weekDates[0], startTime: '09:00', endTime: '18:00', type: 'Standard', activities: [] },
  { id: 's30', agentId: 'a6', date: weekDates[1], startTime: '09:00', endTime: '18:00', type: 'Standard', activities: [] },
  { id: 's31', agentId: 'a6', date: weekDates[2], startTime: '09:00', endTime: '18:00', type: 'Standard', activities: [] },
  { id: 's32', agentId: 'a6', date: weekDates[5], startTime: '09:00', endTime: '18:00', type: 'Standard', activities: [] },
  { id: 's33', agentId: 'a6', date: weekDates[6], startTime: '09:00', endTime: '18:00', type: 'Standard', activities: [] },

  // 7. Vaishvi Chowdhury (Tier 1)
  { id: 's34', agentId: 'a7', date: weekDates[1], startTime: '10:00', endTime: '19:00', type: 'Late', activities: [] },
  { id: 's35', agentId: 'a7', date: weekDates[2], startTime: '00:00', endTime: '24:00', type: 'Time off', activities: [] },
  { id: 's36', agentId: 'a7', date: weekDates[3], startTime: '10:00', endTime: '19:00', type: 'Late', activities: [] },
  { id: 's37', agentId: 'a7', date: weekDates[4], startTime: '10:00', endTime: '19:00', type: 'Late', activities: [] },
  { id: 's38', agentId: 'a7', date: weekDates[5], startTime: '10:00', endTime: '19:00', type: 'Late', activities: [] },

  // 8. Andreas Gor (Finance dept.)
  { id: 's39', agentId: 'a8', date: weekDates[0], startTime: '09:30', endTime: '18:30', type: 'Mid', activities: [] },
  { id: 's40', agentId: 'a8', date: weekDates[1], startTime: '09:30', endTime: '18:30', type: 'Mid', activities: [] },
  { id: 's41', agentId: 'a8', date: weekDates[2], startTime: '09:30', endTime: '18:30', type: 'Mid', activities: [] },
  { id: 's42', agentId: 'a8', date: weekDates[4], startTime: '10:00', endTime: '19:00', type: 'Late', activities: [] },
  { id: 's43', agentId: 'a8', date: weekDates[6], startTime: '09:00', endTime: '18:00', type: 'Standard', activities: [] },
];

export const MOCK_REQUESTS: Request[] = [
  {
    id: 'req1',
    agentId: 'a1',
    type: 'leave',
    status: 'pending',
    dateRequested: format(today, 'yyyy-MM-dd'),
    startDate: weekDates[4],
    endDate: weekDates[4],
    reason: 'Doctor appointment'
  },
  {
    id: 'req2',
    agentId: 'a2',
    type: 'swap',
    status: 'pending',
    dateRequested: format(today, 'yyyy-MM-dd'),
    sourceShiftId: 's6',
    targetShiftId: 's11',
    targetAgentId: 'a3'
  }
];
