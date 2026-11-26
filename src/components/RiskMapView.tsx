import React, { useMemo, useState } from 'react';
import { MapPin, Navigation, Phone, Home, Filter } from 'lucide-react';
import { RiskConfig, Student } from '../types';
import { getEffectiveRisk, RISK_LABELS } from '../utils/riskEngine';

interface Props {
  students: Student[];
  config: RiskConfig;
  onSelectStudent: (s: Student) => void;
}

/**
 * Risk Map View (แผนที่รวมนักเรียนกลุ่มเสี่ยง)
 * Shows OpenStreetMap preview centered on the selected student's home + interactive pin cards
 * with 1-click Google Maps navigation (`dir/?api=1&destination=lat,lng`).
 */
export const RiskMapView: React.FC<Props> = ({ students, config, onSelectStudent }) => {
  const [roomFilter, setRoomFilter] = useState('');
  const [onlyRisk, setOnlyRisk] = useState(true);

  const rooms = useMemo(
    () => Array.from(new Set(students.map((s) => s.room))).sort((a, b) => a.localeCompare(b, 'th')),
    [students]
  );

  const mappedStudents = useMemo(() => {
    return students.filter((s) => {
      if (!s.location) return false;
      if (roomFilter && s.room !== roomFilter) return false;
      if (onlyRisk && getEffectiveRisk(s, config) === 'g') return false;
      return true;
    });
  }, [students, roomFilter, onlyRisk, config]);

  const [focusedId, setFocusedId] = useState<string>('');
  const focusedStudent =
    mappedStudents.find((s) => s.id === focusedId) || mappedStudents[0] || null;

  const mapCenter = focusedStudent?.location || { lat: 16.4892, lng: 102.8351 };
  const bbox = `${mapCenter.lng - 0.012},${mapCenter.lat - 0.009},${mapCenter.lng + 0.012},${mapCenter.lat + 0.009}`;
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${mapCenter.lat},${mapCenter.lng}`;

  return (
    <div className="space-y-4">
      <div className="clay-card p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[#2B3E50] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#4A7C82]" /> แผนที่รวมนักเรียนกลุ่มเสี่ยง (Risk Map View)
            </h2>
            <p className="text-xs text-slate-600">
              วางแผนเส้นทางลงพื้นที่เยี่ยมบ้านในวันเดียวกัน พร้อมปุ่มนำทาง Google Maps สำหรับครูคนใหม่
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="clay-input px-3 py-1.5 text-xs"
            >
              <option value="">ทุกห้อง ({rooms.length} ห้อง)</option>
              {rooms.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button
              onClick={() => setOnlyRisk((v) => !v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                onlyRisk ? 'clay-btn-primary' : 'clay-btn-soft'
              }`}
            >
              <Filter className="w-3.5 h-3.5" /> {onlyRisk ? 'เฉพาะกลุ่มเสี่ยง/เฝ้าระวัง' : 'แสดงทั้งหมดที่มีพิกัด'}
            </button>
          </div>
        </div>

        {/* OpenStreetMap Interactive Embed */}
        <div className="rounded-2xl overflow-hidden border-2 border-white shadow-inner bg-slate-200 h-64 sm:h-72 relative">
          <iframe
            title="แผนที่บ้านนักเรียน PTN-Student-Care"
            src={osmUrl}
            className="w-full h-full border-0"
            loading="lazy"
          />
          {focusedStudent && (
            <div className="absolute bottom-3 left-3 right-3 sm:right-auto bg-[#2B3E50]/92 text-white backdrop-blur-xs rounded-2xl px-3.5 py-2.5 text-xs flex items-center justify-between gap-3 shadow-lg">
              <div>
                <div className="font-bold">
                  📍 {focusedStudent.name} ({focusedStudent.room})
                </div>
                <div className="text-[11px] text-slate-300">
                  {focusedStudent.landmarkNote || `พิกัด ${focusedStudent.location?.lat}, ${focusedStudent.location?.lng}`}
                </div>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${focusedStudent.location?.lat},${focusedStudent.location?.lng}`}
                target="_blank"
                rel="noreferrer"
                className="clay-btn-primary px-3 py-1.5 text-[11px] font-bold inline-flex items-center gap-1 shrink-0"
              >
                <Navigation className="w-3.5 h-3.5" /> นำทาง
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Student Location Cards */}
      <div className="clay-card p-5 space-y-2.5">
        <h3 className="font-bold text-sm text-[#2B3E50]">
          รายชื่อบ้านนักเรียนที่มีพิกัด GPS ({mappedStudents.length} คน)
        </h3>
        {mappedStudents.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">ยังไม่พบนักเรียนที่มีพิกัด GPS ในตัวกรองนี้</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {mappedStudents.map((s) => {
              const rk = getEffectiveRisk(s, config);
              const isSelected = focusedStudent?.id === s.id;
              const badgeClass =
                rk === 'r' ? 'bg-rose-100 text-rose-700' : rk === 'y' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
              return (
                <div
                  key={s.id}
                  onClick={() => setFocusedId(s.id)}
                  className={`clay-card-light p-3.5 space-y-2 cursor-pointer transition ${
                    isSelected ? 'ring-2 ring-[#4A7C82]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStudent(s);
                        }}
                        className="font-bold text-sm text-[#2B3E50] hover:underline text-left"
                      >
                        {s.name} ({s.room})
                      </button>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Home className="w-3 h-3 text-[#4A7C82]" />
                        {s.landmarkNote || 'ยังไม่ระบุจุดสังเกตทางเข้าบ้าน'}
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badgeClass}`}>
                      {RISK_LABELS[rk]}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${s.location?.lat},${s.location?.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="clay-btn-primary px-3 py-1.5 text-[11px] font-semibold inline-flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3" /> เปิดแผนที่นำทาง (Google Maps)
                    </a>
                    {s.parentPhone && (
                      <a
                        href={`tel:${s.parentPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="clay-btn-soft px-3 py-1.5 text-[11px] font-semibold inline-flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 text-[#4A7C82]" /> โทรผู้ปกครอง
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
