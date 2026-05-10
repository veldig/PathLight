import * as ExpoCalendar from 'expo-calendar';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// Google OAuth client ID: 698302867976-rbg4d6mvlq2787jo4jf3e60emtb8to3p.apps.googleusercontent.com
// Required redirect URIs to add in Google Cloud Console → OAuth credentials:
//   https://auth.expo.io/@your-expo-username/pathlight   (Expo Go / dev)
//   pathlight://oauth                                     (standalone build)

export type CalendarProvider = 'google' | 'apple';

export interface PathLightEvent {
  id: string;
  agent: string;
  title: string;
  datetime: string;
  type: string;
}

// ─── Apple Calendar (expo-calendar) ──────────────────────────────────────────

export async function connectAppleCalendar(): Promise<boolean> {
  const { status } = await ExpoCalendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

async function getOrCreatePathLightCalendar(): Promise<string> {
  const calendars = await ExpoCalendar.getCalendarsAsync(ExpoCalendar.EntityTypes.EVENT);
  const existing = calendars.find((c) => c.title === 'PathLight');
  if (existing) return existing.id;

  const defaultCalendar =
    Platform.OS === 'ios'
      ? await ExpoCalendar.getDefaultCalendarAsync()
      : calendars.find((c) => c.allowsModifications) ?? calendars[0];

  return ExpoCalendar.createCalendarAsync({
    title: 'PathLight',
    color: '#1F3A5F',
    entityType: ExpoCalendar.EntityTypes.EVENT,
    sourceId: defaultCalendar?.source?.id,
    source: defaultCalendar?.source ?? { isLocalAccount: true, name: 'PathLight', type: '' },
    name: 'PathLight',
    ownerAccount: 'personal',
    accessLevel: ExpoCalendar.CalendarAccessLevel.OWNER,
  });
}

export async function syncToAppleCalendar(events: PathLightEvent[]): Promise<void> {
  const calendarId = await getOrCreatePathLightCalendar();

  for (const event of events) {
    const start = new Date(event.datetime);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // default 1-hour duration

    const existing = await ExpoCalendar.getEventsAsync([calendarId], start, end);
    const alreadySynced = existing.some((e) => e.title === event.title);
    if (alreadySynced) continue;

    await ExpoCalendar.createEventAsync(calendarId, {
      title: event.title,
      startDate: start,
      endDate: end,
      notes: `PathLight · ${event.agent} · ${event.type}`,
      alarms: [{ relativeOffset: -30 }], // 30 min reminder
    });
  }
}

// ─── Google Calendar (OAuth2 + REST API) ─────────────────────────────────────

const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export function useGoogleCalendarAuth() {
  const clientId = Platform.select({
    ios: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    android: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'pathlight', path: 'oauth' });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientId ?? '',
      scopes: GOOGLE_SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery,
  );

  return { request, response, promptAsync };
}

export async function exchangeGoogleCode(
  code: string,
  codeVerifier: string,
): Promise<string | null> {
  const clientId = Platform.select({
    ios: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    android: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'pathlight', path: 'oauth' });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId ?? '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }).toString(),
  });

  const data = await res.json();
  return data.access_token ?? null;
}

export async function syncToGoogleCalendar(
  accessToken: string,
  events: PathLightEvent[],
): Promise<void> {
  for (const event of events) {
    const start = new Date(event.datetime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.title,
        description: `PathLight · ${event.agent} · ${event.type}`,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] },
        colorId: agentColorId(event.agent),
      }),
    });
  }
}

function agentColorId(agent: string): string {
  // Google Calendar color IDs 1-11
  const map: Record<string, string> = {
    focuspath: '2',    // sage/green
    fundfinder: '6',   // tangerine/orange
    careerboost: '9',  // blueberry
    wellness: '3',     // grape/lavender
  };
  return map[agent] ?? '1';
}
