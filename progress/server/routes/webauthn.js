const express = require('express');
const router = express.Router();
const crypto = require("node:crypto");
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
  } = require('@simplewebauthn/server');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const coseToPem = require('../utils/coseToPem');

if (!globalThis.crypto) {
    globalThis.crypto = crypto;
} 

function toBase64Url(buffer) {
    return buffer.toString('base64')   // Convert to base64
      .replace(/\+/g, '-')             // Replace '+' with '-'
      .replace(/\//g, '_')             // Replace '/' with '_'
      .replace(/=+$/, '');             // Remove trailing '='
  }
  

// 1️⃣ Begin registration
router.post('/generate-registration-options', async (req, res) => {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
  
    try {
      const options = await generateRegistrationOptions({
        rpName: 'Concert Booking App',
        rpID: 'localhost',
        userID: Buffer.from(user._id, 'utf8'),
        userName: user.email,
        userDisplayName: user.name,
        timeout: 60000,
        attestationType: 'indirect',
        authenticatorSelection: {
          residentKey: 'discouraged',
          userVerification: 'preferred',
        },
      });
      
      req.session.currentChallenge = options.challenge;
      res.json(options);
    } catch (error) {
      console.error('Error generating registration options:', error);
      res.status(500).json({ error: 'Failed to generate WebAuthn options' });
    }
  });  
  

// 2️⃣ Verify response and store ticket
router.post('/verify-registration', async (req, res) => {
  const { authenticationResult } = req.body;
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const verification = await verifyRegistrationResponse({
      response: authenticationResult,
      expectedChallenge: req.session.currentChallenge,
      expectedOrigin: 'http://localhost:3000',
      expectedRPID: 'localhost',
    });

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
        const { credential } = registrationInfo;

      // Convert to PEM format
        const publicKeyBuffer = Buffer.from(credential.publicKey);
        const publicKeyPem = await coseToPem(publicKeyBuffer);


        await User.findByIdAndUpdate(user._id, {
          $set: {
            webauthn: {
              publicKey: publicKeyPem,
              credentialId: toBase64Url(Buffer.from(credential.id)),
            },
          },
        });
        
      return res.status(201).json({ success: true, message: 'Ticket booked!' });
    }

    res.status(400).json({ success: false, message: 'WebAuthn verification failed' });
  } catch (error) {
    console.error("WebAuthn error:", error);
    res.status(500).json({ success: false, message: 'Server error during WebAuthn' });
  }
});

// Generate authentication options
router.post('/generate-authentication-options', async (req, res) => {
    const user = req.session.user;
    const { eventId } = req.body;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
  
    const ticket = await Ticket.findOne({ userId: user._id, eventId });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  
    const options = generateAuthenticationOptions({
      allowCredentials: [
        {
          id: Buffer.from(ticket.credentialId, 'base64'),
          type: 'public-key',
        },
      ],
      timeout: 60000,
      userVerification: 'preferred',
    });
  
    req.session.currentChallenge = options.challenge;
    res.json(options);
});
  
// Verify authentication response
router.post('/verify-authentication', async (req, res) => {
    const { eventId, authenticationResponse } = req.body;
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
  
    try {
      const ticket = await Ticket.findOne({ userId: user._id, eventId });
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  
      const verification = await verifyAuthenticationResponse({
        response: authenticationResponse,
        expectedChallenge: req.session.currentChallenge,
        expectedOrigin: 'http://localhost:3000',
        expectedRPID: 'localhost',
        authenticator: {
          credentialPublicKey: ticket.publicKey,
          credentialID: Buffer.from(ticket.credentialId, 'base64'),
          counter: 0,
        },
      });
  
      if (verification.verified) {
        return res.status(200).json({ success: true, message: 'Authentication successful!' });
      }
  
      res.status(400).json({ success: false, message: 'WebAuthn authentication failed' });
    } catch (error) {
      console.error('WebAuthn error:', error);
      res.status(500).json({ success: false, message: 'Server error during WebAuthn authentication' });
    }
});

module.exports = router;
