import { google } from "googleapis";
import { Readable } from "stream";

// Initialize Google Auth Client (Supports both OAuth2 Refresh Token and Service Account)
const getDriveClient = () => {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // 1. If OAuth2 Refresh Token credentials are provided, use them (solves personal quota limits)
  if (refreshToken && clientId && clientSecret) {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: "v3", auth: oauth2Client });
  }

  // 2. Fallback to Google Service Account
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new Error(
      "Missing Google credentials. Provide either (GOOGLE_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) or (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY)"
    );
  }

  const formattedKey = privateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email: email,
    key: formattedKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
};

/**
 * Creates a folder inside a parent folder on Google Drive.
 */
export async function createGDriveFolder(
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  const drive = getDriveClient();
  const fileMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: parentFolderId ? [parentFolderId] : undefined,
  };

  try {
    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id",
    });

    if (!response.data.id) {
      throw new Error("Failed to create folder: No ID returned");
    }

    return response.data.id;
  } catch (error) {
    console.error("Error creating Google Drive folder:", error);
    throw error;
  }
}

/**
 * Uploads a file buffer to Google Drive and returns the file ID and web view link.
 */
export async function uploadFileToGDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  parentFolderId: string
): Promise<{ id: string; webViewLink: string }> {
  const drive = getDriveClient();

  // Convert Buffer to Readable Stream
  const bufferStream = new Readable();
  bufferStream.push(fileBuffer);
  bufferStream.push(null);

  const fileMetadata = {
    name: fileName,
    parents: [parentFolderId],
  };

  const media = {
    mimeType: mimeType,
    body: bufferStream,
  };

  try {
    // 1. Create/Upload the file
    const fileResponse = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink",
    });

    const fileId = fileResponse.data.id;
    if (!fileId) {
      throw new Error("Failed to upload file: No ID returned");
    }

    // 2. Share the file: make it readable by anyone with the link (unlisted)
    // This allows the landlord to click and view files in the dashboard without permission issues,
    // while keeping it unsearchable by Google.
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
        allowFileDiscovery: false,
      },
    });

    // 3. Fetch the updated webViewLink (sometimes permissions update the link or we need to ensure it's fetched)
    const getFileResponse = await drive.files.get({
      fileId: fileId,
      fields: "webViewLink",
    });

    return {
      id: fileId,
      webViewLink: getFileResponse.data.webViewLink || fileResponse.data.webViewLink || "",
    };
  } catch (error) {
    console.error("Error uploading file to Google Drive:", error);
    throw error;
  }
}

/**
 * Deletes a file or folder from Google Drive by its ID.
 */
export async function deleteGDriveFile(fileId: string): Promise<void> {
  const drive = getDriveClient();
  try {
    await drive.files.delete({ fileId });
  } catch (error: any) {
    // If the file/folder is already deleted or not found, we don't need to throw an error
    if (error.code === 404 || error.status === 404) {
      console.warn(`File/folder with ID ${fileId} not found on Google Drive (already deleted).`);
      return;
    }
    console.error(`Error deleting Google Drive file/folder with ID ${fileId}:`, error);
    throw error;
  }
}

