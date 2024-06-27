import { Router } from "express";
import {
  fetchAllEmails,
  generateAuthUrl,
  handleGoogleCallback,
} from "../controller/gmailController";

const router = Router();

router.get("/auth/google", async (req, res) => {
  try {
    const authUrl = await generateAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    res.status(500);
  }
});

router.get("/auth/google/callback", async (req, res) => {
  try {
    const result = await handleGoogleCallback({ code: req.query });
    res.send(result);
  } catch (error) {}
});

router.get("/fetch/:email", async (req, res) => {
  try {
    const result = await fetchAllEmails({ email: req.params.email });
    res.send(result);
  } catch (error) {}
});

export default router;
