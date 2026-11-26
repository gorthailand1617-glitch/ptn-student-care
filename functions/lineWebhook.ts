/**
 * Firebase Cloud Functions (v2) — LINE Messaging API Integration for PTN-Student-Care
 * โรงเรียนเปรมติณสูลานนท์ องค์การบริหารส่วนจังหวัดขอนแก่น
 * Dev By Kru.gorthailand
 *
 * PDPA Privacy Design:
 * - Push messages to LINE NEVER include sensitive health, family, or academic details on lock screens.
 * - They only send a neutral notification prompting the parent to open the verified LIFF app.
 * - Requires explicit parent PDPA consent before sending any LINE message.
 */

export interface LineNotifyPayload {
  lineUserId: string;
  studentCode: string;
  type: 'consent_request' | 'plan_update' | 'follow_up';
  liffUrl: string;
}

export interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  source?: {
    userId?: string;
    type?: string;
  };
  message?: {
    type: string;
    text?: string;
  };
}

/**
 * Builds a privacy-safe LINE Flex Message (hides sensitive details on lock screen).
 */
export function buildPrivacySafeLineMessage(payload: LineNotifyPayload) {
  const altText =
    payload.type === 'consent_request'
      ? 'โรงเรียนเปรมติณสูลานนท์: ขออนุญาตส่งข่าวความก้าวหน้าการเรียนผ่าน LINE'
      : 'โรงเรียนเปรมติณสูลานนท์: มีข้อความใหม่เกี่ยวกับการเรียนของบุตรหลาน กรุณาเปิดอ่านในแอป';

  return {
    to: payload.lineUserId,
    messages: [
      {
        type: 'flex',
        altText,
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#2B3E50',
            contents: [
              {
                type: 'text',
                text: 'PTN-Student-Care',
                color: '#E6EEF2',
                weight: 'bold',
                size: 'md',
              },
              {
                type: 'text',
                text: 'โรงเรียนเปรมติณสูลานนท์ อบจ.ขอนแก่น',
                color: '#92C2C2',
                size: 'xs',
              },
            ],
          },
          body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
              {
                type: 'text',
                text:
                  payload.type === 'consent_request'
                    ? 'โรงเรียนขออนุญาตส่งข่าวความก้าวหน้าการเรียนผ่าน LINE ข่าวมีเฉพาะเรื่องการเรียน ไม่มีข้อมูลสุขภาพหรือครอบครัว'
                    : 'มีข้อความใหม่เกี่ยวกับความก้าวหน้าการเรียนของบุตรหลาน กรุณากดปุ่มด้านล่างเพื่อยืนยันตัวตนและเปิดอ่านอย่างปลอดภัย',
                wrap: true,
                size: 'sm',
                color: '#2B3E50',
              },
            ],
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#4A7C82',
                action: {
                  type: 'uri',
                  label: 'เปิดอ่านในแอป (ปลอดภัย)',
                  uri: `${payload.liffUrl}?role=parent&code=${encodeURIComponent(payload.studentCode)}`,
                },
              },
            ],
          },
        },
      },
    ],
  };
}

/**
 * Example Cloud Function handler (deploy with Firebase Functions v2 & LINE_CHANNEL_ACCESS_TOKEN secret).
 */
export async function sendLinePushMessage(
  payload: LineNotifyPayload,
  channelAccessToken: string
): Promise<{ ok: boolean; status: number }> {
  const body = buildPrivacySafeLineMessage(payload);
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status };
}
