const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  purchaseDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['Valid', 'Used', 'Cancelled'], default: 'Valid' },
  credentialId: { type: String, required: true }, // WebAuthn credential ID if needed
  publicKey: { type: String, required: true }     // WebAuthn public key for verification
});

module.exports = mongoose.model('Ticket', ticketSchema);