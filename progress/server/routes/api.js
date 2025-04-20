const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const { ethers } = require("ethers");

router.post("/events", async (req, res) => {
  const user = req.session.user;

  if (!user || !user._id) {
    return res
      .status(401)
      .json({ message: "Unauthorized: No user in session" });
  }

  if (user.role !== "organizer") {
    return res
      .status(403)
      .json({ message: "Only organizers can create events" });
  }

  try {
    const newEvent = new Event({
      ...req.body,
      organizerId: user._id, // ✅ Use organizer from session
    });

    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err) {
    console.error("Error creating event:", err.message);
    res.status(400).json({ message: err.message });
  }
});

// GET /api/events
router.get("/events", async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 }); // optional sort by latest
    res.status(200).json({ events });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching events" });
  }
});

// GET /api/events/_id
router.get("/events/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all tickets for the logged-in user
router.get("/tickets", async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  try {
    const tickets = await Ticket.find({ userId: user._id }).populate("eventId");
    res.json(tickets);
  } catch (err) {
    console.error(
      "Error fetching tickets:",
      data.message || data.error || "Unknown error"
    );
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/tickets/:eventId
router.get("/tickets/:eventId", async (req, res) => {
  const user = req.session.user;
  const { eventId } = req.params;

  if (!user) return res.status(401).json({ message: "Not authenticated" });

  try {
    const ticket = await Ticket.findOne({ userId: user._id, eventId });
    if (ticket) {
      return res.status(200).json({ booked: true });
    } else {
      return res.status(200).json({ booked: false });
    }
  } catch (err) {
    console.error("Error checking ticket:", err);
    res.status(500).json({ message: "Server error checking ticket" });
  }
});

// POST /api/tickets/book
router.post("/tickets/book", async (req, res) => {
  const user = req.session.user;
  const { eventId } = req.body;

  if (!user) return res.status(401).json({ error: "Not authenticated" });

  try {
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });

    if (event.capacity <= 0) {
      return res.status(400).json({ error: "Event is fully booked" });
    }

    // Check if the user already has a ticket for this event
    const existingTicket = await Ticket.findOne({ userId: user._id, eventId });
    if (existingTicket) {
      return res
        .status(409)
        .json({ error: "You have already booked this event" });
    }

    // Check if WebAuthn credential exists
    const userInDb = await User.findById(user._id);
    if (
      !userInDb.webauthn ||
      !userInDb.webauthn.credentialId ||
      !userInDb.webauthn.publicKey
    ) {
      return res
        .status(400)
        .json({ error: "User does not have WebAuthn credentials" });
    }

    // Create ticket
    const newTicket = new Ticket({
      eventId,
      userId: user._id,
      credentialId: userInDb.webauthn.credentialId,
      publicKey: userInDb.webauthn.publicKey,
    });
    //const tx = await contract.mintTicket(userWalletAddress, eventId, ticketId);
    //await tx.wait();

    await newTicket.save();

    // Decrease capacity
    event.capacity -= 1;
    await event.save();

    res
      .status(201)
      .json({ success: true, message: "Ticket booked successfully!" });
  } catch (err) {
    console.error("Ticket booking error:", err);
    res.status(500).json({ error: "Server error while booking ticket" });
  }
});

router.get("/organizer/:organizerId", async (req, res) => {
  try {
    const { organizerId } = req.params;
    const events = await Event.find({ organizerId });
    res.json(events);
  } catch (error) {
    console.error("Error fetching events by organizer:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
