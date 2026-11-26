import { TeacherStaff } from '../types';

export interface AdvisorInfo {
  name: string;
  position: string;
}

export const ADVISOR_ORDER_DATA = {
  orderRef: 'คำสั่งโรงเรียนเปรมติณสูลานนท์ ที่ 56/2569 (ลงวันที่ 10 พฤศจิกายน 2569)',
  principal: {
    name: 'นางสาวสิริลักษณ์ พรสุวรรณ์',
    position: 'ผู้อำนวยการโรงเรียนเปรมติณสูลานนท์',
  },
  homeroomAdvisors: {
    'ม.1/1': [{ name: 'นางสาวจันทร์เพ็ญ พันธุโพธิ์', position: 'ครู' }],
    'ม.1/2': [{ name: 'นางสาวศิริลักษณ์ ศิริเกษ', position: 'ครูช่วยสอน' }],
    'ม.1/3': [
      { name: 'นายพศิน พิมพ์คำไหล', position: 'ครูช่วยสอน' },
      { name: 'นางสาวพรทิพย์ ใจอ่อน', position: 'ครูช่วยสอน' },
    ],
    'ม.2/1': [{ name: 'นายธนาภิวัฒน์ ทองคำ', position: 'ครู' }],
    'ม.2/2': [{ name: 'นายกิตตินันท์ ศรีโยธา', position: 'ครูช่วยสอน' }],
    'ม.2/3': [{ name: 'นายนัทพล อินทะมาตร์', position: 'ครู' }],
    'ม.3/1': [{ name: 'นายกรกฎ รัตนะโช', position: 'ครู' }],
    'ม.3/2': [{ name: 'นายรักษชน รักษาเคน', position: 'ครู' }],
    'ม.3/3': [{ name: 'นางสาวเกตุวดี บุญเทพ', position: 'ครู' }],
    'ม.4/1': [{ name: 'นายสถิตย์ ศรีวัชรกุล', position: 'ครู' }],
    'ม.4/2': [{ name: 'นางสาววิไลวรรณ ศรีคำมี', position: 'ครู' }],
    'ม.4/3': [
      { name: 'นางสาวอรพินท์ สีลาโครต', position: 'ครู' },
      { name: 'นายประสิทธิ์ ดีแป้น', position: 'ครู' },
    ],
    'ม.5/1': [{ name: 'นายปิยะทัศน์ แสงสว่าง', position: 'ครู' }],
    'ม.5/2': [{ name: 'นางสาวกัลยา สมประสงค์', position: 'ครู' }],
    'ม.5/3': [{ name: 'นายวัฒนา มีศิลป์', position: 'ครู' }],
    'ม.6/1': [{ name: 'นางสาวธนภรณ์ สุพรมพิทักษ์', position: 'ครู' }],
    'ม.6/2': [
      { name: 'นายสัญชัย แสนโคก', position: 'ครู' },
      { name: 'นางสาวอริษา ผุยมูลตรี', position: 'ครู' },
    ],
    'ม.6/3': [
      { name: 'นายสัญชัย แสนโคก', position: 'ครู' },
      { name: 'นางสาวอริษา ผุยมูลตรี', position: 'ครู' },
    ],
  } as Record<string, AdvisorInfo[]>,
};

export function getAdvisorsForRoom(room: string): AdvisorInfo[] {
  return ADVISOR_ORDER_DATA.homeroomAdvisors[room] || [{ name: `ครูที่ปรึกษา ${room}`, position: 'ครู' }];
}

export function formatAdvisorsForRoom(room: string): string {
  const list = getAdvisorsForRoom(room);
  return list.map((a) => a.name).join(', ');
}

/**
 * Generates deduplicated TeacherStaff list from official Order 56/2569
 * (e.g., teachers advising multiple rooms like ม.6/2 & ม.6/3 are grouped into one staff account).
 */
export function buildRealStaffList(): TeacherStaff[] {
  const byName = new Map<string, TeacherStaff>();

  Object.entries(ADVISOR_ORDER_DATA.homeroomAdvisors).forEach(([room, advisors]) => {
    advisors.forEach((adv) => {
      const existing = byName.get(adv.name);
      if (existing) {
        if (!existing.rooms.includes(room)) existing.rooms.push(room);
      } else {
        const idx = byName.size + 1;
        byName.set(adv.name, {
          id: `advisor-${idx}`,
          name: adv.name,
          email: `teacher${idx}@ptn.ac.th`,
          phone: '',
          staffRole: 'homeroom',
          rooms: [room],
          active: true,
        });
      }
    });
  });

  // Add default Counselor & Case Manager accounts for multidisciplinary support
  const list = Array.from(byName.values());
  list.push(
    {
      id: 'counselor-1',
      name: 'งานแนะแนว รร.เปรมติณสูลานนท์',
      email: 'counselor@ptn.ac.th',
      phone: '',
      staffRole: 'counselor',
      rooms: [],
      active: true,
    },
    {
      id: 'casemanager-1',
      name: 'งานระบบดูแลช่วยเหลือนักเรียน',
      email: 'care@ptn.ac.th',
      phone: '',
      staffRole: 'case_manager',
      rooms: [],
      active: true,
    }
  );
  return list;
}
