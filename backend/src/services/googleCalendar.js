const { google } = require('googleapis');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/gestor/google-calendar/callback';

function getOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

function getAuthUrl() {
  const oauth = getOAuth2Client();
  return oauth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/userinfo.email'],
  });
}

async function getTokensFromCode(code) {
  const oauth = getOAuth2Client();
  const { tokens } = await oauth.getToken(code);
  return tokens;
}

async function refreshTokens(refreshToken) {
  const oauth = getOAuth2Client();
  oauth.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth.refreshAccessToken();
  return credentials;
}

async function createEvent(tokens, eventData) {
  const oauth = getOAuth2Client();
  oauth.setCredentials(tokens);

  const calendar = google.calendar({ version: 'v3', auth: oauth });

  const event = {
    summary: eventData.summary,
    description: eventData.description,
    start: {
      dateTime: eventData.startTime,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: eventData.endTime,
      timeZone: 'America/Sao_Paulo',
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
  });

  return response.data;
}

async function revokeTokens(refreshToken) {
  const oauth = getOAuth2Client();
  oauth.setCredentials({ refresh_token: refreshToken });
  await oauth.revokeCredentials();
}

module.exports = { getAuthUrl, getTokensFromCode, refreshTokens, createEvent, revokeTokens };