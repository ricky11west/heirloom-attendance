/**
 * Heirloom Church — Attendance Logger
 * Google Apps Script Web App
 *
 * SETUP:
 * 1. Open Google Sheets → Extensions → Apps Script
 * 2. Paste this entire file, replacing the default code
 * 3. Save (Ctrl+S)
 * 4. Click Deploy → New Deployment
 *    - Type: Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Click Deploy → copy the Web App URL
 * 6. Paste that URL into the app's ⚙ Settings
 *
 * SHEET COLUMNS (auto-created on first submit):
 * Timestamp | Date | Submitted By |
 * Main Service M | Main Service F | Main Service Vol | Main Service Total |
 * Kids M | Kids F | Kids Vol | Kids Total |
 * Littles M | Littles F | Littles Vol | Littles Total |
 * Babies M | Babies F | Babies Vol | Babies Total |
 * Grand Male | Grand Female | Grand Vol | Grand Total | Notes
 *
 * MIGRATION NOTE (existing deployments):
 * If your sheet was created before volunteer support, old rows keep their
 * 19-column layout. New rows (after this update) will have 24 columns. To
 * keep history clean, either start a fresh sheet or insert 5 empty columns
 * for the Vol fields before submitting again.
 */

// ── CONFIG ────────────────────────────────────────────────
// If this script is STANDALONE (not bound to a sheet), paste your Sheet ID here.
// Find the ID in the sheet URL: docs.google.com/spreadsheets/d/[THIS_PART]/edit
// Leave empty if the script is bound to a sheet (via Extensions → Apps Script).
const SPREADSHEET_ID = '1lN3LcCrfVFKJp7CDhJ3kSWFjPoodc-aNX53LPP_Bk88';

const SHEET_NAME = 'Attendance';

function getSpreadsheet() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No active spreadsheet. Set SPREADSHEET_ID at top of script.');
  return ss;
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    logAttendance(data);
    sendTelegramSummary(data);
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Sends an exec summary to Telegram on every submission.
 * Set these in Apps Script → Project Settings → Script Properties:
 *   TELEGRAM_BOT_TOKEN   — your bot token
 *   TELEGRAM_CHAT_ID     — your user/chat ID
 * If either is missing, this silently skips (doesn't break the submit).
 */
function sendTelegramSummary(data) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('TELEGRAM_BOT_TOKEN');
  const chatId = props.getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return;

  const dateStr = data.date || 'unknown date';
  const by      = data.submitted_by || 'Unknown';
  const notes   = data.notes ? `\n\n*Notes:* ${data.notes}` : '';

  const msg =
    `*Heirloom Attendance — Submitted*\n` +
    `📅 ${dateStr}\n` +
    `👤 ${by}\n\n` +
    `*Main Service:* ${data.gym_total} (M ${data.gym_male} / F ${data.gym_female} / Vol ${data.gym_volunteer || 0})\n` +
    `*Kids:* ${data.kids_total} (M ${data.kids_male} / F ${data.kids_female} / Vol ${data.kids_volunteer || 0})\n` +
    `*Littles:* ${data.littles_total} (M ${data.littles_male} / F ${data.littles_female} / Vol ${data.littles_volunteer || 0})\n` +
    `*Babies:* ${data.babies_total} (M ${data.babies_male} / F ${data.babies_female} / Vol ${data.babies_volunteer || 0})\n\n` +
    `*Grand Total: ${data.grand_total}*\n` +
    `Male ${data.grand_male}  |  Female ${data.grand_female}  |  Vol ${data.grand_volunteer || 0}` +
    notes;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        chat_id: chatId,
        text: msg,
        parse_mode: 'Markdown'
      }),
      muteHttpExceptions: true
    });
  } catch (err) {
    // Don't break the submit flow if Telegram fails
    console.error('Telegram send failed:', err);
  }
}

function doGet(e) {
  // Support GET for testing (URL params not required)
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'Heirloom Attendance API running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * MANUAL TEST — run this from the Apps Script editor (Run ▶ → testTelegram)
 * Prints exactly why a Telegram send is failing. View output in Execution Log.
 */
function testTelegram() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('TELEGRAM_BOT_TOKEN');
  const chatId = props.getProperty('TELEGRAM_CHAT_ID');

  console.log('TELEGRAM_BOT_TOKEN present:', !!token, token ? `(len ${token.length})` : '');
  console.log('TELEGRAM_CHAT_ID present: ', !!chatId, chatId ? `(value ${chatId})` : '');

  if (!token) { console.error('❌ Missing TELEGRAM_BOT_TOKEN in Script Properties'); return; }
  if (!chatId) { console.error('❌ Missing TELEGRAM_CHAT_ID in Script Properties'); return; }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      text: '✅ Heirloom Attendance — Telegram test message',
      parse_mode: 'Markdown'
    }),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  const body = res.getContentText();
  console.log('HTTP', code);
  console.log('Body:', body);

  if (code === 200) {
    console.log('✅ SUCCESS — check your Telegram');
  } else if (code === 401) {
    console.error('❌ Bad bot token (401 Unauthorized) — fix TELEGRAM_BOT_TOKEN');
  } else if (code === 400 && body.includes('chat not found')) {
    console.error('❌ Chat not found — open Telegram, message the bot, then /start it. TELEGRAM_CHAT_ID may be wrong.');
  } else if (code === 403) {
    console.error('❌ Bot blocked or user never started it — open Telegram and /start the bot.');
  } else {
    console.error('❌ Unknown error — see Body above');
  }
}

function logAttendance(data) {
  const ss    = getSpreadsheet();
  let sheet   = ss.getSheetByName(SHEET_NAME);

  // Create sheet + header row if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'Timestamp', 'Date', 'Submitted By',
      'Main Service Male', 'Main Service Female', 'Main Service Vol', 'Main Service Total',
      'Kids Male', 'Kids Female', 'Kids Vol', 'Kids Total',
      'Littles Male', 'Littles Female', 'Littles Vol', 'Littles Total',
      'Babies Male', 'Babies Female', 'Babies Vol', 'Babies Total',
      'Grand Male', 'Grand Female', 'Grand Vol', 'Grand Total',
      'Notes'
    ]);

    // Style header row
    const header = sheet.getRange(1, 1, 1, 24);
    header.setBackground('#435563');
    header.setFontColor('#ffffff');
    header.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    data.timestamp        || new Date().toISOString(),
    data.date             || '',
    data.submitted_by     || '',
    data.gym_male         || 0,
    data.gym_female       || 0,
    data.gym_volunteer    || 0,
    data.gym_total        || 0,
    data.kids_male        || 0,
    data.kids_female      || 0,
    data.kids_volunteer   || 0,
    data.kids_total       || 0,
    data.littles_male     || 0,
    data.littles_female   || 0,
    data.littles_volunteer|| 0,
    data.littles_total    || 0,
    data.babies_male      || 0,
    data.babies_female    || 0,
    data.babies_volunteer || 0,
    data.babies_total     || 0,
    data.grand_male       || 0,
    data.grand_female     || 0,
    data.grand_volunteer  || 0,
    data.grand_total      || 0,
    data.notes            || ''
  ]);
}
