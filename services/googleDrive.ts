
import { Transaction, Category, Merchant, PaymentMethod, RecurringTemplate } from '../types';

const SYNC_FILE_NAME = 'fintrack_sync.json';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const DRIVE_ENABLED_KEY = 'fintrack_drive_enabled';

// Note: In a production environment, this should be an environment variable
const CLIENT_ID = '442466272870-qh25ebv950817d9dmljjdb3bkve90tf9.apps.googleusercontent.com';

export interface SyncData {
  transactions: Transaction[];
  categories: Category[];
  merchants: Merchant[];
  paymentMethods: PaymentMethod[];
  templates: RecurringTemplate[];
  lastUpdated: string;
}

let tokenClient: any = null;
let accessToken: string | null = null;
let onAuthSuccess: (() => void) | null = null;

/**
 * Initializes the Google Identity Services client.
 */
export const initGoogleAuth = (onSuccess?: () => void): Promise<void> => {
  if (onSuccess) onAuthSuccess = onSuccess;
  
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    
    const checkGsiReady = () => {
      if ((window as any).google?.accounts?.oauth2) {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (tokenResponse: any) => {
            if (tokenResponse.error !== undefined) {
              console.error('OAuth Error:', tokenResponse);
              return;
            }
            accessToken = tokenResponse.access_token;
            localStorage.setItem(DRIVE_ENABLED_KEY, 'true');
            if (onAuthSuccess) onAuthSuccess();
          },
        });
        resolve();
      } else {
        setTimeout(checkGsiReady, 100);
      }
    };

    checkGsiReady();
  });
};

/**
 * Re-triggers the Google OAuth2 flow to obtain a fresh access token.
 */
export const requestAccessToken = (hint: 'none' | 'select_account' = 'select_account') => {
  if (tokenClient) {
    // 'none' is often blocked by modern browsers for security unless 
    // the user has a very recent active session, so we default to standard.
    tokenClient.requestAccessToken({ prompt: hint === 'none' ? '' : 'select_account' });
  }
};

/**
 * Checks if the user has previously enabled Drive sync.
 */
export const isDriveEnabledInStorage = () => {
  return localStorage.getItem(DRIVE_ENABLED_KEY) === 'true';
};

/**
 * Checks if the user is currently authorized with a valid access token.
 */
export const isAuthorized = () => !!accessToken;

/**
 * Robust wrapper for fetch calls to Google Drive API with automatic 401 handling.
 */
async function fetchDrive(endpoint: string, options: RequestInit = {}) {
  if (!accessToken) {
    requestAccessToken();
    throw new Error('Authorization required. Please sign in to Google Drive.');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    accessToken = null;
    requestAccessToken();
    throw new Error('Google Drive session expired. Please sign in again.');
  }

  if (!response.ok) {
    let errorMsg = 'Drive API Error';
    try {
      const error = await response.json();
      errorMsg = error.error?.message || errorMsg;
    } catch (e) {
      errorMsg = `HTTP Error ${response.status}`;
    }
    throw new Error(errorMsg);
  }
  return response;
}

/**
 * Saves application data to the hidden appDataFolder using a robust multipart upload.
 */
export const syncToDrive = async (data: SyncData): Promise<void> => {
  try {
    // 1. Locate the existing sync file
    const listResponse = await fetchDrive(`files?q=name='${SYNC_FILE_NAME}'&spaces=appDataFolder&fields=files(id)`);
    const { files } = await listResponse.json();
    const fileId = files.length > 0 ? files[0].id : null;
    
    // 2. Construct Multipart body
    const boundary = 'dad_finance_sync_boundary';
    const metadata = {
      name: SYNC_FILE_NAME,
      parents: fileId ? undefined : ['appDataFolder'],
    };

    const delimiter = `--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartBody = new Blob([
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      '\r\n' + delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(data),
      closeDelimiter
    ], { type: `multipart/related; boundary=${boundary}` });

    // 3. Upload using the authenticated wrapper logic
    const url = fileId 
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const response = await fetch(url, {
      method: fileId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: multipartBody,
    });

    if (response.status === 401) {
      accessToken = null;
      requestAccessToken();
      throw new Error('Session expired during upload. Please sign in again.');
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = 'Failed to upload sync file';
      try {
        const error = JSON.parse(errorText);
        errorMsg = error.error?.message || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }
  } catch (err: any) {
    console.error('Failed to sync to Drive', err);
    throw err;
  }
};

/**
 * Retrieves application data from Google Drive's hidden appDataFolder.
 */
export const getFromDrive = async (): Promise<SyncData | null> => {
  try {
    const listResponse = await fetchDrive(`files?q=name='${SYNC_FILE_NAME}'&spaces=appDataFolder&fields=files(id)`);
    const { files } = await listResponse.json();
    
    if (files.length === 0) return null;

    const fileId = files[0].id;
    const contentResponse = await fetchDrive(`files/${fileId}?alt=media`);
    return await contentResponse.json();
  } catch (err: any) {
    console.error('Failed to fetch from Drive', err);
    if (err.message.includes('Authorization required')) return null;
    throw err;
  }
};
