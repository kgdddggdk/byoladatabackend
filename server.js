require("dotenv").config();
const express = require("express");
const cors = require("cors");
const vtpass = require("./vtpassClient");
const wallet = require("./walletStore");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.json({ ok: true, service: "B Yola Data backend", env: process.env.VTPASS_ENV });
});

app.get("/api/plans/:serviceID", async (req, res) => {
  try {
    const data = await vtpass.getVariations(req.params.serviceID);
    res.json(data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Could not fetch plans from VTpass" });
  }
});

app.get("/api/vtpass-balance", async (req, res) => {
  try {
    const data = await vtpass.getWalletBalance();
    res.json(data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Could not fetch VTpass balance" });
  }
});

app.get("/api/wallet/:customerId", (req, res) => {
  res.json({ balance: wallet.getBalance(req.params.customerId) });
});

app.get("/api/transactions/:customerId", (req, res) => {
  res.json({ transactions: wallet.listTransactions(req.params.customerId) });
});

app.post("/api/wallet/fund/initiate", (req, res) => {
  const { customerId, amount, reference } = req.body;
  if (!customerId || !amount || !reference) {
    return res.status(400).json({ error: "customerId, amount and reference are required" });
  }
  wallet.createFundingRequest(reference, customerId, amount);
  res.json({ status: "PENDING", reference });
});

app.post("/api/webhooks/opay", async (req, res) => {
  try {
    const { reference, amount, status } = req.body;

    const fundingReq = wallet.getFundingRequest(reference);
    if (!fundingReq) {
      console.warn("Webhook for unknown reference:", reference);
      return res.status(404).json({ error: "Unknown reference" });
    }

    if (fundingReq.status !== "PENDING") {
      return res.json({ ok: true, note: "Already processed" });
    }

    if (status === "SUCCESS" && Number(amount) === Number(fundingReq.amount)) {
      wallet.markFundingStatus(reference, "SUCCESS");
      wallet.credit(fundingReq.customerId, fundingReq.amount);
      wallet.logTransaction({
        customerId: fundingReq.customerId,
        type: "Wallet funding",
        detail: "OPay transfer verified",
        amount: fundingReq.amount,
        ref: reference,
        status: "SUCCESS",
      });
    } else {
      wallet.markFundingStatus(reference, "FAILED");
      wallet.logTransaction({
        customerId: fundingReq.customerId,
        type: "Wallet funding",
        detail: "OPay transfer failed or amount mismatch",
        amount: fundingReq.amount,
        ref: reference,
        status: "FAILED",
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

app.post("/api/buy", async (req, res) => {
  const { customerId, type, amount, serviceID } = req.body;
  if (!customerId || !type || !amount || !serviceID) {
    return res.status(400).json({ error: "customerId, type, amount and serviceID are required" });
  }

  const balanceBefore = wallet.getBalance(customerId);
  if (balanceBefore < amount) {
    return res.status(400).json({ error: "Insufficient wallet balance" });
  }

  wallet.debit(customerId, amount);

  try {
    const result = await vtpass.purchase(req.body);

    const success = result.code === "000";
    wallet.logTransaction({
      customerId,
      type,
      detail: result.response_description || serviceID,
      amount,
      ref: result.requestId || vtpass.generateRequestId(),
      status: success ? "SUCCESS" : "FAILED",
    });

    if (!success) {
      wallet.credit(customerId, amount);
    }

    res.json(result);
  } catch (err) {
    console.error(err.response?.data || err.message);
    wallet.credit(customerId, amount);
    wallet.logTransaction({
      customerId,
      type,
      detail: "VTpass request failed",
      amount,
      ref: vtpass.generateRequestId(),
      status: "FAILED",
    });
    res.status(500).json({ error: "Purchase failed, wallet refunded" });
  }
});

app.listen(PORT, () => {
  console.log(`B Yola Data backend running on port ${PORT} (VTpass env: ${process.env.VTPASS_ENV})`);
});
