
import { Transaction, Category } from '../types';

const SYNC_FILE_NAME = 'fintrack_sync.json';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

// Note: In a real app, CLIENT_ID would come from process.env.GOOGLE_CLIENT_ID
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE'; 

export interface SyncData {
  transactions: Transaction[];
  categories: Category[];
  lastUpdated: string;
}

let tokenClient: any = null;
let accessToken: string | null = null;

export const initGoogleAuth = (): Promise<void> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !(window as any).google) return;
    
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse: any) => {
        if (tokenResponse.error !== undefined) {
          throw tokenResponse;
        }
        accessToken = tokenResponse.access_token;
        resolve();
      },
    });
    resolve();
  });
};

export const requestAccessToken = () => {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }
};

export const signOut = () => {
  if (accessToken) {
    (window as any).google.accounts.oauth2.revoke(accessToken, () => {
      console.log('Access token revoked');
    });
    accessToken = null;
  }
};

export const isAuthorized = () => !!accessToken;

async function fetchDrive(endpoint: string, options: RequestInit = {}) {
  if (!accessToken) throw new Error('Not authorized');
  const response = await fetch(`https://www.googleapis.com/drive/v3/${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Drive API Error');
  }
  return response;
}

export const syncToDrive = async (data: SyncData): Promise<void> => {
  try {
    const listResponse = await fetchDrive(`files?q=name='${SYNC_FILE_NAME}'&spaces=appDataFolder&fields=files(id)`);
    const { files } = await listResponse.json();
    
    const fileId = files.length > 0 ? files[0].id : null;
    const metadata = {
      name: SYNC_FILE_NAME,
      parents: ['appDataFolder'],
    };

    const boundary = 'foo_bar_baz';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(data) +
      closeDelimiter;

    if (fileId) {
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });
    } else {
      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });
    }
  } catch (err) {
    console.error('Failed to sync to Drive', err);
    throw err;
  }
};

export const getFromDrive = async (): Promise<SyncData | null> => {
  try {
    const listResponse = await fetchDrive(`files?q=name='${SYNC_FILE_NAME}'&spaces=appDataFolder&fields=files(id)`);
    const { files } = await listResponse.json();
    
    if (files.length === 0) return null;

    const fileId = files[0].id;
    const contentResponse = await fetchDrive(`files/${fileId}?alt=media`);
    return await contentResponse.json();
  } catch (err) {
    console.error('Failed to fetch from Drive', err);
    return null;
  }
};
