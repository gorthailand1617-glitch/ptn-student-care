import rosterRaw from './ptnRoster69.json';
import { OwedSubjectItem, Student, TermSnapshot } from '../types';
import { createSupportPlan } from '../utils/riskEngine';
import { formatAdvisorsForRoom, getAdvisorsForRoom } from './advisors';

interface RawRosterItem {
  no: number;
  code: string;
  name: string;
  room: string;
}

export function buildRealSeedStudents(): Student[] {
  const list = rosterRaw as RawRosterItem[];
  return list.map((item, idx) => {
    const isTransition = item.room.startsWith('ม.1/') || item.room.startsWith('ม.4/') ? 1 : 0;
    const creditsReq = item.room.startsWith('ม.6/') ? 81 : item.room.startsWith('ม.3/') ? 77 : 41;

    const mod = idx % 25;
    let attendancePct = 94;
    let lowAttendanceSubjects = 0;
    let owedSubjects = 0;
    let owedSubjectDetails: OwedSubjectItem[] = [];
    let activitiesPassed = 3;
    let readingWriting: 'ผ่าน' | 'ปรับปรุง' = 'ผ่าน';
    let hasEquitySupport = mod % 5 === 0 ? 1 : 0;
    let history: ('g' | 'y' | 'r')[] = ['g', 'g', 'g'];
    let prevTermOutcome: number | null = idx < 45 ? 0 : null;
    let screening7 = [0, 0, 0, 0, 0, 0, 0];
    const plans = [];

    if (mod === 0) {
      attendancePct = 71;
      lowAttendanceSubjects = 2;
      owedSubjects = 3;
      owedSubjectDetails = [
        { subjectCode: 'ค31101', subjectName: 'คณิตศาสตร์พื้นฐาน', grade: 'ร', missingTask: 'แบบฝึกหัดบทที่ 3 และสอบแก้ตัว' },
        { subjectCode: 'อ31101', subjectName: 'ภาษาอังกฤษพื้นฐาน', grade: '0', missingTask: 'ชิ้นงาน Essay และแบบทดสอบปลายภาค' },
        { subjectCode: 'ว31101', subjectName: 'วิทยาศาสตร์กายภาพ', grade: 'มส', missingTask: 'กิจกรรมซ่อมเสริมเวลาเรียน 4 ชม.' },
      ];
      activitiesPassed = 2;
      history = ['y', 'r', 'r'];
      prevTermOutcome = idx < 45 ? 1 : null;
      screening7 = [0, 0, 0, 0, 2, 0, 0];
      plans.push(createSupportPlan(0, `ครูที่ปรึกษา ${item.room}`));
      if (idx === 0) {
        plans.push(createSupportPlan(4, `ครูที่ปรึกษา ${item.room}`));
      }
    } else if (mod === 7 || mod === 14) {
      attendancePct = 83;
      lowAttendanceSubjects = 1;
      owedSubjects = 1;
      owedSubjectDetails = [
        { subjectCode: 'ท21101', subjectName: 'ภาษาไทยพื้นฐาน', grade: 'ร', missingTask: 'ส่งสมุดบันทึกการอ่าน' },
      ];
      history = ['g', 'y', 'y'];
      prevTermOutcome = idx < 45 ? 1 : null;
      if (mod === 7) plans.push(createSupportPlan(1, `ครูที่ปรึกษา ${item.room}`));
    } else if (mod === 19) {
      readingWriting = 'ปรับปรุง';
      owedSubjects = 1;
      owedSubjectDetails = [
        { subjectCode: 'ส21101', subjectName: 'สังคมศึกษา', grade: 'ร', missingTask: 'โครงงานวิเคราะห์ข่าว' },
      ];
      history = ['g', 'g', 'y'];
    }

    const cohortSnapshots: TermSnapshot[] = [
      {
        termLabel: '2568/1',
        risk: history[0],
        passedCriteria: history[0] === 'r' ? 2 : history[0] === 'y' ? 4 : 5,
        plansCount: history[0] === 'g' ? 0 : 1,
      },
      {
        termLabel: '2568/2',
        risk: history[1],
        passedCriteria: history[1] === 'r' ? 2 : history[1] === 'y' ? 4 : 5,
        plansCount: history[1] === 'g' ? 0 : 1,
      },
    ];

    const hasHomeCoords = mod === 0 || mod === 7 || mod === 14 || mod === 19;
    const baseLat = 16.4892;
    const baseLng = 102.8351;
    const latOffset = ((idx % 13) - 6) * 0.0045;
    const lngOffset = (((idx * 7) % 13) - 6) * 0.0045;

    const parentPhone = `08${(idx % 9) + 1}-${String(100 + (idx % 899))}-${item.code.slice(-4).padStart(4, '0')}`;

    return {
      id: item.code,
      no: item.no,
      code: item.code,
      name: item.name,
      room: item.room,
      studentPhotoUrl: '',
      guardians: [
        {
          id: `g-${item.code}-1`,
          name: `ผู้ปกครองของ ${item.name.split(' ')[0]}`,
          relation: idx % 2 === 0 ? 'มารดา' : 'บิดา',
          phone: parentPhone,
          photoUrl: '',
        },
      ],
      advisor: formatAdvisorsForRoom(item.room),
      advisors: getAdvisorsForRoom(item.room),
      location: hasHomeCoords
        ? {
            lat: Number((baseLat + latOffset).toFixed(5)),
            lng: Number((baseLng + lngOffset).toFixed(5)),
          }
        : undefined,
      landmarkNote:
        mod === 0
          ? 'ซอยข้างวัดบ้านทุ่ม หลังคาสีฟ้า มีร้านขายของชำหน้าปากซอย'
          : mod === 7
          ? 'บ้านไม้สองชั้น ตรงข้ามศาลากลางบ้าน'
          : '',
      handoverNote:
        mod === 0
          ? 'น้องต้องช่วยครอบครัวขายของตอนเย็น แนะนำนัดส่งงานช่วงพักกลางวัน และติดต่อคุณแม่ช่วงหลัง 18:00 น. จะได้ผลดีที่สุด'
          : '',
      parentPhone: `08${(idx % 9) + 1}-${String(100 + (idx % 899))}-${item.code.slice(-4).padStart(4, '0')}`,
      preferredContactTime: mod === 0 ? 'หลัง 18:00 น. (วันจันทร์–ศุกร์)' : 'ช่วงพักกลางวัน 12:00–13:00 น.',
      emergencyContactName: mod === 0 ? 'คุณยาย (ผู้ปกครองสำรอง)' : '',
      emergencyContactPhone: mod === 0 ? '089-765-4321' : '',
      tel4: item.code.slice(-4).padStart(4, '0'),
      creditsEarned: Math.max(10, creditsReq - owedSubjects * 2 - 4),
      creditsRequired: creditsReq,
      attendancePct,
      lowAttendanceSubjects,
      owedSubjects,
      owedSubjectDetails,
      activitiesPassed,
      readingWriting,
      hasEquitySupport,
      isTransitionGrade: isTransition,
      history,
      cohortSnapshots,
      prevTermOutcome,
      plans,
      screening7,
      screening9S: '',
      visits: [],
      asks: [],
      goalsDone: {},
      parentVerified: false,
      parentConsent: false,
      lineMessageState: idx === 0 ? 1 : 0,
    };
  });
}

export function buildInitialRoomUpdates(students: Student[]): Record<string, number> {
  const map: Record<string, number> = {};
  const rooms = Array.from(new Set(students.map((s) => s.room))).sort();
  rooms.forEach((r, i) => {
    map[r] = i % 6 === 0 ? 9 : i % 4 === 0 ? 4 : 1;
  });
  return map;
}
