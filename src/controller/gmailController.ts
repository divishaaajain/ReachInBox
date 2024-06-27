import { google } from "googleapis";
import {
  CLIENT_ID,
  CLIENT_SECRET,
  OPENAI_SECRET_KEY,
  REDIRECT_URI,
  REFRESH_TOKEN,
} from "../config";
import { createConfig } from "../utils/axiosUtils";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import OpenAI from "openai";

let accessToken: string | undefined | null;

type Label = {
  id: string;
  name: string;
};

type Header = {
  name: string;
  value: string;
};

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const scopes = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.labels",
];

const openai = new OpenAI({
  apiKey: OPENAI_SECRET_KEY,
});

export async function generateAuthUrl(): Promise<string> {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });

  if (!authUrl) throw new Error("authUrl not found");

  return authUrl;
}

export async function handleGoogleCallback({
  code,
}: {
  code: any;
}): Promise<string> {
  if (!code) {
    throw new Error("Authorization code missing.");
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    const { access_token, refresh_token, scope } = tokens;
    if (!access_token) throw new Error("Cannot retrieve access token");
    accessToken = access_token;
    if (!scope) throw new Error("Scope not found");
    return "Restricted scopes test passed.";
  } catch (error) {
    throw error;
  }
}

export async function getUserProfile({ email }: { email: string }) {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${email}/profile`;
    const token = accessToken;
    if (!token) throw new Error("Token not found! Login again");
    const config: AxiosRequestConfig = createConfig(url, token);
    const response: AxiosResponse = await axios(config);

    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function fetchAllEmails({
  email,
}: {
  email: string;
}): Promise<string | null> {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${email}/threads?maxResults=3`;
    const token = accessToken;
    if (!token) {
      throw new Error("Token not found , Please login again to get token");
    }
    const config: AxiosRequestConfig = createConfig(url, token);
    const response: AxiosResponse = await axios(config);
    if (!response.data) return null;

    const dataList = response.data.threads;

    if (!dataList) throw new Error("No emails found");

    for (const emailData of dataList) {
      const labelName = await generateLabelForEmail({
        message: emailData.snippet,
      });

      if (!labelName) {
        continue;
      }

      //fetch all existing labels
      const allLabels: Label[] = await getGmailLabels({ email: email });
      let labelId: string | null;

      if (!allLabels.some((value) => value.name === labelName)) {
        //create new label
        const labelData = await createLabelOnGmail({
          email: email,
          label: labelName,
        });
        labelId = labelData.id;
      } else {
        //get labelId if label exists
        labelId =
          allLabels.find((label: Label) => label.name === labelName)?.id ?? "";
      }

      if (!labelId) throw new Error("Label not found");

      //change label of the email
      await changeEmailLabel({
        email: email,
        messageId: emailData.id,
        labelId: labelId,
      });

      //read the email
      const mailData = await readMail({
        email: email,
        messageId: emailData.id,
      });

      //extract the sender id
      const allHeaders: Header[] = mailData.payload.headers;
      const fromString = allHeaders.find((header: Header) => header.name === "From")?.value ?? "";

      if (!fromString) throw new Error("Sender not found");
      const senderId = extractSenderId({ rawString: fromString });
      await sendEmail({
        labelName: labelName ?? "",
        from: email,
        to: senderId,
      });
    }

    return "Successful";
  } catch (error) {
    throw new error();
  }
}

async function generateEmailContent({
  labelName,
}: {
  labelName: string;
}): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: `generate a prompt based on the label name - ${labelName}. Context - customer is reaching out to a firm for typescipt services`,
        },
      ],
      max_tokens: 100,
    });

    return (
      response.choices[0]?.message.content ??
      "Thanks for reaching out. Please let us know how can we help you."
    );
  } catch (error) {
    if (labelName === "Interested") {
      return `\n\n\n\n\n\n\n\n\n\nThanks for your interest.\n
       Here's the quotation.\n Please review and get back to us. Regards`;
    } else if (labelName === "Not Interested") {
      return `\n\n\n\n\n\n\n\n\nThanks for reaching out.
      \n Please let us know how can we help you.`;
    } else {
      return `\n\n\n\n\n\n\n\n\n\n\n\n\nThanks for reaching out. 
      Please let us know how can we help you.\n\n 
      Let's connect on a call regarding the same, please let us know your preferred timing. Regards`;
    }
  }
}

async function sendEmail({
  labelName,
  to,
  from,
}: {
  labelName: string;
  to: string;
  from: string;
}) {
  try {
    const token = accessToken;
    if (!token) throw new Error("Token not valid");

    //generate email content
    const text = await generateEmailContent({ labelName: labelName });
    const subject = "Thanks for reaching out";

    const mailData = [
      "Content-type: text/html;charset=iso-8859-1",
      "MIME-Version: 1.0",
      `from: ${from}`,
      `to: ${to}`,
      `subject: ${subject}`,
      `text: ${text}`,
    ].join("\n");

    const rawData = { raw: Buffer.from(mailData).toString("base64") };

    const response = await axios.post(
      `https://gmail.googleapis.com/gmail/v1/users/${from}/messages/send`,
      rawData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (error) {
  }
}

function extractSenderId({ rawString }: { rawString: string }): string {
  const emailRegex = /<([^>]+)>/;
  const match = emailRegex.exec(rawString) ?? "";
  const extractedEmail = match[1].trim();
  return extractedEmail;
}

async function createLabelOnGmail({
  email,
  label,
}: {
  email: string;
  label: string;
}): Promise<any> {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${email}/labels`;

    const token = accessToken;
    const data = {
      name: label,
    };
    const response = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
  }
}

async function getGmailLabels({ email }: { email: string }): Promise<any> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/${email}/labels`;
  const token = accessToken;
  if (!token) {
    throw new Error("Token not found , Please login again to get token");
  }
  const config: AxiosRequestConfig = createConfig(url, token);
  const response: AxiosResponse = await axios(config);

  return response.data.labels;
}

async function changeEmailLabel({
  email,
  messageId,
  labelId,
}: {
  email: string;
  messageId: string;
  labelId: string;
}) {
  try {
    const token = accessToken;
    const response = await axios.post(
      `https://gmail.googleapis.com/gmail/v1/users/${email}/messages/${messageId}/modify`,
      {
        addLabelIds: [labelId],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (error) {
  }
}

async function generateLabelForEmail({ message }: { message: string }) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: `Given a message. Understand the context of this message ang give a one word label for this message from the below list 
                "Interested", "Not Interested", "More Information"`,
        },
      ],
      max_tokens: 100,
    });

    return response.choices[0]?.message.content;
  } catch (error) {
    if (message.toLowerCase().includes("not interested")) {
      return "Not Interested";
    } else if (message.toLowerCase().includes("interested")) {
      return "Interested";
    } else if (message.toLowerCase().includes("information")) {
      return "More Information";
    } else {
      return "";
    }
  }
}

export async function readMail({
  email,
  messageId,
}: {
  email: string;
  messageId: string;
}): Promise<any> {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${email}/messages/${messageId}`;
    const token = accessToken;
    if (!token) {
      throw new Error("Token not found , Please login again to get token");
    }
    const config: AxiosRequestConfig = createConfig(url, token);
    const response: AxiosResponse = await axios(config);
    return response.data;
  } catch (error) {
    throw error;
  }
}
