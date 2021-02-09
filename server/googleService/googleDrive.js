const fsPromise = require("fs").promises;
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { google } = require("googleapis");
const config = require("../../config");
const projectPath = config.projectPath;
const SCOPES = ["https://www.googleapis.com/auth/drive"];

const TOKEN_PATH = path.join(projectPath, "/server/googleService/token.json");
const CREDS_PATH = path.join(
  projectPath,
  "/server/googleService/credentials.json"
);

const connectDrive = async () => {
  try {
    const content = await fsPromise.readFile(CREDS_PATH);
    const auth = await authorize(JSON.parse(content));
    const drive = google.drive({ version: "v3", auth });
    return drive;
  } catch (error) {
    console.log("Error loading client secret file:", error);
  }
};

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 */
async function authorize(credentials) {
  // eslint-disable-next-line camelcase
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );
  /*     
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
     */
  // Check if we have previously stored a token.
  let token;
  try {
    token = await fsPromise.readFile(TOKEN_PATH);
    if (!token) throw new Error("token not found");
  } catch (error) {
    console.log({ error });
    token = getAccessToken(oAuth2Client);
  } finally {
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  }
}

/**
 * Get and store new token after prompting for user authorization, and then
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 */
function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      return token;
    });
  });
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listFiles() {
  const drive = await connectDrive();
  const res = await drive.files.list({
    pageSize: 10,
    fields: "nextPageToken, files(id, name)",
  });
  const files = res.data.files;
  if (files.length) {
    console.log("Files:");
    files.map((file) => {
      console.log(`${file.name} (${file.id})`);
    });
    return files;
  } else {
    console.log("No files found.");
  }
}

/** Get a file and save it to the path */
async function downloadFile(fileId, filePath) {
  const drive = await connectDrive();

  const res = await drive.files.export(
    { fileId: fileId, mimeType: "text/html" },
    { responseType: "stream" }
  );

  return new Promise((resolve, reject) => {
    //   console.log({ res });

    //   console.log(`writing to ${filePath}`, { res });
    const dest = fs.createWriteStream(filePath);
    let progress = 0;

    res.data
      .on("end", () => {
        console.log("Done downloading file.");
        resolve(filePath);
      })
      .on("error", (err) => {
        console.error("Error downloading file.");
        reject(err);
      })
      .on("data", (d) => {
        progress += d.length;
        if (process.stdout.isTTY) {
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          process.stdout.write(`Downloaded ${progress} bytes`);
        }
      })
      .pipe(dest);
  });
}

const getFileModified = async (fileId) => {
  const drive = await connectDrive();
  const res = await drive.files.get({ fileId, fields: "modifiedTime" });
  console.log({ res: res.data.modifiedTime });
  const result = res.data.modifiedTime;
  console.log({ result });
  return result;
};

module.exports = { downloadFile, listFiles, getFileModified };