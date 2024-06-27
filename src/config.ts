import { config } from "dotenv";
config();

export const CLIENT_ID = process.env.CLIENT_ID as string;
export const CLIENT_SECRET = process.env.CLIENT_SECRET as string;
export const REDIRECT_URI = process.env.REDIRECT_URI as string;
export const REFRESH_TOKEN = process.env.REFRESH_TOKEN as string;
export const PORT = process.env.PORT;
export const OPENAI_SECRET_KEY = process.env.OPENAI_SECRET_KEY;