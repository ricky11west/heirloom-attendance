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
 * Timestamp | Date | Service | Submitted By |
 * Gym M | Gym F | Gym Total |
 * Kids M | Kids F | Kids Total |
 * Littles M | Littles F | Littles Total |
 * Babies M | Babies F | Babies Total |
 * Grand Male | Grand Female | Grand Total | Notes
 */

const SHEET_NAME = 'Attendance';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    logAttendance(data);
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Support GET for testing (URL params not required)
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'Heirloom Attendance API running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function logAttendance(data) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(SHEET_NAME);

  // Create sheet + header row if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'Timestamp', 'Date', 'Service', 'Submitted By',
      'Gym Male', 'Gym Female', 'Gym Total',
      'Kids Male', 'Kids Female', 'Kids Total',
      'Littles Male', 'Littles Female', 'Littles Total',
      'Babies Male', 'Babies Female', 'Babies Total',
      'Grand Male', 'Grand Female', 'Grand Total',
      'Notes'
    ]);

    // Style header row
    const header = sheet.getRange(1, 1, 1, 20);
    header.setBackground('#435563');
    header.setFontColor('#ffffff');
    header.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    data.timestamp    || new Date().toISOString(),
    data.date         || '',
    data.service_time || '',
    data.submitted_by || '',
    data.gym_male     || 0,
    data.gym_female   || 0,
    data.gym_total    || 0,
    data.kids_male    || 0,
    data.kids_female  || 0,
    data.kids_total   || 0,
    data.littles_male || 0,
    data.littles_female || 0,
    data.littles_total  || 0,
    data.babies_male  || 0,
    data.babies_female || 0,
    data.babies_total  || 0,
    data.grand_male   || 0,
    data.grand_female || 0,
    data.grand_total  || 0,
    data.notes        || ''
  ]);
}
