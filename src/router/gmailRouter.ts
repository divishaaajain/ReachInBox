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
    res.status(500).send(error);
  }
});

router.get("/auth/google/callback", async (req, res) => {
  try {
    const result = await handleGoogleCallback({ code: req.query });
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/fetch/:email", async (req, res) => {
  try {
    const result = await fetchAllEmails({ email: req.params.email });
    res.status(200).send(result);
  } catch (error) {
    res.status(500).send(error);
  }
});

export default router;
