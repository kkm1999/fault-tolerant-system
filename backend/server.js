const express = require("express");
const cors = require("cors");

const generateFingerprint = require("./services/fingerprint");
const normalizeEvent = require("./services/normalizer");
const prisma = require("./lib/prisma");

const app = express();

app.use(cors());
app.use(express.json());

// ==================================================
// HEALTH CHECK
// ==================================================

app.get("/", (req, res) => {
  res.json({
    message: "Fault-Tolerant Data Processing API is running",
  });
});

// ==================================================
// POST /api/events
// Process a raw event
// ==================================================

app.post("/api/events", async (req, res) => {
  try {
    const rawEvent = req.body;

    console.log("Raw event:", rawEvent);

    // ------------------------------
    // Basic validation
    // ------------------------------

    if (!rawEvent || typeof rawEvent !== "object") {
      return res.status(400).json({
        success: false,
        message: "Invalid event data",
      });
    }

    if (!rawEvent.source) {
      return res.status(400).json({
        success: false,
        message: "Event source is required",
      });
    }

    if (!rawEvent.payload) {
      return res.status(400).json({
        success: false,
        message: "Event payload is required",
      });
    }

    // ------------------------------
    // Normalize event
    // ------------------------------

    const normalizedEvent = normalizeEvent(rawEvent);

    console.log("Normalized event:", normalizedEvent);

    // ------------------------------
    // Generate fingerprint
    // ------------------------------

    const fingerprint = generateFingerprint(normalizedEvent);

    console.log("Fingerprint:", fingerprint);

    // ------------------------------
    // Simulated database failure
    // ------------------------------

    if (rawEvent.simulateFailure === true) {
      console.log("Simulated database failure");

      await prisma.failedEvent.create({
        data: {
          clientId: rawEvent.source || null,
          reason: "Simulated database failure",
          rawPayload: JSON.stringify(rawEvent),
        },
      });

      return res.status(500).json({
        success: false,
        simulatedFailure: true,
        message: "Simulated database failure",
      });
    }

    // ------------------------------
    // Duplicate detection
    // ------------------------------

    const existingEvent = await prisma.event.findUnique({
      where: {
        fingerprint: fingerprint,
      },
    });

    if (existingEvent) {
      console.log("Duplicate event ignored");

      return res.status(200).json({
        success: true,
        duplicate: true,
        message: "Duplicate event ignored",
        data: existingEvent,
      });
    }

    // ------------------------------
    // Save event
    // ------------------------------

    const savedEvent = await prisma.event.create({
      data: {
        clientId: normalizedEvent.client_id,
        metric: normalizedEvent.metric,
        amount: normalizedEvent.amount,
        timestamp: normalizedEvent.timestamp
          ? new Date(normalizedEvent.timestamp)
          : null,
        fingerprint: fingerprint,
        rawPayload: JSON.stringify(rawEvent),
        status: "processed",
      },
    });

    console.log("Event saved:", savedEvent.id);

    return res.status(201).json({
      success: true,
      duplicate: false,
      message: "Event processed successfully",
      data: savedEvent,
    });
  } catch (error) {
    console.error("Event processing failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process event",
      error: error.message,
    });
  }
});

// ==================================================
// GET /api/events
// Get processed + failed events
// ==================================================

app.get("/api/events", async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    const failedEvents = await prisma.failedEvent.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      events,
      failedEvents,
    });
  } catch (error) {
    console.error("Events fetch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch events",
      error: error.message,
    });
  }
});

// ==================================================
// GET /api/analytics
// Analytics with client + date filters
// ==================================================

app.get("/api/analytics", async (req, res) => {
  try {
    const { client, from, to } = req.query;

    console.log("Analytics filters:", {
      client,
      from,
      to,
    });

    // ------------------------------
    // Build database filter
    // ------------------------------

    const where = {
      status: "processed",
    };

    // Client filter
    if (client) {
      where.clientId = String(client);
    }

    // Date filter
    //
    // From:
    // Include from 00:00:00
    //
    // To:
    // Include the entire selected date
    // by using the beginning of the next day
    // as an exclusive upper boundary.

    if (from || to) {
      where.timestamp = {};

      if (from) {
        where.timestamp.gte = new Date(
          `${from}T00:00:00.000Z`
        );
      }

      if (to) {
        const nextDay = new Date(
          `${to}T00:00:00.000Z`
        );

        nextDay.setUTCDate(
          nextDay.getUTCDate() + 1
        );

        where.timestamp.lt = nextDay;
      }
    }

    // ------------------------------
    // Fetch matching events
    // ------------------------------

    const events = await prisma.event.findMany({
      where: where,
      orderBy: {
        createdAt: "desc",
      },
    });

    // ------------------------------
    // Total events
    // ------------------------------

    const totalEvents = events.length;

    // ------------------------------
    // Total amount
    // ------------------------------

    const totalAmount = events.reduce(
      (sum, event) => {
        return sum + (event.amount || 0);
      },
      0
    );

    // ------------------------------
    // Group by client
    // ------------------------------

    const byClient = {};

    events.forEach((event) => {
      const clientName = event.clientId || "Unknown";

      if (!byClient[clientName]) {
        byClient[clientName] = {
          client: clientName,
          count: 0,
          totalAmount: 0,
        };
      }

      byClient[clientName].count += 1;

      byClient[clientName].totalAmount +=
        event.amount || 0;
    });

    // ------------------------------
    // Response
    // ------------------------------

    return res.json({
      success: true,

      filters: {
        client: client || "",
        from: from || "",
        to: to || "",
      },

      totalEvents,

      totalAmount,

      byClient: Object.values(byClient),
    });
  } catch (error) {
    console.error("Analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
      error: error.message,
    });
  }
});

// ==================================================
// START SERVER
// ==================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});